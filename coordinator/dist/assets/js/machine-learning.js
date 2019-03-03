function getDatasetMachineLearningRowString() {
    return new Promise(function(resolve, reject) {
        $.get( "/machine-learning-dataset.html", function(datasetString) {
            resolve(datasetString);
        });
    });
}

function listModels() {
    return new Promise(function(resolve, reject) {
        $.post( "/list-models", function(result) {
            resolve(result.models);
        });
    });
}

async function loadMachineLearningModels() {
    const table = document.querySelector("tbody#modelsTbody");
    const models = await listModels();
    for (const model of models){
        const row = await getHtml('/model.html');
        row.querySelector('td.model-id').textContent = model['model_id'];
        row.querySelector('td.model-created-ts').textContent = model['created_timestamp'];
        row.querySelector('td.model-top-crop-percent').textContent = model['crop'];
        row.querySelector('td.model-image-scale').textContent = model['scale'];
        table.appendChild(row);
    }
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
        for (const datsetPromise of datasetPromises) {
            const tr = htmlToElement(datasetRowString);
            datsetPromise.then(function(dataset){
                const datasetText = dataset.name;
                tr.querySelector('td.dataset-id').textContent = dataset.id;
                tr.querySelector('td.images').textContent = dataset.images;

                // Make sure train select buttons are functional
                const trainSelectInput = tr.querySelector('input[name="trainSelect"]');
                trainSelectInput.setAttribute('id','train-dataset-id-'+dataset.id);
                trainSelectInput.setAttribute('dataset',datasetText);
                const trainSelectLabel = tr.querySelector('label[name="trainSelect"]');
                trainSelectLabel.setAttribute('for','train-dataset-id-'+dataset.id);
                trainSelectInput.onclick = function(){
                    console.log('train '+datasetText+' '+this.checked);
                    const input = JSON.stringify({
                        'web_page': 'machine learning',
                        'name': 'training dataset',
                        'detail': datasetText,
                        'is_on': this.checked
                    });
                    writeToggle(input);
                }
                const trainingToggleReadInput = JSON.stringify({
                    'web_page': 'machine learning',
                    'name': 'training dataset',
                    'detail': datasetText
                });
                readToggle(trainingToggleReadInput).then(function(is_on) {
                    trainSelectInput.checked = is_on;
                });


                // Make sure validation select buttons are functional
                const validationSelectInput = tr.querySelector('input[name="validationSelect"]');
                validationSelectInput.setAttribute('id','validation-dataset-id-'+dataset.id);
                validationSelectInput.setAttribute('dataset',datasetText);
                const validationSelectLabel = tr.querySelector('label[name="validationSelect"]');
                validationSelectLabel.setAttribute('for','validation-dataset-id-'+dataset.id);
                validationSelectInput.onclick = function(){
                    console.log('validation '+datasetText+' '+this.checked);
                    const input = JSON.stringify({
                        'web_page': 'machine learning',
                        'name': 'validation dataset',
                        'detail': datasetText,
                        'is_on': this.checked
                    });
                    writeToggle(input);
                }
                const validationToggleReadInput = JSON.stringify({
                    'web_page': 'machine learning',
                    'name': 'validation dataset',
                    'detail': datasetText
                });
                readToggle(validationToggleReadInput).then(function(is_on) {
                    validationSelectInput.checked = is_on;
                });

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
    return new Promise(async function(resolve, reject){
        const trainDatasets = getMLCheckedDatasets('train');
        const validationDatasets = getMLCheckedDatasets('validation');
        const exists = await doesModelExist();
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

function laptoModelApiHealth() {
    return new Promise(function(resolve, reject){
        $.post('/laptop-model-api-health', function(result){
            resolve(result['process_id']);
        });
    });
}

function deployModelLaptop() {
    return new Promise(function(resolve, reject){
        $.post('/deploy-laptop-model', function(result){
            resolve(result);
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


async function populateModelIdOptions(modelId) {
    const selection = document.querySelector('select#resumeTrainingExistingModelId');
    while (selection.firstChild) {
        selection.removeChild(selection.firstChild);
    }
    const models = await listModels();
    for (const model of models){
        const option = document.createElement('option');
        option.setAttribute("id",model['model_id']);
        option.textContent = model['model_id'];
        selection.appendChild(option);
    }
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

function getMLCheckedDatasets(datasetType){
    const rows = document.querySelectorAll("tbody#datasetsTbody > tr");
    const checkedDatasets = [];
    const inputName = datasetType.toLowerCase() + 'Select';
    for (const row of rows){
        const checkBox = row.querySelector('input[name="'+inputName+'"]');
        const dataset = checkBox.getAttribute('dataset');
        if (checkBox.checked == true){
            checkedDatasets.push(dataset)
        }
    }
    return checkedDatasets;
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

    // Update Raspberry Pi statues
    const piHealthCheckTime = setInterval(function(){
        updatePiConnectionStatuses()
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

    // TODO: Figure out how to differentiate from Pi model deployment
    const deployModelButton = document.querySelector("button#deploy-model-laptop-button");
    deployModelButton.onclick = function(){
        deployModelLaptop();
    }

    const trackedToggles = document.querySelectorAll('input.tracked-toggle');
    for (const toggle of trackedToggles){
        configureToggle(toggle);
    }

    const newOrExistingModelTrainSelect = document.querySelector('select#newOrExistingModel');
    const existingModelOption = document.querySelector('option#existing-model-option');
    const trainExistingModelIdSelectDiv = document.querySelector('div#train-existing-model-id-option-div');
    newOrExistingModelTrainSelect.onchange = function(){
        console.log(newOrExistingModelTrainSelect.options[newOrExistingModelTrainSelect.selectedIndex].text)
        if (existingModelOption.selected == true){
            populateModelIdOptions();
            trainExistingModelIdSelectDiv.style.display = 'block';
        } else{
            trainExistingModelIdSelectDiv.style.display = 'none';
        }
    }


    loadMachineLearningModels();

}, false);

var isTrainingLastState = false;

/*
Used to ensure that the train button doesn't go
from "stop training..." to "stop training" briefly
as this might cause users to double click and
accidentally start training again
*/
var isAttemptingTrainingStop = false;
