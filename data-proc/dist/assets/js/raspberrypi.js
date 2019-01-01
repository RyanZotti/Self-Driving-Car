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
            console.log(output['column_value']);
            resolve(output['column_value']);
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {

    const raspberryPiFields = document.querySelectorAll('input.raspberry-pi-field');
    for (const field of raspberryPiFields){
        const columnName = field.getAttribute("column-name");
        field.onchange = function(){
            const columnValue = field.value;
            writePiField(
                columnName,
                columnValue
            );
        }
        const fieldType = field.getAttribute('type');
        if (fieldType.toLowerCase() != 'password'){
            readPiField(columnName).then(function(fieldValue){
                field.value = fieldValue;
            });
        }
    }

}, false);