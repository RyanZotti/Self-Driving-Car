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
    const host = await getServiceHost();
    const apiInputJson = {
        'host':host,
        'port':port
    }

    const timelineWrapper = document.querySelector('#controller-timeline-wrapper');
    const cableConnectedSection = document.querySelector('#controller-timeline-cable-connected');
    const runCommandsSection = document.querySelector('#controller-timeline-run-commands');
    const cableDisconnectedSection = document.querySelector('#controller-timeline-cable-disconnected');
    const connectBluetoothSection = document.querySelector('#controller-timeline-connect-bluetooth');
    const finalizeServiceSection = document.querySelector('#controller-timeline-finalize-service-connection');

    cableConnectedSection.classList.add('latest');
    cableConnectedSection.style.display = 'block';
    runCommandsSection.style.display = 'none';
    cableDisconnectedSection.style.display = 'none';
    connectBluetoothSection.style.display = 'none';
    finalizeServiceSection.style.display = 'none';

    /*
      Make sure the user has connected the controller to
      the Pi via the cable before starting the setup
      commands
    */
    var isConnected = false;
    while(isConnected != true){
        isConnected = await isControllerConnected(
            apiInputJson
        )
        await sleep(1000);
    }

    console.log('Cable connected!')

    cableConnectedSection.classList.remove('latest');
    runCommandsSection.classList.add('latest');
    runCommandsSection.style.display = 'block';

    /*
      Run bluetoothctl commands like turning on the agent,
      and trusting the MAC address
    */
    var setupCommandsComplete = false;
    while(setupCommandsComplete != true){
        setupCommandsComplete = await runPS3SetupCommands(
            apiInputJson
        )
        await sleep(2000);
    }

    console.log('Commands complete!')

    runCommandsSection.classList.remove('latest');
    cableDisconnectedSection.classList.add('latest');
    cableDisconnectedSection.style.display = 'block';

    /*
      Make sure the user unplugs the cable so that the
      next test is valid. If the cable is still plugged
      in when the user tests commands, it will look like
      the bluetooth connectivity is working even if it
      isn't
    */
    while(isConnected != false){
        isConnected = await isControllerConnected(
            apiInputJson
        )
        await sleep(1000);
    }

    console.log('Cable disconnected!')

    cableDisconnectedSection.classList.remove('latest');
    connectBluetoothSection.classList.add('latest');
    connectBluetoothSection.style.display = 'block';

    /*
      Assume that the user has hit the PS3 button on the
      controller and hasn't just plugged the cable back in
    */
    while(isConnected != true){
        isConnected = await isControllerConnected(
            apiInputJson
        )
        await sleep(1000);
    }

    console.log('Bluetooth connected!')

    connectBluetoothSection.classList.remove('latest');
    finalizeServiceSection.classList.add('latest');
    finalizeServiceSection.style.display = 'block';

    var isServiceComplete = false;
    while(isServiceComplete == false || isConnected == false ){
        isServiceComplete = await startSixAxisLoop(
            apiInputJson
        );
    }

    console.log('Service on!')

    timelineWrapper.style.display = 'none';
    isWizardOn = false;
}

