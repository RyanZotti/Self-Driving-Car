async function pairController(){

    /*
    This command facilitates the pairing workflow. It walks
    through a series of steps to connect the PS3 controller
    to the Pi via bluetooth and updates the UI with its
    progress each step of the way
    */

    /*
      This is used to ensure that the pairing process isn't
      run more than once simultaneously
    */
    isWizardOn = true;

    // TODO: Remove hardcoded port
    const port = 8094;
    const host = serviceHost;
    const apiInputJson = {
        'host':host,
        'port':port
    }

    const timelineWrapper = document.querySelector('#controller-timeline-wrapper');
    const cableConnectedSection = document.querySelector('#controller-timeline-cable-connected');
    const disconnectAndConnectSection = document.querySelector('#controller-timeline-disconnect-and-connect');
    const cableDisconnectedSection = document.querySelector('#controller-timeline-cable-disconnected');
    const connectBluetoothSection = document.querySelector('#controller-timeline-connect-bluetooth');
    const finalizeServiceSection = document.querySelector('#controller-timeline-finalize-service-connection');

    const cableConnectedStatusText = cableConnectedSection.querySelector('div.timeline-date');
    const disconnectAndConnectStatusText = disconnectAndConnectSection.querySelector('div.timeline-date');
    const cableDisconnectedStatusText = cableDisconnectedSection.querySelector('div.timeline-date');
    const connectBluetoothStatusText = connectBluetoothSection.querySelector('div.timeline-date');
    const finalizeServiceStatusText = finalizeServiceSection.querySelector('div.timeline-date');

    cableConnectedSection.style.display = 'block';
    disconnectAndConnectSection.style.display = 'none';
    cableDisconnectedSection.style.display = 'none';
    connectBluetoothSection.style.display = 'none';
    finalizeServiceSection.style.display = 'none';

    /*
    The instructions I've read online assume you're only using one
    PS3 device. It assumes that when you type the "devices" command
    you'll know which MAC address to copy because you'll only see
    one PS3 controller. If you have multiple registered PS3
    controllers, then you will have no way to tell which is which.
    The physical PS3 does not have any label about its MAC address
    so you couldn't figure it out even if you wanted to. So, what
    should you do if you need multiple controllers, for example if
    you're at a live event, and the battery of your first controller
    dies and you need the second? Assume that you will need to go
    through the registration process all over again with the second
    controller, which means wiping all registered controllers from
    the list of registered devices.
    */

    // This wipes the registered devices
    console.log('Wiping registered devices...')
    var isInitializedComplete = false;
    while (isInitializedComplete != true){
        console.log(isInitializedComplete)
        isInitializedComplete = await unregisterPs3Controllers(
            apiInputJson
        );
        await sleep(250);
    }
    console.log('Registered devices have been wiped.')

    console.log('Making sure wired is connected before sudo sixpair...')
    /*
    Make sure the user has connected the controller to
    the Pi via the cable before starting the setup
    commands
    */
    var isConnected = await isControllerConnected();
    while(isConnected == false){
        isConnected = await isControllerConnected();
        await sleep(250);
    }
    console.log('Wired is connected.')
    console.log('Running sudo sixpair...')
    var isSudoSixPairComplete = false;
    while(isSudoSixPairComplete != true){
        isSudoSixPairComplete = await runSudoSixPair(
            apiInputJson
        );
        await sleep(2000);
    }
    console.log('Sudo sixpair complete.')

    cableConnectedStatusText.textContent = 'Complete!'
    disconnectAndConnectStatusText.textContent = 'Pending...'
    cableConnectedSection.classList.add('complete');
    disconnectAndConnectSection.style.display = 'block';

    /*
    At this point the sudo sixpair command should have
    run, which means that the device will appear to be
    disconnected, even if it is still connected. To make
    it look connected the user must disconnect and
    reconnect
    */
    console.log('Checking for reconnection...')
    var isConnected = await isControllerConnected();
    while(isConnected == false){
        isConnected = await isControllerConnected();
        await sleep(250);
    }
    console.log('Device reconnected.')

    /*
    Run bluetoothctl commands like turning on the agent,
    and trusting the MAC address
    */
    console.log('Registering device...')
    var setupCommandsComplete = false;
    while(setupCommandsComplete != true){
        setupCommandsComplete = await runPS3SetupCommands(
            apiInputJson
        )
        await sleep(3000);
    }
    console.log('Device registered')

    disconnectAndConnectStatusText.textContent = 'Complete!'
    cableDisconnectedStatusText.textContent = 'Pending...'
    disconnectAndConnectSection.classList.add('complete');
    cableDisconnectedSection.style.display = 'block';

    console.log('Checking that cable is disconnected before bluetooth test...')
    /*
    Make sure the user unplugs the cable so that the
    next test is valid. If the cable is still plugged
    in when the user tests commands, it will look like
    the bluetooth connectivity is working even if it
    isn't
    */
    var isConnected = await isControllerConnected();
    while(isConnected != false){
        isConnected = await isControllerConnected();
        await sleep(250 );
    }
    console.log('Disonnected.')

    cableDisconnectedStatusText.textContent = 'Complete!'
    connectBluetoothStatusText.textContent = 'Pending...'
    cableDisconnectedSection.classList.add('complete');
    connectBluetoothSection.style.display = 'block';

    /*
    Assume that the user has hit the PS3 button on the
    controller and hasn't just plugged the cable back in
    */
    console.log('Checking bluetooth connection...')
    var isConnected = await isControllerConnected();
    while(isConnected != true){
        isConnected = await isControllerConnected();
        await sleep(250);
    }
    console.log('Bluetooth connected')

    connectBluetoothStatusText.textContent = 'Complete!'
    finalizeServiceStatusText.textContent = 'Pending...'
    connectBluetoothSection.classList.add('complete');
    finalizeServiceSection.style.display = 'block';

    var isServiceComplete = false;
    while(isServiceComplete == false || isConnected == false ){
        isServiceComplete = await startSixAxisLoop(
            apiInputJson
        );
        await sleep(1000);
    }

    connectBluetoothStatusText.textContent = 'Complete!'
    finalizeServiceSection.classList.add('complete');
    timelineWrapper.style.display = 'none';
    isWizardOn = false;
}

