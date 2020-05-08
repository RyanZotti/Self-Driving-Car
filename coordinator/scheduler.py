from aiohttp import ClientSession, ClientTimeout
import concurrent
import datetime
import traceback

from coordinator.utilities import *


class Scheduler(object):

    """
    This class is used to call the health API of each of the Pi services. I
    grouped all services under this same class to reduce some load on the
    Postgres database, so that each health check doesn't have to maintain
    its own copy of the service host (the Pi or localhost during test),
    since this value can change over time

    The service host variable is either the Pi or localhost depending on
    what the user has selected the local testing toggle on the Pi page.
    Since I only know what this setting is if I ping the database, I want
    to avoid hammering the database every X seconds for every service.
    It's better to share the cached setting under a single class, and
    that's why I created this class

    Takes care of running functions at set intervals, since this isn't
    easy to do (or even possible?) in Tornado.

    For example, I can also use this class to keep global Tornado variables
    updated, since it's easy to set global Tornado variables with an http
    call

    I also use this to make period checks to service health checks on the
    Pi. Each service health check also requires tracking whether I'm
    running my service on the Pi or on my laptop as a localhost, and due
    to the generic nature of this class, I can schedule a refresh of the
    shared service host variable too

    You only need to put function in this class if it could benefit from
    the shared variables, like service host, postgres host, etc
    """

    def __init__(self, postgres_host, session_id, interval_seconds=1.0):

        # This should never change after startup
        self.postgres_host = postgres_host
        self.interval_seconds = interval_seconds
        self.timeout_seconds = 1.0

        """
        I created the jobs table to track the status of SFTP jobs during
        the "import data" process. Each time the editor.py script runs I
        generate a new UUID that serves as the session_id. Any rows in the
        job table that do not match this value are from past runs and be
        ignored, which is why this function deletes them
        """
        self.session_id = session_id

        self.aiopg_pool = None

        """
        These are the fields that will get updated by the scheduler that
        might also be useful to other scheduled tasks. However, I update
        them with async/await, and Python doesn't let you make __init__
        an async function, so I have to use defaults until the first
        update
        """

        self.service_host = None # localhost or Pi's hostname
        self.service_os = None  # used to define Docker network commands
        self.is_local_test = None
        self.use_pi = None  # opposite of self.is_local_test
        self.pi_hostname = None
        self.pi_username = None
        self.pi_password = None

        # These two variables are used to track if the video cache should be on or not
        self.raw_dash_frame = None
        self.is_video_cache_loop_running = False

    async def refresh_service_host(self):
        """
        Updates the cache of the host, whether it's localhost because
        you're running a test or the hostname of the Pi if you're not
        running a test
        """
        while True:
            if self.is_local_test:
                self.service_host = 'localhost'
            else:
                self.service_host = self.pi_hostname
            await asyncio.sleep(self.interval_seconds)

    async def refresh_pi_credentials(self):
        results = await asyncio.gather(
            read_pi_setting_aio(host=self.postgres_host, field_name='hostname', aiopg_pool=self.aiopg_pool),
            read_pi_setting_aio(host=self.postgres_host, field_name='username', aiopg_pool=self.aiopg_pool),
            read_pi_setting_aio(host=self.postgres_host, field_name='password', aiopg_pool=self.aiopg_pool)
        )
        self.pi_hostname = results[0]
        self.pi_username = results[1]
        self.pi_password = results[2]

    async def refresh_pi_credentials_loop(self):
        interval_seconds = 3.0
        while True:
            await self.refresh_pi_credentials()
            await asyncio.sleep(interval_seconds)

    async def call_model_api(self, is_verbose=False):
        """
        Calls the remote model (remote from the car/Pi's point of
        view). This function is ultimately used to end predictions
        to the car from the laptop. I created this because even a
        tiny model was too slow and resource intensive to run on
        the Pi
        """
        try:
            img = cv2.imencode('.jpg', self.raw_dash_frame)[1].tostring()
            port = 8886  # TODO: Don't hardcode this
            host = 'localhost'
            endpoint = f'http://{host}:{port}/predict'
            files = {'image': img}
            timeout = ClientTimeout(total=self.timeout_seconds)
            async with ClientSession(timeout=timeout) as session:
                async with session.post(endpoint, data=files) as response:
                    output_json = await response.json()
                    return output_json['prediction']
        except:
            if is_verbose:
                traceback.print_exc()

    async def call_user_input_remote_model_api(self, model_angle):
        """
        Populates the remote_model field of the user_input API

        Parameters
        ----------
        json_input : dict
            Dictionary of the data to pass the API
        """
        timeout = ClientTimeout(total=self.timeout_seconds)
        port = 8884  # TODO: Don't hardcode this
        host = self.service_host
        endpoint = f'http://{host}:{port}/track-remote-model'
        json_input = {'remote_model/angle': model_angle}
        try:
            async with ClientSession(timeout=timeout) as session:
                async with session.post(endpoint, json=json_input) as response:
                    _ = await response.json()
        except:
            """
            Ignore exceptions because we never know when the service will
            be unavailable and many times it's ok for it to be unavailable
            """
            pass

    async def loop_remote_model(self):
        """
        This should run in a loop without waiting because I don't want
        any latency between model calls
        """
        while True:
            if self.raw_dash_frame is not None:
                model_angle = await self.call_model_api()
                if model_angle is not None:
                    await self.call_user_input_remote_model_api(model_angle=model_angle)

            """
            From trial an error I learned that if you don't include some sort
            of sleep, even very short, then this function will block when the
            image is None. I think this occurs because the asyncio event loop
            requires an `await` to know when it can shift its attention, but
            if you keep skipping the part that runs `await`, then you'll just
            end up running regular blocking python code
            """
            await asyncio.sleep(0.001)

    async def manage_service(self, service):
        """
        I want to resume services that are failed but that should be on
        and stop services that are on that should be off
        """

        while True:
            use_pi = not self.is_local_test

            # Start but only if it should start and has not been told to start by something else
            await start_service_if_ready(
                postgres_host=self.postgres_host,
                run_on_pi=use_pi,
                service_host=self.service_host,
                service=service,
                pi_username=self.pi_username,
                pi_hostname=self.pi_hostname,
                pi_password=self.pi_password,
                aiopg_pool=self.aiopg_pool,
                session_id=self.session_id
            )

            # Stop but only if it should stop and has not been told to stop by something else
            await stop_service_if_ready(
                postgres_host=self.postgres_host,
                service_host=self.service_host,
                stop_on_pi=use_pi,
                service=service,
                pi_username=self.pi_username,
                pi_hostname=self.pi_hostname,
                pi_password=self.pi_password,
                aiopg_pool=self.aiopg_pool,
            )

            await asyncio.sleep(self.interval_seconds)

    async def manage_video_cache_loop(self):
        """
        Basically this runs in a loop to constantly check if the video
        caching loop needs to be restarted
        """
        while True:
            video_status = await get_service_status(
                postgres_host=self.postgres_host,
                service_host=self.service_host,
                service='video',
                aiopg_pool=self.aiopg_pool
            )
            if video_status == 'healthy':
                if self.is_video_cache_loop_running is False:
                    self.is_video_cache_loop_running = True
                    await asyncio.create_task(self.start_live_video_stream_aio())
            else:
                if self.is_video_cache_loop_running is True:
                    self.is_video_cache_loop_running = False
            await asyncio.sleep(self.interval_seconds * 5)

    async def start_live_video_stream_aio(self):
        video_port = self.get_services()['video']['port']
        with concurrent.futures.ThreadPoolExecutor() as pool:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                pool, partial(self.get_video, self.service_host, port=video_port)
            )

    async def user_input_part_loop(self):
        """
        Previously this ran in the UI, but I moved this to the scheduler
        so that I wouldn't have issues if I ran multiple UIs simultaneously.
        Basically this takes all of the inputs on the screen, like whether
        to use the model's angle vs the PS3 (user) angle, what the constant
        throttle should be, etc
        """
        while True:

            # Check the toggle on the Raspberry Pi dashboard page
            model_toggle = await read_toggle_aio(
                postgres_host=None,
                web_page='raspberry pi',
                name='dashboard',
                detail='model',
                aiopg_pool=self.aiopg_pool
            )

            # Check the radio button on the machine learning page
            is_remote_model = await read_toggle_aio(
                postgres_host=None,
                web_page='machine learning',
                name='driver-device-type',
                detail='laptop',
                aiopg_pool=self.aiopg_pool
            )

            # Check the radio button on the machine learning page
            is_local_model = await read_toggle_aio(
                postgres_host=None,
                web_page='machine learning',
                name='driver-device-type',
                detail='pi',
                aiopg_pool=self.aiopg_pool
            )

            driver_type = 'user'
            if model_toggle is True:
                if is_remote_model is True:
                    driver_type = 'remote_model'
                elif is_local_model is True:
                    driver_type = 'local_model'
                else:
                    driver_type = 'user'

            engine_toggle = await read_toggle_aio(
                postgres_host=None,
                web_page='raspberry pi',
                name='dashboard',
                detail='engine',
                aiopg_pool=self.aiopg_pool
            )
            constant_throttle_db = await read_slider_aio(
                web_page='raspberry pi',
                name='model constant speed',
                aiopg_pool=self.aiopg_pool
            )

            """
            The UI and DB saves throttle as an integer, but the engine
            expects it as a float between 0.0 and 1.0, so I have to
            convert accordingly
            """
            constant_throttle = constant_throttle_db / 100.0

            timeout = ClientTimeout(total=self.timeout_seconds)
            port = 8884  # TODO: Don't hardcode this
            host = self.service_host
            endpoint = f'http://{host}:{port}/track-human-requests'
            json_input = {
                'dashboard/driver_type':driver_type,
                'dashboard/brake': not engine_toggle,
                'dashboard/model_constant_throttle': constant_throttle
            }
            try:
                async with ClientSession(timeout=timeout) as session:
                    async with session.post(endpoint, json=json_input) as response:
                        output_json = await response.json()
            except:
                """
                Ignore exceptions because we never know when the service will
                be unavailable and many times it's ok for it to be unavailable
                """
                pass

            await asyncio.sleep(self.interval_seconds * 5)

    # This is used to stream video live for the self-driving sessions
    # The syntax is super ugly and I don't understand how it works
    # This is where I got this code from here, which comes with an explanation:
    # https://stackoverflow.com/questions/21702477/how-to-parse-mjpeg-http-stream-from-ip-camera
    def get_video(self, ip, port):
        stream = urllib.request.urlopen('http://{ip}:{port}/video'.format(ip=ip, port=port))
        opencv_bytes = bytes()
        """
        When the video is streaming well, about 1 of every 15
        iterations of this loop produces an image. When the
        video is killed and there is nothing to show, the else
        part of the loop gets called consecutively indefinitely.
        I can avoid the zombie threads that take over my entire
        Tornado server (99% of CPU) if I check a consecutive
        failure count exceeding some arbitrarily high threshold
        """
        count_threshold = 50
        consecutive_no_image_count = 0
        was_available = False
        while self.is_video_cache_loop_running:
            opencv_bytes += stream.read(1024)
            a = opencv_bytes.find(b'\xff\xd8')
            b = opencv_bytes.find(b'\xff\xd9')
            if a != -1 and b != -1:
                jpg = opencv_bytes[a:b + 2]
                opencv_bytes = opencv_bytes[b + 2:]
                frame = cv2.imdecode(np.fromstring(jpg, dtype=np.uint8), cv2.IMREAD_COLOR)
                if cv2.waitKey(1) == 27:
                    exit(0)
                consecutive_no_image_count = 0
                was_available = True
                self.raw_dash_frame = frame
            else:
                if was_available:
                    consecutive_no_image_count = 1
                else:
                    consecutive_no_image_count += 1
                if consecutive_no_image_count > count_threshold:
                    self.is_video_cache_loop_running = False
                was_available = False
        stream.close()

    async def start(self):
        """
        This is the main entry point to the scheduler
        """
        postgres_host = self.postgres_host
        connection_string = f"host='{postgres_host}' dbname='autonomous_vehicle' user='postgres' password='' port=5432"

        self.aiopg_pool = await aiopg.create_pool(connection_string, minsize=10, maxsize=10)

        self.is_local_test = await read_toggle_aio(
            postgres_host=self.postgres_host,
            web_page='raspberry pi',
            name='test locally',
            detail='test locally',
            aiopg_pool=self.aiopg_pool
        )

        """
        Delete the contents of the service startup table so that I
        can tell if a service is legitimately unhealthy vs not yet
        started up. If I ever decide not to do this then I'll need
        to recheck all of the code in `get_service_status` for
        bugs that could be introduced
        """
        print('Clearing service_event table')
        await execute_sql_aio(host=self.postgres_host, sql='DELETE FROM service_event',aiopg_pool=self.aiopg_pool)

        """
        Clear out old health checks not because it will change
        behavior but because this will save a lot of disk space in
        the long run
        """
        print('Clearing service_health table')
        await execute_sql_aio(host=self.postgres_host, sql='DELETE FROM service_health',aiopg_pool=self.aiopg_pool)

        # Class fields are assigned values within the method
        await self.refresh_pi_credentials()

        # Checks for either localhost or the Pi's host at regular intervals
        asyncio.create_task(self.refresh_service_host())

        # Refresh the Pi's credentials
        asyncio.create_task(self.refresh_pi_credentials_loop())

        # Set up the video cache loop checker
        asyncio.create_task(self.manage_video_cache_loop())

        # Send UI states saved in the DB to the Pi's control loop via the user_input part server
        asyncio.create_task(self.user_input_part_loop())

        # Send remote model angles to the user_input part
        asyncio.create_task(self.loop_remote_model())

        services = self.get_services()
        manage_service_tasks = []
        for service_name, config in services.items():
            service_port = config['port']
            """
            The async/await pattern works the same as in javascript, where
            an awaited function won't start until previous awaited functions
            have completed. However, this pattern goes away and functions
            are run in parallel if you use tasks, like I do here. I use tasks
            because I don't want a health check to one service to delay the
            health checks of other services. I believe you still need the
            await keyword for each task or the code won't get triggered
            """
            asyncio.create_task(
                self.check_service_health(
                    service=service_name,
                    port=service_port,
                    interval_seconds=self.interval_seconds
                )
            )

            """
            Ensures that services that should be on are on and those that
            should be off are off
            """
            print(f'Start service manager for {service_name}')
            task = asyncio.create_task(self.manage_service(service=service_name))
            manage_service_tasks.append(task)
        await asyncio.gather(*manage_service_tasks)

    def get_services(self):
        # TODO: Eventually get these from a DB
        services = {
            'record-tracker': {'port': 8093},
            'video': {'port': 8091},
            'control-loop': {'port': 8887},
            'user-input': {'port': 8884},
            'engine': {'port': 8092},
            'ps3-controller': {'port': 8094},
            'memory': {'port': 8095},
            'angle-model-pi': {'port': 8885},  # Used for driving the car
            'angle-model-laptop': {'port': 8886}  # Used for data set reviewer
        }
        return services

    async def check_service_health(self, service, port, interval_seconds=1.0):
        """
        Runs every `interval_seconds` to check the service health and records
        the health in a table. It's important that I always check for the
        health of the service even if I don't expect the service code to be
        on because some of th get_status code in other functions depends on
        this assumption
        """
        host = self.service_host

        """
        The review model on the laptop will always be 'localhost' even if
        you're running everything else on the Pi
        """
        if service == 'angle-model-laptop':
            host = 'localhost'

        endpoint = f'http://{host}:{port}/health'
        while True:
            sql_query = '''
                BEGIN;
                INSERT INTO service_health (
                    start_time,
                    end_time,
                    service,
                    host,
                    is_healthy
                )
                VALUES (
                    '{start_time}',
                    '{end_time}',
                    '{service}',
                    '{host}',
                    '{is_healthy}'
                );
                COMMIT;
            '''
            while True:
                start_time = datetime.utcnow()
                try:
                    timeout = ClientTimeout(total=self.timeout_seconds)
                    async with ClientSession(timeout=timeout) as session:
                        async with session.get(endpoint) as response:
                            health = await response.json()
                            is_healthy = health['is_healthy']
                            end_time = datetime.utcnow()
                            sql = sql_query.format(
                                start_time=start_time,
                                end_time=end_time,
                                service=service,
                                host=host,
                                is_healthy=is_healthy
                            )
                            await execute_sql_aio(
                                host=self.postgres_host,
                                sql=sql,
                                aiopg_pool=self.aiopg_pool
                            )
                except:
                    end_time = datetime.utcnow()
                    sql = sql_query.format(
                        start_time=start_time,
                        end_time=end_time,
                        service=service,
                        host=self.service_host,
                        is_healthy=False
                    )
                    await execute_sql_aio(
                        host=self.postgres_host,
                        sql=sql,
                        aiopg_pool=self.aiopg_pool
                    )
                await asyncio.sleep(interval_seconds)
