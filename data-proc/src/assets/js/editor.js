// https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro/35385518#35385518
function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function getDatasetImportRowString() {
    return new Promise(function(resolve, reject) {
        $.get( "/dataset-import.html", function(datasetString) {
            resolve(datasetString);
        });
    });
}

function getDatasetReviewRowString() {
    return new Promise(function(resolve, reject) {
        $.get( "/dataset-review.html", function(datasetString) {
            resolve(datasetString);
        });
    });
}

function getDatasetMistakeRowString() {
    return new Promise(function(resolve, reject) {
        $.get( "/dataset-mistake.html", function(datasetString) {
            resolve(datasetString);
        });
    });
}

function addDatasetImportRows() {
    const promises = [
        getDatasetImportRowString(),
        loadDatasetMetadata()
    ];
    Promise.all(promises).then(function(promiseResults){
        const datasetRowString = promiseResults[0];
        const datasetPromises = promiseResults[1];
        var options = {
            valueNames: [
                'dataset-id',
                'created-date',
                'images',
                { attr: 'dataset', name: 'download-dataset-button' },
                { attr: 'dataset', name: 'trash-dataset-button' }
            ],
            item: datasetRowString
        };
        var userList = new List("datasets-table-div", options);
        for (datsetPromise of datasetPromises) {
            datsetPromise.then(function(dataset){
                const datasetText = dataset.name;
                userList.add({
                    'dataset-id':dataset.id,
                    'created-date':dataset.date,
                    'images':dataset.images,
                    'download-dataset-button':datasetText,
                    'trash-dataset-button':datasetText
                });
            });
        }
    });
}

function addDatasetReviewRows() {
    const promises = [
        getDatasetReviewRowString(),
        loadDatasetMetadata()
    ];
    Promise.all(promises).then(function(promiseResults){
        const datasetRowString = promiseResults[0];
        const datasetPromises = promiseResults[1];
        var options = {
            valueNames: [
                'dataset-id',
                'created-date',
                'images',
                { attr: 'dataset', name: 'play-dataset-button' },
                { attr: 'dataset', name: 'trash-dataset-button' }
            ],
            item: datasetRowString
        };
        var userList = new List("datasets-table-div", options);
        for (datsetPromise of datasetPromises) {
            datsetPromise.then(function(dataset){
                const datasetText = dataset.name;
                userList.add({
                    'dataset-id':dataset.id,
                    'created-date':dataset.date,
                    'images':dataset.images,
                    'play-dataset-button':datasetText,
                    'trash-dataset-button':datasetText
                });
            });
        }
    }).then(function(){
        // Test that the promise worked and that at this point
        // all of the rows have been updated
        var tbody = document.querySelector("tbody#datasetsTbody");
        var buttons = tbody.querySelectorAll("tr > td > button.fe-play");
        for (button of buttons){
            button.onclick = function() {
                const modalPlayPauseButton = document.querySelector("img#modalPlayPauseButton");
                // Ensure that video starts playing when modal first opens
                modalPlayPauseButton.removeAttribute("src");
                modalPlayPauseButton.setAttribute("src","assets/img/icons/pause.svg");
                isVideoPlaying = true; // set global variable in case of pause and then resume
                const dataset = this.getAttribute('dataset');
                datasetPlaying = dataset; // set global variable in case of pause and then resume
                getDatasetRecordIds(dataset).then(function(recordIds){
                    recordIdIndexPlaying = 0;
                    playVideo([dataset, recordIds, recordIdIndexPlaying]);
                });
            }
        }
    });
}

function getDatasetRecordIds(dataset) {
    return new Promise(function(resolve, reject){
        data = JSON.stringify({ 'dataset': dataset})
        $.post('/dataset-record-ids', data, function(result){
            resolve(result.record_ids);
        });
    });
}

function updateRecordId(recordIds, recordIdIndex){
    // Check if last record has been reached
    if (recordIdIndex < recordIds.length){
       recordId = recordIds[recordIdIndex];
    } else {
       recordId = -1
    }
    return recordId;
}

function updateImage(dataset, recordId) {
    imageUrl = '/image?dataset='+dataset+'&record-id='+recordId;
    const videoFrame = document.querySelector("#mpeg-image")
    videoFrame.setAttribute('src',imageUrl);
}

function getAiAngle(dataset, recordId) {
    return new Promise(function(resolve, reject) {
        data = JSON.stringify({ 'dataset': dataset, 'record_id' : recordId})
        console.log(data);
        $.post('/ai-angle', data, function(result){
           resolve(result)
        });
    });
}

