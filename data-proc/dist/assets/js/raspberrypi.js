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

document.addEventListener('DOMContentLoaded', function() {

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

}, false);