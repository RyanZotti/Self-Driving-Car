// https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro/35385518#35385518
function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function getDatasetRowString() {
    return new Promise(function(resolve, reject) {
        $.get( "/dataset.html", function(datasetString) {
            resolve(datasetString);
        });
    });
}

function addDatasetRows() {
    const promises = [
        getDatasetRowString(),
        loadDatasetMetadata()
    ];
    Promise.all(promises).then(function(promiseResults){
        const datasetRowString = promiseResults[0];
        const datasetPromises = promiseResults[1];
        var options = {
            valueNames: [ 'orders-order', 'orders-date', 'orders-total' ],
            item: datasetRowString
        };
        var userList = new List("datasets-table-div", options);
        for (datsetPromise of datasetPromises) {
            datsetPromise.then(function(dataset){
                userList.add({
                    'orders-order':dataset.id,
                    'orders-date':dataset.date,
                    'orders-total':dataset.images
                });
            });
        }
    });
}

function loadDatasetMetadata() {
    return new Promise(function(resolveLoad, reject) {
        $.get( "/list-datasets").then(function(response){
            return response.datasets;
        }).then(function(datasets){
            let allMetadata = datasets.map(function (dataset) {
                return new Promise(function (resolve) {
                  resolve(getDatasetMetadata(dataset));
                });
            });
            Promise.all(allMetadata).then(function() {
                resolveLoad(allMetadata);
            });
        });
    });
}

function getDatasetMetadata(dataset) {
    apiResults = [
        getDatasetIdFromDataset(dataset),
        getDateFromDataset(dataset),
        getImageCountFromDataset(dataset)
    ]
    return Promise.all(apiResults).then(function(apiResults){
        const result = {
                'id' : apiResults[0],
                'date' : apiResults[1],
                'images' : apiResults[2]
            }
        return result
    });
}

function getImageCountFromDataset(dataset) {
    return new Promise(function(resolve, reject){
        let data = JSON.stringify({'dataset': dataset})
        $.post('/image-count-from-dataset', data, function(result){
            resolve(result.image_count);
        });
    });
}

function getDateFromDataset(dataset) {
    return new Promise(function(resolve, reject){
        let data = JSON.stringify({'dataset': dataset})
        $.post('/dataset-date-from-dataset-name', data, function(result){
            resolve(result.dataset_date);
        });
    });
}

function getDatasetIdFromDataset(dataset) {
    return new Promise(function(resolve, reject){
        let data = JSON.stringify({'dataset': dataset})
        $.post('/dataset-id-from-dataset-name', data, function(result){
            resolve(result.dataset_id);
        });
    });
}

function getDatasetReviewTableHtml() {
    return new Promise(function(resolve, reject) {
        $.get( "/datasets-review-table.html", function(datasetString) {
           resolve(htmlToElement(datasetString));
        });
    });
}

function loadReviewDatasetsTable() {
    loadReviewDatasetsTable();
    getDatasetReviewTableHtml().then(function(tableHtml){
        const parentDiv = document.querySelector('div#table-wrapping-div');
        parentDiv.appendChild(tableHtml);
    }).then(function(){
        addDatasetRows();
    });
}

document.addEventListener('DOMContentLoaded', function() {
    addDatasetRows();
    // TODO: Replace with plain javascript instead of jquery
    $("#dataset-review").click(function(){
        $("#dataset-import").removeClass('active');
        $("#dataset-review").addClass('active');
    });
    $("#dataset-import").click(function(){
        $("#dataset-review").removeClass('active');
        $("#dataset-import").addClass('active');
    });
}, false);
