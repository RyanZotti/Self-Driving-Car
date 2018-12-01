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
        const tbody = document.querySelector("tbody#datasetsTbody");
        for (datsetPromise of datasetPromises) {
            const tr = htmlToElement(datasetRowString);
            datsetPromise.then(function(dataset){
                const datasetText = dataset.name;
                tr.querySelector('td.dataset-id').textContent = dataset.id;
                tr.querySelector('td.created-date').textContent = dataset.date;
                tr.querySelector('td.images').textContent = dataset.images;
                tr.querySelector('span.download-dataset-button').setAttribute("dataset",datasetText);
                tr.querySelector('button.trash-dataset-button').setAttribute("dataset",datasetText);
                const input = tr.querySelector('input[name="datasetsSelect"]');
                input.setAttribute('id','dataset-id-'+dataset.id);
                const label = tr.querySelector('label[name="datasetsSelect"]');
                label.setAttribute('for','dataset-id-'+dataset.id);
                tbody.appendChild(tr);
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
        const datasetFlagPromises = promiseResults[2];
        const tbody = document.querySelector("tbody#datasetsTbody");
        for (datsetPromise of datasetPromises) {
            const tr = htmlToElement(datasetRowString);
            datsetPromise.then(function(dataset){
                const datasetText = dataset.name;
                tr.querySelector('td.dataset-id').textContent = dataset.id;
                tr.querySelector('td.created-date').textContent = dataset.date;
                tr.querySelector('td.images').textContent = dataset.images;
                tr.querySelector('td.flagged').textContent = dataset.flags;
                tr.querySelector('button.play-dataset-button').setAttribute("dataset",datasetText);
                tr.querySelector('button.trash-dataset-button').setAttribute("dataset",datasetText);
                const input = tr.querySelector('input[name="datasetsSelect"]');
                input.setAttribute('id','dataset-id-'+dataset.id);
                const label = tr.querySelector('label[name="datasetsSelect"]');
                label.setAttribute('for','dataset-id-'+dataset.id);
                tbody.appendChild(tr);
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
                datasetIdPlaying = datasetNameToId(dataset);
                const datasetType = getActiveDatasetType();
                getDatasetRecordIds("review", dataset).then(function(recordIds){
                    recordIdIndexPlaying = 0;
                    playVideo([dataset, recordIds, recordIdIndexPlaying, videoSessionId]);
                });
                const modalHeaderDatasetId = document.getElementById("playModalHeaderDatasetId");
                modalHeaderDatasetId.innerHTML = datasetIdPlaying;
                const modalHeaderRecordId = document.getElementById("playModalHeaderRecordId");
                modalHeaderRecordId.innerHTML = recordIdsPlaying[recordIdIndexPlaying];
            }
        }
    });
}

function getDatasetRecordIds(datasetType, dataset) {
    return new Promise(function(resolve, reject){
        data = JSON.stringify({
            'dataset': dataset,
            'dataset_type':datasetType
        })
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

function setModalFlagColor(color){

}

async function playVideo(args) {
    const dataset = args[0];
    const recordIds = args[1];
    const recordIdIndex = args[2]
    const oldVideoSessionId = args[3]
    const recordId = updateRecordId(recordIds, recordIdIndexPlaying);
    const modalHeaderDatasetId = document.getElementById("playModalHeaderDatasetId");
    modalHeaderDatasetId.innerHTML = datasetIdPlaying;
    const modalHeaderRecordId = document.getElementById("playModalHeaderRecordId");
    modalHeaderRecordId.innerHTML = recordId;

    const percentComplete = ((recordIdIndex / recordIds.length) * 100).toFixed(2) + '%';
    const videoModalProgressBar = document.getElementById("videoModalProgressBar");
    videoModalProgressBar.style.setProperty("width", percentComplete);

    if (recordIdIndexPlaying < recordIds.length){
        await updateAiAndHumanLabelValues(dataset, recordId);
        const isFlaggedIcon = document.getElementById("isFlagged");
        /*
        Turns out that the 'checked' status of this button is
        unreliable because I was modifying via standard html
        behavior with my click but also with my playVideo
        javascript and I *think* there was some sort of race
        condition. Anyways, I'm keeping it in only because it's
        helpful to see how to add an SVG label to a button. I
        don't actually use its 'checked' status any more though
        */
        const isFlaggedButton = document.getElementById("isFlaggedCheckBox");
        const isRecordIdFlagged = await isRecordAlreadyFlagged(dataset,recordId);
        if (isRecordIdFlagged == true){
            isFlaggedIcon.style.fill='#E53757';
            isFlaggedButton.checked = true;
        } else {
            isFlaggedIcon.style.fill='None';
            isFlaggedButton.checked = false;
        }
        updateImage(dataset, recordId);
        await adjustAngleDonut('aiAngleDonut',state.ai.angle);
        await adjustAngleDonut('humanAngleDonut',state.human.angle);
        /*
        Technically the error could go to 200%, but it rarely
        does, so I cap at 100% to get better visual feedback
        from the error bar
        */
        const errorBar = document.querySelector("div#errorBar");
        const rawErrorPercent = Math.min((state.ai.angleAbsError * 100),100);
        if (rawErrorPercent <= 80){
            errorBar.style.backgroundColor = "#2c7be5";
        } else {
            errorBar.style.backgroundColor = "#E43757";
        }
        const errorPercent = rawErrorPercent.toFixed(2) + '%';
        errorBar.style.height = errorPercent;
        const speedBar = document.querySelector("div#speedBar");
        const speedPercent = (state.human.throttle * 100).toFixed(2) + '%';
        speedBar.style.height = speedPercent;

        const speedText = document.querySelector("div#speedText");
        const humanSteeringText = document.querySelector("div#humanSteeringText");
        const aiSteeringText = document.querySelector("div#aiSteeringText");
        const errorText = document.querySelector("div#errorText");

        speedText.textContent = (state.human.throttle * 100).toFixed(0) + '%';
        humanSteeringText.textContent = (state.human.angle * 100).toFixed(0) + '%';
        aiSteeringText.textContent = (state.ai.angle * 100).toFixed(0) + '%';
        // Use `rawErrorPercent` if you don't want values above 100%
        errorText.textContent = (state.ai.angleAbsError * 100).toFixed(0) + '%';

        const pauseOnBadMistake = document.getElementById("pauseOnMistakeToggle").checked;
        const isMistakeBad = state.ai.angleAbsError > pauseOnBadMistakeThreshold;
        if (isVideoPlaying == true){
            if (oldVideoSessionId != videoSessionId){
                /*
                If the code reaches this point it means that I've hit
                the rewind button and there now multiple video sessions
                going and this is an old session. Since this function is
                recursive I can kill the session by not making the
                function call itself again. I don't want to set the stop
                variable though because I don't want to halt all of the
                sessions, just the old ones. I am deliberately doing
                nothing here
                */
            } else if (pauseOnBadMistake && isMistakeBad){
                isVideoPlaying = false;
                const modalPlayPauseButton = document.querySelector("img#modalPlayPauseButton");
                modalPlayPauseButton.removeAttribute("src");
                modalPlayPauseButton.setAttribute("src","assets/img/icons/play.svg");
            } else {
                recordIdIndexPlaying = recordIdIndex + 1;
                window.requestAnimationFrame(playVideo.bind(playVideo,[dataset, recordIds, recordIdIndexPlaying, oldVideoSessionId]));
            }
        }
    } else {
        isVideoPlaying = false;
        const closeModalButton = document.querySelector('button#closeModal');
        closeModalButton.click();
    }

    // Set global variables in case of play and then resume
    datasetPlaying = dataset;
    datasetIdPlaying = datasetNameToId(dataset);
    recordIdsPlaying = recordIds;
}

function addDatasetMistakeRows() {
    const promises = [
        getDatasetMistakeRowString(),
        loadMistakeDatasetMetadata()
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
                tr.querySelector('td.created-date').textContent = dataset.date;
                tr.querySelector('td.images').textContent = dataset.images;
                tr.querySelector('button.play-dataset-button').setAttribute("dataset",datasetText);
                tr.querySelector('button.trash-dataset-button').setAttribute("dataset",datasetText);
                const input = tr.querySelector('input[name="datasetsSelect"]');
                input.setAttribute('id','dataset-id-'+dataset.id);
                const label = tr.querySelector('label[name="datasetsSelect"]');
                label.setAttribute('for','dataset-id-'+dataset.id);
                tbody.appendChild(tr);
            });
        }
    });
}

