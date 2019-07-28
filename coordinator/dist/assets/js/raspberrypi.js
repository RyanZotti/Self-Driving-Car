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
        status.classList.add('text-success');
        status.style.display = 'inline';
    } else if (args['status'] == 'unhealthy') {
        status.classList.remove('text-success');
        status.classList.remove('text-light');
        status.classList.add('text-danger');
        status.style.display = 'inline';
    } else {
        status.classList.remove('text-success');
        status.classList.remove('text-danger');
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
            updateServiceStatusIcon({
                'service':service,
                'status':'healthy'
            });
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
        "model"
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
        }, 5000);

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

}, false);

var piHostname = '';
