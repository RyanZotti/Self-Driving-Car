function getDatasetMachineLearningRowString() {
    return new Promise(function(resolve, reject) {
        $.get( "/machine-learning-dataset.html", function(datasetString) {
            resolve(datasetString);
        });
    });
}

function addDatasetMachineLearningRows() {
    const promises = [
        getDatasetMachineLearningRowString(),
        loadDatasetMetadata()
    ];
    Promise.all(promises).then(function(promiseResults){
        const datasetRowString = promiseResults[0];
        const datasetPromises = promiseResults[1];
        const tbody = document.querySelector("tbody#datasetsTbody");
        for (datsetPromise of datasetPromises) {
            const tr = htmlToElement(datasetRowString);
            datsetPromise.then(function(dataset){
                const datasetText = dataset.name;
                tr.querySelector('td.dataset-id').textContent = dataset.id;
                tr.querySelector('td.images').textContent = dataset.images;

                // Make sure train select buttons are functional
                const trainSelectInput = tr.querySelector('input[name="trainSelect"]');
                trainSelectInput.setAttribute('id','dataset-id-'+dataset.id);
                const trainSelectLabel = tr.querySelector('label[name="trainSelect"]');
                trainSelectLabel.setAttribute('for','dataset-id-'+dataset.id);

                // Make sure validation select buttons are functional
                const validationSelectInput = tr.querySelector('input[name="validationSelect"]');
                validationSelectInput.setAttribute('id','dataset-id-'+dataset.id);
                const validationSelectLabel = tr.querySelector('label[name="validationSelect"]');
                validationSelectLabel.setAttribute('for','dataset-id-'+dataset.id);

                tbody.appendChild(tr);
            });
        }
    });
}

function selectAllMachineLearningDatasetsTrigger(){
    const datasetTypes = [
        'train',
        'validation'
    ]
    for (let datasetType of datasetTypes){
        const selectAllDatasetsButton = document.querySelector(`input#${datasetType}SelectAll`);
        selectAllDatasetsButton.onchange = function() {
            var buttons = document.querySelectorAll(`input[name='${datasetType}Select']`);
            for (let button of buttons){
                button.checked = selectAllDatasetsButton.checked;
            }
        };
    }
};

function stopTraining() {
    return new Promise(function(resolve, reject){
        $.post('/stop-training', function(result){
            resolve(result.is_running);
        });
    });
}

// TODO: Allow transfer learning
function startTraining() {
    return new Promise(function(resolve, reject){
        doesModelExist().then(function(exists){
            if (exists == true){
                $.post('/resume-training', function(result){
                    resolve(result);
                });
            } else {
                $.post('/train-new-model', function(result){
                    resolve(result);
                });
            }
        });
    });
}

/*
Used to check if model API train a model from
scratch or apply transfer learning to an existing
model
*/
function doesModelExist() {
    return new Promise(function(resolve, reject){
        $.post('/does-model-already-exist', function(result){
            resolve(result.exists);
        });
    });
}

/*
The list of processes should be the source of
truth regarding the current state of training.
It's better to look up proceesses than to save
the state in a variable somewhere, especially
if users are going to switch screens frequently
*/
function isTraining() {
    return new Promise(function(resolve, reject){
        $.post('/is-training', function(result){
            resolve(result.is_running);
        });
    });
}

function setTrainButtonState() {
    if (isAttemptingTrainingStop == false){
        console.log('isAttemptingTrainingStop: '+isAttemptingTrainingStop);
        const trainModelButton = document.querySelector("button#train-model-button");
        isTraining().then(function(processExists){
            isTrainingLastState = processExists;
            if(processExists == true){
                trainModelButton.textContent = 'Stop Training'
                if(trainModelButton.classList.contains("btn-primary")){
                     trainModelButton.classList.remove("btn-primary");
                }
                if(!trainModelButton.classList.contains("btn-danger")){
                    trainModelButton.classList.add("btn-danger");
                }
            } else {
                trainModelButton.textContent = 'Start Training'
                if(trainModelButton.classList.contains("btn-danger")){
                    trainModelButton.classList.remove("btn-danger");
                }
                if(!trainModelButton.classList.contains("btn-primary")){
                    trainModelButton.classList.add("btn-primary");
                }
            }
        });
    };
}

function getNewEpochs(modelId) {
    return new Promise(function(resolve, reject) {
        data = JSON.stringify({'model_id': modelId})
        $.post('/get-new-epochs', data, function(result){
           resolve(result['epochs'])
        });
    });
}

function checkIfEpochAlreadyInTable(epoch){
    var exists = false;
    const epochsTable = document.querySelector("tbody#epochs-tbody");
    const rows = epochsTable.querySelectorAll("tr");
    for (const row of rows){
        const epochTd = row.querySelector('td.epoch-id');
        const existingEpochId = epochTd.textContent;
        if (epoch == existingEpochId){
            exists = true;
            break;
        }
    }
    return exists;
}

async function fillEpochsTable(modelId){
    const epochs = await getNewEpochs(modelId);
    const epochsTable = document.querySelector("tbody#epochs-tbody");
    for (epoch of epochs){
        const row = await getHtml("machine-learning-epoch.html");
        const rowExists = checkIfEpochAlreadyInTable(epoch['epoch']);
        if (rowExists != true){
            const epochIdTd = row.querySelector("td.epoch-id");
            epochIdTd.textContent = epoch['epoch'];
            const trainingTd = row.querySelector("td.epoch-train");
            trainingTd.textContent = (epoch['train']).toFixed(2);
            const validationTd = row.querySelector("td.epoch-validation");
            validationTd.textContent = (epoch['validation']).toFixed(2);
            epochsTable.appendChild(row);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    selectAllMachineLearningDatasetsTrigger();
    addDatasetMachineLearningRows();
    var modelId = 1;
    fillEpochsTable(modelId)
    /*
    The training could complete successfully or fail at any
    time, so make sure to check it every 5 seconds. The time
    loop can be quit with a call to clearInterval(<timevar>);
    */
    const trainingStateTimer = setInterval(function(){
      setTrainButtonState();
      // TODO: Remove hardcoded modelId
      var modelId = 1;
      fillEpochsTable(modelId);
    }, 1000);

    const trainModelButton = document.querySelector("button#train-model-button");
    trainModelButton.onclick = function(){
        if(isTrainingLastState == true){
            const trainModelButton = document.querySelector("button#train-model-button");
            isAttemptingTrainingStop = true;
            trainModelButton.textContent = 'Stopping Training ...'
            stopTraining().then(function(){
                setTrainButtonState();
                isAttemptingTrainingStop = false;
            });
        } else {
            startTraining().then(function(){
                setTrainButtonState();
            });
        }
    };

}, false);

var isTrainingLastState = false;

/*
Used to ensure that the train button doesn't go
from "stop training..." to "stop training" briefly
as this might cause users to double click and
accidentally start training again
*/
var isAttemptingTrainingStop = false;