function getHumanAngleAndThrottle(dataset, recordId) {
    return new Promise(function(resolve, reject) {
        data = JSON.stringify({ 'dataset': dataset, 'record_id' : recordId})
        $.post('/user-labels', data, function(result){
           resolve(result)
        });
    });
}

function updateAiAndHumanLabelValues(dataset, recordId){
    labels = [
        getHumanAngleAndThrottle(
            dataset,
            recordId
        ),
        getAiAngle(
            dataset,
            recordId
        )
    ];

    return Promise.all(labels).then(function AcceptHandler(results) {
        state.human.angle = results[0].angle;
        state.human.throttle = results[0].throttle;
        state.ai.angle = results[1].angle;
        console.log(results[1]);
        // TODO: Figure out to do when selecting constant throttle
        //state.ai.throttle = results[1].throttle;
        state.ai.angleAbsError = Math.abs(state.human.angle - state.ai.angle);
        state.ai.throttleAbsError = Math.abs(state.human.throttle - state.ai.throttle);
    });
}

function adjustAngleDonut(donutId, angle){
    /*
    Angle is between -1 and 1 so need to scale
    to rotate donut appropriately. Full left is
    -0.5, middle is 0.0, and full right is 0.5
    */
    const scaledAngle = angle / 2;
    const options = {
        'cutoutPercentage':50,
        'rotation':scaledAngle * Math.PI,
        'animation': {
            'animateRotate':false
        }
    }
    new Chart(donutId, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [50, 50],
          'borderWidth':[1,1],
          'backgroundColor':['#E3EBF6','#2C7BE5']
        }]
      },
      options: options
    });
}

async function playVideo(args) {
    const dataset = args[0];
    const recordIds = args[1];
    const recordIdIndex = args[2]
    const recordId = updateRecordId(recordIds, recordIdIndexPlaying);
    if (recordIdIndexPlaying < recordIds.length){
        await updateAiAndHumanLabelValues(dataset, recordId);
        updateImage(dataset, recordId);
        await adjustAngleDonut('aiAngleDonut',state.ai.angle);
        await adjustAngleDonut('humanAngleDonut',state.human.angle);
        const pauseOnBadMistake = document.getElementById("pauseOnMistakeToggle").checked;
        const isMistakeBad = state.ai.throttleAbsError > pauseOnBadMistakeThreshold;
        if (isVideoPlaying == true){
            if (pauseOnBadMistake && isMistakeBad){
                isVideoPlaying = false;
                const modalPlayPauseButton = document.querySelector("img#modalPlayPauseButton");
                modalPlayPauseButton.removeAttribute("src");
                modalPlayPauseButton.setAttribute("src","assets/img/icons/play.svg");
            } else {
                recordIdIndexPlaying = recordIdIndex + 1;
                window.requestAnimationFrame(playVideo.bind(playVideo,[dataset, recordIds, recordIdIndexPlaying]));
            }
        }
        console.log(state.ai.throttleAbsError);
    } else {
        isVideoPlaying = false;
        const closeModalButton = document.querySelector('button#closeModal');
        closeModalButton.click();
    }

    // Set global variables in case of play and then resume
    datasetPlaying = dataset;
    recordIdsPlaying = recordIds;
    recordIdIndexPlaying = recordIdIndex;
    //setDatasetProgress(dataset,recordIds,recordId);

    //updateLabelBars();


    //console.log('record ID: '+recordId + ' '+ state.ai.angleAbsError);
    //if (recordId <= maxRecordId && state.ai.angleAbsError < 0.8 && state.isVideoPlaying == true) {
    //    console.log('record ID: '+recordId + ' continuing animation');
    //    window.requestAnimationFrame(playVideo);
    //} else {
    //    state.isVideoPlaying = false;
    //}
    console.log(recordIdIndexPlaying);
}

