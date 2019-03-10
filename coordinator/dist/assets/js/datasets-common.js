function getImageCountFromDataset(datasetType, dataset) {
    return new Promise(function(resolve, reject){
        let data = JSON.stringify({'dataset_type':datasetType,'dataset': dataset});
        $.post('/image-count-from-dataset', data, function(result){
            resolve(result.image_count);
        });
    });
}

function getDateFromDataset(dataset) {
    return new Promise(function(resolve, reject){
        let data = JSON.stringify({'dataset': dataset});
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

function getDatasetErrorMetrics(dataset) {
    return new Promise(function(resolve, reject) {
        data = JSON.stringify({'dataset': dataset})
        $.post('/get-dataset-error-metrics', data, function(result){
           resolve(result)
        });
    });
}

function getDatasetMetadata(datasetType, dataset) {
    const apiResults = [
        getDatasetIdFromDataset(dataset),
        getDateFromDataset(dataset),
        getImageCountFromDataset(datasetType, dataset),
        Promise.resolve(dataset),
        getImageCountFromDataset('mistake', dataset),
        getDatasetErrorMetrics(dataset)
    ]
    return Promise.all(apiResults).then(function(apiResults){
        const criticalCount = apiResults[5]['critical_count'];
        const criticalPercent = apiResults[5]['critical_percent'];
        const error = apiResults[5]['avg_abs_error'];
        const result = {
                'id' : apiResults[0],
                'date' : apiResults[1],
                'images' : apiResults[2],
                'name' : apiResults[3],
                'flags' : apiResults[4],
                'criticalCount' : criticalCount,
                'criticalPercent' : criticalPercent,
                'error' : error,
        }
        return result
    });
}

function loadDatasetMetadata() {
    return new Promise(function(resolveLoad, reject) {
        $.get( "/list-review-datasets").then(function(response){
            return response.datasets;
        }).then(function(datasets){
            let allMetadata = datasets.map(function (dataset) {
                return new Promise(function (resolve) {
                  resolve(getDatasetMetadata("review",dataset));
                });
            });
            Promise.all(allMetadata).then(function() {
                resolveLoad(allMetadata);
            });
        });
    });
}

function loadDatasetMetadataFileSystem() {
    return new Promise(function(resolveLoad, reject) {
        $.get( "/list-datasets-filesystem").then(function(response){
            return response.datasets;
        }).then(function(datasets){
            let allMetadata = datasets.map(function (dataset) {
                return new Promise(function (resolve) {
                  resolve(getDatasetMetadata("review",dataset));
                });
            });
            Promise.all(allMetadata).then(function() {
                resolveLoad(allMetadata);
            });
        });
    });
}

function refreshRecordReader() {
    return new Promise(function(resolve, reject){
        $.post('/refresh-record-reader', function(result){
            resolve(result);
        });
    });
}