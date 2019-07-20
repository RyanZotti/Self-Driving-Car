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