function loadMistakeDatasetMetadata() {
    return new Promise(function(resolveLoad, reject) {
        $.get( "/list-mistake-datasets").then(function(response){
            return response.datasets;
        }).then(function(datasets){
            let allMetadata = datasets.map(function (dataset) {
                return new Promise(function (resolve) {
                  resolve(getDatasetMetadata("mistake",dataset));
                });
            });
            Promise.all(allMetadata).then(function() {
                resolveLoad(allMetadata);
            });
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

/*
Normally this event trigger should be defined where all of the
other "on change" triggers are, in the global scope, but because
I add/remove the datasets table on the fly, depending on the type
of dataset workflow (import, review, mistake), the event trigger
gets overwritten and needs to be added again each time the table
is added
*/
function selectAllDatasetsTrigger(){
    const selectAllDatasetsButton = document.querySelector("input#datasetsSelectAll");
    selectAllDatasetsButton.onchange = function() {
        var buttons = document.querySelectorAll('input[name="datasetsSelect"]');
        for (let button of buttons){
            button.checked = selectAllDatasetsButton.checked;
        }
    };
};

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
    }).then(function(){
        selectAllDatasetsTrigger();
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
    }).then(function(){
        selectAllDatasetsTrigger();
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
    }).then(function(){
        selectAllDatasetsTrigger();
    });
}

function datasetNameToId(datasetName){
    /*
    Javascript doesn't yet support positive lookbehind
    and this caused an nothing to load on iOS Safari
    and my Mac
    */
    const datasetNameScrubbed = datasetName.replace("dataset_", "");
    const regex = /([0-9]*)(?=_)/g;
    const datasetId = datasetNameScrubbed.match(regex)[0];
    return datasetId
}

function updateDatasetsCountBadge(datasetType){
    $.get( "/list-"+datasetType+"-datasets").then(function(response){
        return response.datasets;
    }).then(function(datasets){
        const badge = document.querySelector("a#dataset-"+datasetType+" > span");
        badge.innerText = datasets.length;
    });
}

function getActiveDatasetType(){
    const datasetTypes = ["import","review","mistake"];
    for (let datasetType of datasetTypes){
        const badge = document.querySelector("a#dataset-"+datasetType);
        if(badge.classList.contains("active")){
            return datasetType
        }
    }
}

function isRecordAlreadyFlagged(dataset, recordId){
    return new Promise(function(resolve, reject) {
        data = JSON.stringify({
            'dataset': dataset,
            'record_id':recordId
        })
        $.post('/is-record-already-flagged', data, function(result){
           resolve(result['is_already_flagged']);
        }).then(function(result){
            return result;
        });
    });
}

Array.min = function(array){
    return Math.min.apply( Math, array );
};

function batchMatchRecordIdsToIndices(sample, population){
    var sampleIndex = 0;
    var sampleIndices = [];
    for (var populationIndex = 0; populationIndex < population.length; populationIndex++){
        const populationRecord = population[populationIndex];
        if (sampleIndex >= sample.length){
            break;
        }
        const sampleRecord = sample[sampleIndex];
        if (sampleRecord == populationRecord){
            sampleIndices.push(populationIndex);
            sampleIndex = sampleIndex + 1;
        }
    }
    return sampleIndices;
}

function rewindFrameIndex(){
    recordIdIndexPlaying = recordIdIndexPlaying - 15;
    recordIdIndexPlaying = Math.max(0,recordIdIndexPlaying);
}

function fastForwardFrameIndexToNextFlag(){
    return new Promise(function(resolve, reject) {
        const data = JSON.stringify({
            'dataset': datasetPlaying,
            'dataset_type':'mistake'
        });
        $.post('/dataset-record-ids', data, function(response){
            const flaggedRecordIds = response.record_ids;
            const sampleIndices = batchMatchRecordIdsToIndices(
                flaggedRecordIds,
                recordIdsPlaying
            );
            const higherIndices = sampleIndices.filter(index => index > recordIdIndexPlaying);
            const nextFlaggedRecordIndex = Array.min(higherIndices);
            recordIdIndexPlaying = nextFlaggedRecordIndex;
            resolve(response.record_ids);
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    loadImportDatasetsTable();
    // TODO: Replace with plain javascript instead of jquery
    $("#dataset-review").click(function(){
        $("#dataset-import").removeClass('active');
        $("#dataset-mistake").removeClass('active');
        $("#dataset-review").addClass('active');
        loadReviewDatasetsTable();
    });
    updateDatasetsCountBadge('review');
    $("#dataset-import").click(function(){
        $("#dataset-review").removeClass('active');
        $("#dataset-mistake").removeClass('active');
        $("#dataset-import").addClass('active');
        loadImportDatasetsTable();
    });
    updateDatasetsCountBadge('import');
    $("#dataset-mistake").click(function(){
        $("#dataset-import").removeClass('active');
        $("#dataset-review").removeClass('active');
        $("#dataset-mistake").addClass('active');
        loadMistakeDatasetsTable();
    });
    updateDatasetsCountBadge('mistake');

    $('#modalTrashButton').click(async function () {
        const recordId = recordIdsPlaying[recordIdIndexPlaying];
        data = JSON.stringify({'dataset': datasetPlaying, 'record_id': recordId})
        $.post('/delete', data);
        const isRecordIdFlagged = await isRecordAlreadyFlagged(datasetPlaying,recordId);
        if (isRecordIdFlagged == true){
            $.post('/delete-flagged-record', data);
        }
        recordIdIndexPlaying = recordIdIndexPlaying + 1;
        videoSessionId = Date.now();
        playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId]);
    });

    const flagButton = document.querySelector("#isFlagged");
    flagButton.onclick = async function () {

        /*
        Turns out that the 'checked' status of this button is
        unreliable because I was modifying via standard html
        behavior with my click but also with my playVideo
        javascript and I *think* there was some sort of race
        condition. Anyways, I'm keeping it in only because it's
        helpful to see how to add an SVG label to a button. I
        don't actually use its 'checked' status any more though
        */
        const isFlaggedButton = document.getElementById("isFlaggedCheckBox");

        const recordId = recordIdsPlaying[recordIdIndexPlaying];
        data = JSON.stringify({'dataset': datasetPlaying, 'record_id': recordId});
        const isFlaggedIcon = document.getElementById("isFlagged");
        const isPreviouslyRecordIdFlagged = await isRecordAlreadyFlagged(datasetPlaying,recordId);
        if (isPreviouslyRecordIdFlagged == true){
            isFlaggedIcon.style.fill='None';
            isFlaggedButton.checked = false;
            $.post('/delete-flagged-record', data);
        } else {
            isFlaggedIcon.style.fill='#E53757';
            isFlaggedButton.checked = true;
            $.post('/add-flagged-record', data);
        }
        recordIdIndexPlaying = recordIdIndexPlaying + 1;
        playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId]);
    };

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
            const datasetType = getActiveDatasetType();
            getDatasetRecordIds(datasetType, datasetPlaying).then(function(recordIds){
                recordIdIndexPlaying = recordIdIndexPlaying + 1;
                playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId]);
            });
        }
    };

    // Stop playing video when user closes the video modal
    const closeModalButton = document.querySelector("button#closeModal");
    closeModalButton.onclick = function() {
        isVideoPlaying = false;
    }

    const rewindButton = document.querySelector("span#rewind");
    rewindButton.onclick = function(){
        rewindFrameIndex();
        videoSessionId = Date.now();
        playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId]);
    }

    const fastForwardFlagButton = document.querySelector("span#fastForwardFlag");
    fastForwardFlagButton.onclick = async function(){
        await fastForwardFrameIndexToNextFlag();
        videoSessionId = Date.now();
        playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId]);
    }

}, false);

// Global variables
var videoSessionId = -1;
var isVideoPlaying = false;
var datasetPlaying = '';
var dadtasetIdPlaying = '';
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