function isControllerConnected(){

    /*
    js0 will show up either when the PS3 controller is plugged
    in or when it is successfully connected over bluethooth,
    though it might not show up if it has been plugged in for
    awhile without being used. In this case you just need to
    unplug it and plug it in again.
    */

    return new Promise(function(resolve, reject) {
        $.ajax({
            method: 'POST',
            url: '/is-ps3-connected',
            timeout: 1000,
            success: function(response) {
                resolve(response['is_connected']);
            },
            error: function(){
                resolve(false);
            }
        });
    });
}

function runSudoSixPair(args){
    /*
    This runs the first PS3 step, calling `sudo sixpair`. It
    has the annoying side effect of making it appear as though
    the user has unplugged the controller, but this annoying
    behavior is expected, according to the official docus:
    https://pythonhosted.org/triangula/sixaxis.html. Anyways,
    The user will need to reconnect after this step is run
    */
    const host = args['host'];
    const port = args['port'];
    return new Promise(function(resolve, reject) {
        const input = JSON.stringify({
            'host': host,
            'port': port
        });
        $.ajax({
            method: 'POST',
            url: '/sudo-sixpair',
            timeout: 3000,
            data: input,
            success: function(response) {
                resolve(response['is_success']);
            },
            error: function(){
                resolve(false);
            }
        });
    });
}

function runPS3SetupCommands(args) {
    /*
    This bundles the commands used to start the Bluetooth
    pairing of the PS3 device. It runs `sudo ./sixpair` as
    well as turns on an agent, and registers the MAC Address
    */
    const host = args['host'];
    const port = args['port'];
    return new Promise(function(resolve, reject) {
        const input = JSON.stringify({
          'host': host,
          'port': port
        });
        $.post('/run-ps3-setup-commands', input, function(output){
            resolve(output['is_success']);
        });
    });
}

