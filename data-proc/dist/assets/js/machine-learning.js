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

document.addEventListener('DOMContentLoaded', function() {
    selectAllMachineLearningDatasetsTrigger();
    addDatasetMachineLearningRows();
}, false);