function isControllerConnected(args){

    /*
    js0 will show up either when the PS3 controller is plugged
    in or when it is successfully connected over bluethooth,
    though it might not show up if it has been plugged in for
    awhile without being used. In this case you just need to
    unplug it and plug it in again.

    The caller of this function first checks for a connection,
    which is assumed to be wired. If the connection exists, then
    some registration commands are run. Then the caller checks
    that the user has disconnected. Then the caller checks that
    the connection exists after the user has hit the PS button,
    so effectively this function will get called at least three
    times during the pairing workflow
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
            url: '/is-ps3-connected',
            timeout: 1000,
            data: input,
            success: function(response) {
                resolve(response['is_connected']);
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
            console.log(output)
            resolve(output['is_complete']);
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

function getPS3ControllerHealth(args) {
    /*
      This should not be confused with the health of the
      PS3 controller service. This checks if the SixAxis
      (custom PS3 module) is able to connect to the
      controller. The PS3 controller service might be up
      and healthy, but it might not be connected to the
      controller. This will always be true the before you
      have paired the controller with the service
    */
    const host = args['host'];
    return new Promise(function(resolve, reject) {
        const input = JSON.stringify({
            'host': host,
        });
        $.post('/ps3-controller-health', input, function(output){
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
        status.classList.remove('text-light');
        status.classList.remove('text-warning');
        status.classList.add('text-success');
        status.style.display = 'inline';
    } else if (args['status'] == 'unhealthy') {
        status.classList.remove('text-success');
        status.classList.remove('text-light');
        status.classList.remove('text-warning');
        status.classList.add('text-danger');
        status.style.display = 'inline';
    } else if (args['status'] == 'in-progress') {
        status.classList.remove('text-success');
        status.classList.remove('text-light');
        status.classList.remove('text-danger');
        status.classList.add('text-warning');
        status.style.display = 'inline';
    } else {
        status.classList.remove('text-success');
        status.classList.remove('text-danger');
        status.classList.remove('text-warning');
        status.classList.add('text-light');
        status.style.display = 'inline';
    }
}

function getDockerArgs(testLocally){
    if (testLocally.checked == true){
        return {
          'target_host_os': 'mac',
          'target_host_type': 'laptop'
        };
    } else {
        return {
          'target_host_os': 'linux',
          'target_host_type': 'pi'
        };
    }
}

async function getServiceHost(){
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

async function updateServiceHealth(service){
    const testLocally = document.getElementById("toggle-test-services-locally");
    const serviceToggle = document.querySelector("input#toggle-"+service);
    const host = await getServiceHost();
    if (serviceToggle.checked == true){
        const isHealthy = await piServiceHealth({
            'host':host,
            'service':service
        });
        if (isHealthy == true){
            if (service == 'ps3-controller'){
                const isConnected = await getPS3ControllerHealth({'host':host});
                if (isConnected == true){
                    updateServiceStatusIcon({
                        'service':service,
                        'status':'healthy'
                    });
                } else {
                    updateServiceStatusIcon({
                        'service':service,
                        'status':'in-progress'
                    });
                }
            } else{
                updateServiceStatusIcon({
                    'service':service,
                    'status':'healthy'
                });
            }
        } else {
            updateServiceStatusIcon({
                'service':service,
                'status':'unhealthy'
            });
        }
    } else {
        updateServiceStatusIcon({
            'service':service,
            'status':'inactive'
        });
    }
}

async function stopService(service){
    const host = await getServiceHost();
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

async function osAgnosticPollServices(services){
    const testLocally = document.getElementById("toggle-test-services-locally");
    const host = await getServiceHost();
    const dockerArgs = getDockerArgs(testLocally);
    if (testLocally.checked == true){
        pollServices({
            'services':services,
            'host':host,
            'docker_args':dockerArgs
        });
    } else {
        // Share Pi status among services to avoid overwhelming Pi with redundant calls
        const isHealthy = await raspberryPiConnectionTest();
        if (isHealthy == true){
            pollServices({
                'services':services,
                'host':host,
                'docker_args':dockerArgs
            });
        }
    }
}

async function pollServices(args){
    const services = args['services'];
    const dockerArgs = args['docker_args'];
    const host = args['host'];
    for (const service of services){
        const toggle = document.querySelector("input#toggle-"+service);
        if (toggle.checked == true){
            const isHealthy = await piServiceHealth({
                'host':host,
                'service':service
            });
            if (!isHealthy){
                const input = JSON.stringify({
                  'target_host_os': dockerArgs['target_host_os'],
                  'target_host_type': dockerArgs['target_host_type'],
                  'service': service
                });
                $.post('/start-car-service', input);
            }
        } else {
            stopService(service);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {

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
    var piServiceHealthCheckTime = null;
    var resumeServicesTime = null;

    const settingsWrapper = document.querySelector("#settings-wrapper");
    const servicesWrapper = document.querySelector("#services-wrapper");
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
        clearInterval(piServiceHealthCheckTime);
        clearInterval(resumeServicesTime);

        settingsNav.classList.add("active");
        settingsWrapper.style.display = 'block';

        servicesWrapper.style.display = 'none';
        servicesNav.classList.remove('active');

        testLocallyToggleWrapper.style.display = 'none';

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
        osAgnosticPollServices(services);
        testLocally.checked = is_on;

        const checkboxStatuses = [];
        for (const service of services){
            const toggle = document.querySelector("input#toggle-"+service);
            checkboxStatuses.push(
                updateToggleHtmlFromDB(toggle)
            );
        }

        /*
          Previously sometimes services that were already up get killed on
          page load. This happened because all of the check boxes were set
          to off when the page loads, and it takes a little while to look
          up their statuses in the DB and update the page accordingly.
          During this waiting period the "pollServices" function might run,
          which checked the un-updated check boxes and thought that they're
          supposed to be off. Forcing update all of the check boxes on page
          load before starting the loop that checks all services fixes the
          issue. Using async/await to block the loop will prevent the
          service checks from running out of order
        */
        await Promise.all(checkboxStatuses)

        // Update Raspberry Pi service statues
        var piServiceHealthCheckTime = setInterval(function(){
            for (const service of services){
                updateServiceHealth(service);
            }
        }, 1000);
        var resumeServicesTime = setInterval(function(){
            osAgnosticPollServices(services);
        }, 10000);

        servicesWrapper.style.display = 'block';
        servicesNav.classList.add('active');

        settingsWrapper.style.display = 'none';
        settingsNav.classList.remove('active');

        testLocallyToggleWrapper.style.display = 'block';
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

    // Update Raspberry Pi statues
    const piHealthCheckTime = setInterval(function(){
        updatePiConnectionStatuses()
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
      Show PS3 connect wizard while PS3 controller connection
      status is not healthy but service is turned on
    */
    const ps3ControllerWizardInterval = setInterval(async function(){
        const host = await getServiceHost();
        const isConnected = await getPS3ControllerHealth({'host':host});
        if (isConnected == true){
            timelineWrapper.style.display = 'none';
        } else {
            timelineWrapper.style.display = 'block';
            if (isWizardOn == false){
                await pairController();
            }
        }

    }, 5000);

}, false);

var piHostname = '';
var isWizardOn = false;