function startSixAxisLoop(args) {
    /*
    This starts the Python module that listen for events
    from the PS3 controller
    */
    const host = args['host'];
    const port = args['port'];
    return new Promise(function(resolve, reject) {
        const input = JSON.stringify({
          'host': host,
          'port': port
        });
        $.post('/start-sixaxis-loop', input, function(output){
            resolve(output['is_healthy']);
        });
    });
}

function unregisterPs3Controllers(args) {
    const host = args['host'];
    const port = args['port'];
    return new Promise(function(resolve, reject) {
        const input = JSON.stringify({
            'host': host,
            'port': port
        });
        $.post('/initialize-ps3-setup', input, function(output){
            resolve(output['is_success']);
        });
    });
}

function getPS3ControllerHealth() {
    /*
      This should not be confused with the health of the
      PS3 controller service. This checks if the SixAxis
      (custom PS3 module) is able to connect to the
      controller. The PS3 controller service might be up
      and healthy, but it might not be connected to the
      controller. This will always be true the before you
      have paired the controller with the service
    */
    return new Promise(function(resolve, reject) {
        $.post('/ps3-controller-health', function(output){
            resolve(output['is_healthy']);
        });
    });
}

function writePiField(fieldName, fieldValue) {
    return new Promise(function(resolve, reject) {
        const input = JSON.stringify({
          'column_name': fieldName,
          'column_value': fieldValue
        });
        $.post('/write-pi-field', input, function(){
            resolve();
        });
    });
}

function readPiField(fieldName) {
    return new Promise(function(resolve, reject) {
        const input = JSON.stringify({
          'column_name': fieldName
        });
        $.post('/read-pi-field', input, function(output){
            resolve(output['column_value']);
        });
    });
}

async function setEndpointText(){
    const promises = [
        readPiField("username"),
        readPiField("hostname")
    ];
    endpointComponents = await Promise.all(promises);
    const userName = endpointComponents[0];
    const hostName = endpointComponents[1];
    const endpointText = document.querySelector('output[name="endpoint"]');
    endpointText.textContent = userName + '@' + hostName;
}

function resetCheckStatusButton(){
    const testPiConnectionButton = document.querySelector('button#test-pi-connection-button');
    testPiConnectionButton.classList.remove('btn-warning');
    testPiConnectionButton.classList.remove('btn-danger');
    testPiConnectionButton.classList.remove('btn-success');
    testPiConnectionButton.classList.add('btn-primary');
    testPiConnectionButton.textContent = 'Test Connection';
}

function updateServiceStatusIcon(args){
    const status = document.querySelector('span.' + args['service'] + '-status');
    if(args['status'] == 'healthy'){
        status.classList.remove('text-danger');
        status.classList.remove('text-primary');
        status.classList.remove('text-light');
        status.classList.remove('text-warning');
        status.classList.add('text-success');
        status.style.display = 'inline';
    } else if (args['status'] == 'unhealthy') {
        status.classList.remove('text-success');
        status.classList.remove('text-primary');
        status.classList.remove('text-light');
        status.classList.remove('text-warning');
        status.classList.add('text-danger');
        status.style.display = 'inline';
    } else if (args['status'] == 'in-progress') {
        status.classList.remove('text-success');
        status.classList.remove('text-primary');
        status.classList.remove('text-light');
        status.classList.remove('text-danger');
        status.classList.add('text-warning');
        status.style.display = 'inline';
    } else if (args['status'] == 'ps3-ready-to-pair') {
        status.classList.remove('text-success');
        status.classList.remove('text-light');
        status.classList.remove('text-warning');
        status.classList.remove('text-danger');
        status.classList.add('text-primary');
        status.style.display = 'inline';
    } else {
        status.classList.remove('text-success');
        status.classList.remove('text-primary');
        status.classList.remove('text-danger');
        status.classList.remove('text-warning');
        status.classList.add('text-light');
        status.style.display = 'inline';
    }
}