function addDatasetMistakeRows() {
    const promises = [
        getDatasetMistakeRowString(),
        loadMistakeDatasetMetadata()
    ];
    Promise.all(promises).then(function(promiseResults){
        const datasetRowString = promiseResults[0];
        const datasetPromises = promiseResults[1];
        var options = {
            valueNames: [
                'dataset-id',
                'created-date',
                'images',
                { attr: 'dataset', name: 'play-dataset-button' },
                { attr: 'dataset', name: 'trash-dataset-button' }
            ],
            item: datasetRowString
        };
        var userList = new List("datasets-table-div", options);
        for (datsetPromise of datasetPromises) {
            datsetPromise.then(function(dataset){
                const datasetText = dataset.name;
                userList.add({
                    'dataset-id':dataset.id,
                    'created-date':dataset.date,
                    'images':dataset.images,
                    'play-dataset-button':datasetText,
                    'trash-dataset-button':datasetText
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

function loadMistakeDatasetMetadata() {
    return new Promise(function(resolveLoad, reject) {
        $.get( "/list-mistake-datasets").then(function(response){
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
    const apiResults = [
        getDatasetIdFromDataset(dataset),
        getDateFromDataset(dataset),
        getImageCountFromDataset(dataset),
        Promise.resolve(dataset)
    ]
    return Promise.all(apiResults).then(function(apiResults){
        const result = {
                'id' : apiResults[0],
                'date' : apiResults[1],
                'images' : apiResults[2],
                'name' : apiResults[3]
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

function getDatasetMistakesTableHtml() {
    return new Promise(function(resolve, reject) {
        $.get( "/datasets-mistakes-table.html", function(datasetString) {
           resolve(htmlToElement(datasetString));
        });
    });
}

function getDatasetImportTableHtml() {
    return new Promise(function(resolve, reject) {
        $.get( "/datasets-import-table.html", function(datasetString) {
           resolve(htmlToElement(datasetString));
        });
    });
}

function loadReviewDatasetsTable() {
    getDatasetReviewTableHtml().then(function(tableHtml){
        // Remove the previous table if it exists
        const previousTable = document.querySelector('div#datasets-table-div');
        if (previousTable != null){
            previousTable.remove();
        }
        // Add new table
        const parentDiv = document.querySelector('div#table-wrapping-div');
        parentDiv.appendChild(tableHtml);
    }).then(function(){
        addDatasetReviewRows();
    });
}

function loadMistakeDatasetsTable() {
    getDatasetMistakesTableHtml().then(function(tableHtml){
        // Remove the previous table if it exists
        const previousTable = document.querySelector('div#datasets-table-div');
        if (previousTable != null){
            previousTable.remove();
        }
        // Add new table
        const parentDiv = document.querySelector('div#table-wrapping-div');
        parentDiv.appendChild(tableHtml);
    }).then(function(){
        addDatasetMistakeRows();
    });
}

function loadImportDatasetsTable() {
    getDatasetImportTableHtml().then(function(tableHtml){
        // Remove the previous table if it exists
        const previousTable = document.querySelector('div#datasets-table-div');
        if (previousTable != null){
            previousTable.remove();
        }
        // Add new table
        const parentDiv = document.querySelector('div#table-wrapping-div');
        parentDiv.appendChild(tableHtml);
    }).then(function(){
        addDatasetImportRows();
    });
}

document.addEventListener('DOMContentLoaded', function() {
    loadImportDatasetsTable();
    // TODO: Replace with plain javascript instead of jquery
    $("#dataset-review").click(function(){
        $("#dataset-import").removeClass('active');
        $("#dataset-mistakes").removeClass('active');
        $("#dataset-review").addClass('active');
        loadReviewDatasetsTable();
    });
    $("#dataset-import").click(function(){
        $("#dataset-review").removeClass('active');
        $("#dataset-mistakes").removeClass('active');
        $("#dataset-import").addClass('active');
        loadImportDatasetsTable();
    });
    $("#dataset-mistakes").click(function(){
        $("#dataset-import").removeClass('active');
        $("#dataset-review").removeClass('active');
        $("#dataset-mistakes").addClass('active');
        loadMistakeDatasetsTable();
    });

    const modalPlayPauseButton = document.querySelector("img#modalPlayPauseButton");
    modalPlayPauseButton.onclick = function(){
        if(isVideoPlaying == true){
            isVideoPlaying = false;
            modalPlayPauseButton.removeAttribute("src");
            modalPlayPauseButton.setAttribute("src","assets/img/icons/play.svg");
        } else {
            isVideoPlaying = true;
            modalPlayPauseButton.removeAttribute("src");
            modalPlayPauseButton.setAttribute("src","assets/img/icons/pause.svg");
            getDatasetRecordIds(datasetPlaying).then(function(recordIds){
                recordIdIndexPlaying = recordIdIndexPlaying + 1;
                playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying]);
            });
        }
    };

    // Stop playing video when user closes the video modal
    const closeModalButton = document.querySelector("button#closeModal");
    closeModalButton.onclick = function() {
        isVideoPlaying = false;
    }

}, false);

// Global variables
var isVideoPlaying = false;
var datasetPlaying = '';
var recordIdIndexPlaying = -1;
var recordIdsPlaying = [];
var pauseOnBadMistakeThreshold = 0.8
var state = {
    "human": {
        'angle': 0,
        'throttle': 0,
    },
    "ai":{
        'angle':0,
        'throttle':0,
        'angleAbsError':0,
        'throttleAbsError':0
    }
}
