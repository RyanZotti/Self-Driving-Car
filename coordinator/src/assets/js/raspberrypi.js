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

async function updateServiceHealth(service){
    const testLocally = document.getElementById("toggle-test-services-locally");
    const serviceToggle = document.querySelector("input#toggle-"+service);
    if (serviceToggle.checked == true){
        if (testLocally.checked == true){
            const isHealthy = await piServiceHealth({
                'host':'localhost',
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
            if (piHostname.length == 0){
                /*
                  Cache this value to avoid excessive Postgres lookups / load
                  when polling Pi service health checks
                */
                piHostname = await readPiField("hostname");
            }
            const isHealthy = await piServiceHealth({
                'host':piHostname,
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
        }
    } else {
        updateServiceStatusIcon({
            'service':service,
            'status':'inactive'
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {

    const settingsWrapper = document.querySelector("#settings-wrapper");
    const servicesWrapper = document.querySelector("#services-wrapper");
    const testLocallyToggleWrapper = document.querySelector("#toggle-test-services-locally-wrapper")

    const settingsNav = document.querySelector("#settings-nav");
    settingsNav.onclick = function () {

        settingsNav.classList.add("active");
        settingsWrapper.style.display = 'block';

        servicesWrapper.style.display = 'none';
        servicesNav.classList.remove('active');

        testLocallyToggleWrapper.style.display = 'none';

    }

    const servicesNav = document.querySelector("#services-nav");
    servicesNav.onclick = function () {

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

    // Update Raspberry Pi service statues
    const piServiceHealthCheckTime = setInterval(function(){
        updateServiceHealth('record-tracker');
        updateServiceHealth('video');
        updateServiceHealth('control-loop');
        updateServiceHealth('user-input');
        updateServiceHealth('engine');
        updateServiceHealth('ps3-controller');
    }, 1000);

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