// TODO: Do I still need this?
async function setServiceHost(){

    /*
    Check the DB if the "test locally" toggle is not visible,
    since it might not yet have been updated from the DB since
    the server started up
    */
    const testLocallyToggleWrapper = document.querySelector("#toggle-test-services-locally-wrapper");
    if (testLocallyToggleWrapper.style.display == 'none'){
        /*
        Used to check if the "test locally" button is selected
        in the DB. This function gets called when clicking the
        "services nav" section and when checking for service
        host elsewhere in the code and on pages where the toggle
        isn't available
        */
        const readInput = JSON.stringify({
            'web_page': 'raspberry pi',
            'name': 'test locally',
            'detail': 'test locally'
        });
        isLocalTest = await readToggle(readInput);
        if (isLocalTest == true) {
            serviceHost = 'localhost'
            return serviceHost
        } else {
            piHostname = await readPiField("hostname");
            serviceHost = piHostname;
            return serviceHost
        }
    } else {
        const testLocally = document.getElementById("toggle-test-services-locally");
        if (testLocally.checked == true){
            return 'localhost';
        } else{
            if (piHostname.length == 0){
                /*
                  Cache this value to avoid excessive Postgres lookups / load
                  when polling Pi service health checks
                */
                piHostname = await readPiField("hostname");
                return piHostname;
            } else {
                return piHostname;
            }
        }
    }
}

async function checkDashboardVideoReadiness(){
    /*
    This checks if the video feed is up and running and if it
    is, displays all of the video-related features. I envision
    running this sort of "isReady()" function in an interval
    until ready, and then when ready starts running the
    original interval "isNotReady()", so that the two can pair
    off as needed in a potentially endless loop starting and
    stopping each other's setInterval() functions.
    */
    recordingDataset = await getNextDatasetName({'host':serviceHost});
    pollVehicleAndUpdateUI();
    const datasetId = await getDatasetIdFromDataset(recordingDataset);
    const driveVehicleHeaderDatasetId = document.querySelector('span#driveVehicleHeaderDatasetId')
    driveVehicleHeaderDatasetId.textContent = datasetId;
    dashboardVideoWhileOffInterval = setInterval(async function(){
        const videoSpinner = document.querySelector("div#video-loader");
        const metricsHeader = document.querySelector('div#drive-metrics-header');
        const metricsGraphics = document.querySelector('div#drive-metrics-graphics');
        const metricsText = document.querySelector('div#drive-metrics-text');
        const videoServiceStatus = await getServiceStatus('video');
        if(videoServiceStatus == 'healthy'){
            clearInterval(dashboardVideoWhileOffInterval);
            const videoImage = showLiveVideo({
                'host':serviceHost,
                'port':8091 // TODO: Don't hard code this port
            });
            videoImage.onload = function(){
                videoSpinner.style.display = 'none';
                metricsHeader.style.display = 'flex';
                metricsGraphics.style.display = 'flex';
                metricsText.style.display = 'flex';
            }
        } else {
            // Turn spinner back on and hide the video content
            videoSpinner.style.display = 'flex';
            metricsHeader.style.display = 'none';
            metricsGraphics.style.display = 'none';
            metricsText.style.display = 'none';
            removeVideoSafely();
        }
    }, 1000);
    // Check if device supports orientation (ie is a phone vs laptop)
    if (window.DeviceOrientationEvent) {
        window.addEventListener("deviceorientation", captureDeviceOrientation);
    }
}

function updateServiceStatusColors(services){
    /*
    Changes status colors for all of the services
    */
    for (const service of services){
        updateServiceHealth(service);
    }
}

function getServiceStatus(service) {
    /*
    Gets the status of a Pi service. This is used to determine
    the color to assign a service's status dot. Possible statuses
    include the following:
        - ready-to-start
        - starting-up
        - healthy
        - unhealthy
        - ready-to-shut-down
        - shutting-down
        - off
        - invincible-zombie
        - invalid-status
    */
    return new Promise(function(resolve, reject) {
        const input = JSON.stringify({'service': service});
        $.post('/pi-service-status', input, function(output){
            resolve(output['status']);
        });
    });
}

