function loadDatasetMetadata() {
    const allMetadata = []
    $.get( "/list-datasets", function(response) {
        datasets = response.datasets
        $.each(datasets, function (i, dataset) {
            getDatasetMetadata(dataset).then(function(metadata){
                allMetadata.push(metadata);
            });

        });
    });
    return allMetadata;
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