async function updateServiceHealth(service){
    /*
    This function changes the colored dots next to each service to
    indicate its status (whether its healthy, etc)
    */
    const status = await getServiceStatus(service);

    // Separate statuses by color
    const changing = ['ready-to-start', 'starting-up', 'ready-to-shut-down', 'shutting-down']
    const bad = ['unhealthy','invincible-zombie','invalid-status']
    const good = ['healthy']
    const nothing = ['off']

    if (changing.includes(status)){
        updateServiceStatusIcon({
            'service':service,
            'status':'in-progress'
        });
    } else if (good.includes(status)) {
        if (service == 'ps3-controller'){
            const isSixAxisLooping = await getPS3ControllerHealth();
            if (isSixAxisLooping == true){
                updateServiceStatusIcon({
                    'service':service,
                    'status':'healthy'
                });
            } else {
                updateServiceStatusIcon({
                    'service':service,
                    'status':'ps3-ready-to-pair'
                });
            }
        } else {
            updateServiceStatusIcon({
                'service':service,
                'status':'healthy'
            });
        }
    } else if (bad.includes(status)) {
        updateServiceStatusIcon({
            'service':service,
            'status':'unhealthy'
        });
    } else if (nothing.includes(status)) {
        updateServiceStatusIcon({
            'service':service,
            'status':'inactive'
        });
    } else {
        // This should never happen
        console.log("Status of "+status+" for " + service + " service isn't valid");
        updateServiceStatusIcon({
            'service':service,
            'status':'unhealthy'
        });
    }
}

async function stopService(service){
    const host = serviceHost;
    const input = JSON.stringify({
      'host': host,
      'service': service
    });
    await new Promise(function(resolve, reject) {
        $.post('/stop-service', input, function(){
            resolve();
        });
    });
}

async function startService(service){
    const input = JSON.stringify({'service': service});
    $.post('/start-car-service', input);
}

function getNextDatasetName(args){

    /*
    Returns what the next dataset would be, if it were created. Not to
    be confused with actually creating a new dataset, however. I want
    to separate the lookup from the creation because I need to pass a
    dataset name to the UI when the user first visits the dashboard,
    and if the user doesn't start recording data but frequently moves
    across pages, I don't want to end up with a bunch of empty dataset
    folders on the Pi
    */

    const host = args['host'];

    return new Promise(function(resolve, reject) {
        const input = JSON.stringify({
            'host': host
        });
        $.ajax({
            method: 'POST',
            url: '/get-next-dataset-name',
            timeout: 1000,
            data: input,
            success: function(response) {
                resolve(response['dataset']);
            },
            error: function(){
                resolve(false);
            }
        });
    });
}

function createNewDataset(args){

    /*
    Creates a new dataset and returns its name
    */

    const host = args['host'];

    return new Promise(function(resolve, reject) {
        const input = JSON.stringify({
            'host': host
        });
        $.ajax({
            method: 'POST',
            url: '/create-new-dataset',
            timeout: 1000,
            data: input,
            success: function(response) {
                resolve(response['dataset']);
            },
            error: function(){
                resolve(false);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', async function() {

    /*
    These are global variables but need to be defined here
    or else you'll get undefined errors for makeDonut
    */
    donuts.ai = makeDonut('aiAngleDonut');
    donuts.human = makeDonut('humanAngleDonut');
    donuts.drive = makeDonut('driveHumanAngleDonut');

    const services = [
        "video",
        "record-tracker",
        "control-loop",
        "user-input",
        "engine",
        "ps3-controller",
        "model",
        "memory"
    ]

    for (const service of services){
        const toggle = document.querySelector("input#toggle-"+service);
        toggle.setAttribute("toggle-web-page","raspberry pi");
        toggle.setAttribute("toggle-name","service");
        toggle.setAttribute("toggle-detail",service);
        // Reads/writes status from/to DB
        configureToggle(toggle);
    }

    /*
      These two intervals are represented as vars so that they can
      be set and cleared multiple times. For example, they're off
      when you land on the settings page, but then get turned on
      when you click to the services page. Then if you click the
      settings page they get turned off again so that you don't
      continue to hammer the Pi with health checks. I define both
      at the top so that they're both in scope of the <nav>.onclick
      functions, which are responsible for turning them on and off
    */
    var resumeServicesTime = null;
    var ps3ControllerWizardInterval = null

    const settingsWrapper = document.querySelector("#settings-wrapper");
    const servicesWrapper = document.querySelector("#services-wrapper");
    const dashboardWrapper = document.querySelector("#dashboard-wrapper");
    const testLocallyToggleWrapper = document.querySelector("#toggle-test-services-locally-wrapper");
    const testLocally = document.getElementById("toggle-test-services-locally");

    testLocally.setAttribute("toggle-web-page","raspberry pi");
    testLocally.setAttribute("toggle-name","test locally");
    testLocally.setAttribute("toggle-detail","test locally");
    // Reads/writes status from/to DB
    configureToggle(testLocally);

    const settingsNav = document.querySelector("#settings-nav");
    settingsNav.onclick = function () {

        // Stop polling the services when not on the services page
        clearInterval(ps3ControllerWizardInterval);
        clearInterval(resumeServicesTime);

        settingsNav.classList.add("active");
        settingsWrapper.style.display = 'flex';

        servicesWrapper.style.display = 'none';
        servicesNav.classList.remove('active');

        dashboardWrapper.style.display = 'none';
        dashboardNav.classList.remove("active");

        testLocallyToggleWrapper.style.display = 'none';

        // Stop updating video data if video is no longer shown
        clearInterval(dashboardVideoWhileOffInterval);

    }

    const servicesNav = document.querySelector("#services-nav");
    servicesNav.onclick = async function () {

        const webPage = testLocally.getAttribute('toggle-web-page');
        const name = testLocally.getAttribute('toggle-name');
        const detail = testLocally.getAttribute('toggle-detail');
        const readInput = JSON.stringify({
            'web_page': webPage,
            'name': name,
            'detail': detail
        });
        const is_on = await readToggle(readInput);
        testLocally.checked = is_on;

        for (const service of services){
            const toggle = document.querySelector("input#toggle-"+service);
            updateToggleHtmlFromDB(toggle);
        }

        // Update Raspberry Pi service statues
        var resumeServicesTime = setInterval(function(){
            updateServiceStatusColors(services);
        }, 1000);
        /*
          Show PS3 connect wizard while PS3 controller connection
          status is not healthy but service is turned on
        */
        ps3ControllerWizardInterval = setInterval(async function(){
            const isSixAxisLooping = await getPS3ControllerHealth();
            if (isSixAxisLooping == true || !ps3ControllerServiceToggle.checked){
                timelineWrapper.style.display = 'none';
            } else {
                /*
                The PS3 part server is what executes all of the commands
                to pair the controller, so the server must be up and running
                before the web app can prompt the user to start the pairing
                process
                */
                const status = await getServiceStatus('ps3-controller')
                if (status == 'healthy') {
                    timelineWrapper.style.display = 'block';
                    if (isWizardOn == false){
                        await pairController();
                    }
                } else {
                    timelineWrapper.style.display = 'none';
                }

            }

        }, 1000);

        servicesWrapper.style.display = 'flex';
        servicesNav.classList.add('active');

        settingsWrapper.style.display = 'none';
        settingsNav.classList.remove('active');

        dashboardWrapper.style.display = 'none';
        dashboardNav.classList.remove("active");

        testLocallyToggleWrapper.style.display = 'block';

        // Stop updating video data if video is no longer shown
        clearInterval(dashboardVideoWhileOffInterval);
    }

    const dashboardNav = document.querySelector("#dashboard-nav");
    dashboardNav.onclick = async function(){

        dashboardNav.classList.add("active");
        dashboardWrapper.style.display = 'flex';

        servicesWrapper.style.display = 'none';
        servicesNav.classList.remove('active');

        settingsWrapper.style.display = 'none';
        settingsNav.classList.remove('active');

        testLocallyToggleWrapper.style.display = 'none';

        checkDashboardVideoReadiness();

    }

    const raspberryPiFields = document.querySelectorAll('input.raspberry-pi-field');
    for (const field of raspberryPiFields){
        const columnName = field.getAttribute("column-name");
        field.onchange = async function(){
            const columnValue = field.value;
            await writePiField(
                columnName,
                columnValue
            );
            setEndpointText();
        }
        const fieldType = field.getAttribute('type');
        if (fieldType.toLowerCase() != 'password'){
            readPiField(columnName).then(function(fieldValue){
                field.value = fieldValue;
            });
        }
    }
    setEndpointText();

    /*
    The "test locally" toggle isn't available on all Pi tabs, but
    I do use its boolean on all Pi tabs. I think it's more reliable
    to get the DB-saved toggle state when the toggle is not
    available than to try to read the state of a hidden object. Also
    since the variable is global in scope, and since the I use it
    in places where it needs to be checked frequently, like when
    requesting live video, I don't want to block video updates on
    DB checks for each frame, so I only update the global variable
    periodically with this interval
    */
    const serviceHostInterval = setInterval(async function(){
        serviceHost = await setServiceHost();
    }, 500);

    // Update Raspberry Pi statues
    const piHealthCheckTime = setInterval(async function(){
        isPiHealthy = await updatePiConnectionStatuses();
    }, 1000);

    // Periodically check that Pi hostname hasn't changed
    const piHostNameTime = setInterval(async function(){
        piHostname = await readPiField("hostname");
    }, 5000);

    const testPiConnectionButton = document.querySelector('button#test-pi-connection-button');
    testPiConnectionButton.onclick = async function(){
        this.textContent = 'Checking...';
        this.classList.remove('btn-primary');
        this.classList.remove('btn-danger');
        this.classList.remove('btn-success');
        this.classList.add('btn-warning');
        const isHealthy = await raspberryPiConnectionTest();
        if (isHealthy){
            this.classList.remove('btn-warning');
            this.classList.add('btn-success');
            this.textContent = 'Connection Succeeded!';
        } else {
            this.classList.remove('btn-warning');
            this.classList.add('btn-danger');
            this.textContent = 'Connection Failed!';
        }
        const resetTimer = setTimeout(resetCheckStatusButton, 3000);
    }

    const timelineWrapper = document.querySelector('#controller-timeline-wrapper');
    const ps3ControllerServiceToggle = document.querySelector('#toggle-ps3-controller');
    ps3ControllerServiceToggle.onchange = function(){

        if (ps3ControllerServiceToggle.checked == true){
            timelineWrapper.style.display = 'block';
        } else {
            timelineWrapper.style.display = 'none';
        }
    }

    /*
    Sometimes I encounter issues getting the PS3 controller
    bluetooth pairing to work. In those situations it can
    be helpful to restart the pairing process, and I can't
    think of a better way than to turn off the toggle
    */
    ps3ControllerServiceToggle.addEventListener(
        'onclick',
        unregisterPs3Controllers
    );

    configureSlider({
        'sliderId':'model-constant-speed-slider',
        'web_page':'raspberry pi',
        'name':'model constant speed',
        'type':'percent',
        'min':0,
        'max':100,
        'step':10
    });

    const trackedToggles = document.querySelectorAll('input.tracked-toggle');
    for (const toggle of trackedToggles){
        configureToggle(toggle);
    }

}, false);

var piHostname = '';
var isWizardOn = false;

/*
This global variable is used to keep track of whether
I have a unit test or not from any page, even if I'm
not on the page that has the "test locally" button.
This variable is used in lots of places, for example
to tell editor.py whether to check for video from
localhost or from the Pi. This variable also gets
updated in an interval, so it should always be fairly
up-to-date
*/
var serviceHost = '';

/*
It's possible that the video shown in the dashboard
live session goes in and out (e.g., bad connection).
If the connection goes out I want to revert back to
the spinning wheel and vice-versa. This means that I
need to be able to turns these intervals on and off
again from anywhere, hence their global nature. I
also want to support turning off the loop when I no
longer need to show the video but am still on the
raspberrypi.html page, like in the settings nav or
in the services nav
*/
var dashboardVideoWhileOffInterval = null;
var dashboardVideoWhileOnInterval = null;

/*
Need these donuts to be set in the DOMContentLoaded
but available outside of that scope
*/
var donuts = {
    "ai":null,
    'human':null,
    'drive':null
}
