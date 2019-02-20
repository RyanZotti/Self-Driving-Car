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

function getCheckedDatasets(){
    const rows = document.querySelectorAll("tbody#datasetsTbody > tr");
    const checkedDatasets = [];
    for (const row of rows){
        const dataset = row.getAttribute('dataset');
        const checkBox = row.querySelector("input.dataset-check-box");
        if (checkBox.checked == true){
            checkedDatasets.push(dataset);
        }
    }
    return checkedDatasets;
}

function unflagDataset(dataset) {
    return new Promise(function(resolve, reject) {
        deleteDatasetPayload = JSON.stringify({
            'dataset': dataset
        })
        $.post('/delete-flagged-dataset', deleteDatasetPayload, function(){
            resolve();
        });
    });
}

function deleteDataset(dataset) {
    return new Promise(function(resolve, reject) {
        deleteDatasetPayload = JSON.stringify({
            'dataset': dataset
        })
        $.post('/delete-dataset', deleteDatasetPayload, function(){
            resolve();
        });
    });
}

function startCarVideo() {
    return new Promise(function(resolve, reject) {
        $.post('/start-car-video', function(){
            resolve();
        });
    });
}

function stopCarVideo() {
    return new Promise(function(resolve, reject) {
        $.post('/stop-car-video', function(){
            resolve();
        });
    });
}

function videoHealthCheck() {
    return new Promise(function(resolve, reject) {
        $.post('/video-health-check', function(response){
            resolve(response['is_running']);
        });
    });
}

function addDatasetReviewRows() {
    const bulkActionRemoveFlagsButton = document.querySelector('button#remove-flags-bulk-action');
    bulkActionRemoveFlagsButton.onclick = async function(){
        const checkedDatasets = getCheckedDatasets();
        const promises = [];
        for (const dataset of checkedDatasets){
            promises.push(unflagDataset(dataset));
        }
        await Promise.all(promises);
        addDatasetReviewRows();
    }
    const bulkActionAnalyzeButton = document.querySelector('button#analyze-dataset-bulk-button');
    bulkActionAnalyzeButton.onclick = async function(){
        const checkedDatasets = getCheckedDatasets();
        const promises = [];
        for (const dataset of checkedDatasets){
            promises.push(batchPredict(dataset));
        }
        await Promise.all(promises);
        addDatasetReviewRows();
    }
    const tbody = document.querySelector("tbody#datasetsTbody");
    const existingRows = tbody.querySelectorAll("tr.dataset-row");
    for (const row of existingRows){
        row.parentNode.removeChild(row);
    }
    const promises = [
        getDatasetReviewRowString(),
        loadDatasetMetadata()
    ];
    Promise.all(promises).then(function(promiseResults){
        const datasetRowString = promiseResults[0];
        const datasetPromises = promiseResults[1];
        const datasetFlagPromises = promiseResults[2];
        for (const datsetPromise of datasetPromises) {
            const tr = htmlToElement(datasetRowString);
            datsetPromise.then(function(dataset){
                const datasetText = dataset.name;
                tr.setAttribute("dataset",datasetText);
                tr.querySelector('td.dataset-id').textContent = dataset.id;
                tr.querySelector('td.created-date').textContent = dataset.date;
                tr.querySelector('td.images').textContent = dataset.images;
                tr.querySelector('td.flagged').textContent = dataset.flags;
                tr.querySelector('td.dataset-error').textContent = dataset.error;
                tr.querySelector('td.dataset-critical-percent').textContent = dataset.criticalPercent;
                tr.querySelector('button.play-dataset-button').setAttribute("dataset",datasetText);
                tr.querySelector('button.delete-dataset-action').setAttribute("dataset",datasetText);
                const removeFlagsButton = tr.querySelector('button.remove-flags-action');
                removeFlagsButton.setAttribute("dataset",datasetText);
                removeFlagsButton.onclick = function (){
                    deleteDatasetPayload = JSON.stringify({
                        'dataset': datasetText
                    })
                    $.post('/delete-flagged-dataset', deleteDatasetPayload, function(){
                        // Update all rows to exclude the deleted dataset
                        addDatasetReviewRows();
                    });
                };
                const analyzeDatasetButton = tr.querySelector("button.analyze-dataset-button");
                analyzeDatasetButton.setAttribute("dataset",datasetText);
                analyzeDatasetButton.onclick = function() {
                    const dataset = this.getAttribute("dataset");
                    batchPredict(dataset);
                }
                const deleteDatasetButton = tr.querySelector('button.delete-dataset-action');
                deleteDatasetButton.onclick = function(){
                    const dataset = this.getAttribute("dataset");
                    deleteDataset(dataset);
                    addDatasetReviewRows(); // Refresh page
                }
                deleteDatasetButton.setAttribute("dataset",datasetText);
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
        const buttons = tbody.querySelectorAll("button.play-dataset-button");
        for (const button of buttons){
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
                    recordIdIndexPlaying = recordIdIndexPlaying + 1;
                    playVideo([datasetPlaying, recordIds, recordIdIndexPlaying, videoSessionId, cropFactor]);
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

function getDatasetRecordIdsFileSystem(datasetType, dataset) {
    return new Promise(function(resolve, reject){
        data = JSON.stringify({
            'dataset': dataset,
            'dataset_type':datasetType
        })
        $.post('/dataset-record-ids-filesystem', data, function(result){
            resolve(result.record_ids);
        });
    });
}

function listDatasets(){
    return new Promise(resolve => {
        $.get("/list-review-datasets",(response) => {
            resolve(response.datasets);
        });
    });
}

function listDatasetsFileSystem(){
    return new Promise(resolve => {
        $.get("/list-datasets-filesystem",(response) => {
            resolve(response.datasets);
        });
    });
}

function batchPredict(dataset){
    const data = JSON.stringify({
        'dataset': dataset
    });
    return new Promise(resolve => {
        $.post('/batch-predict', data, (response) => {
            resolve(response);
        });
    });
}

function startCar(){
    return new Promise(resolve => {
        $.post('/start-car', (response) => {
            resolve(response);
        });
    });
}

function isDatasetPredictionSyncing(dataset){
    const data = JSON.stringify({
        'dataset': dataset
    });
    return new Promise(resolve => {
        $.post('/is-dataset-prediction-syncing', data, (response) => {
            resolve(response['is_syncing']);
        });
    });
}

function datasetPredictionSyncPercent(dataset){
    const data = JSON.stringify({
        'dataset': dataset
    });
    return new Promise(resolve => {
        $.post('/dataset-prediction-sync-percent', data, (response) => {
            resolve(response['percent']);
        });
    });
}

// This migt not be necessary if I save all datasets
// incrementally as they're imported. I loop through
// each dataset's records in sequence because unleashing
// everything in parallel causes some records to be
// dropped in Chrome
async function saveAllRecordsToDB(){
    const datasets = await listDatasetsFileSystem();
    for (const dataset of datasets){
        const recordIds = await getDatasetRecordIdsFileSystem(
            'review',
            dataset
        );
        for (const recordId of recordIds){
            const data = JSON.stringify({
                'dataset': dataset,
                'record_id':recordId
            });
            await $.post('/save-reocord-to-db', data);
        }
    }
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

function updateImage(dataset, recordId, cropFactor) {
    const showCutImageButton = document.getElementById("show-cut-image");
    const videoFrame = document.querySelector("#mpeg-image")
    if (showCutImageButton.checked){
        const imageUrl = '/image?dataset='+dataset+'&record-id='+recordId+'&crop-factor='+cropFactor;
        videoFrame.setAttribute('src',imageUrl);
    } else {
        const imageUrl = '/image?dataset='+dataset+'&record-id='+recordId;
        videoFrame.setAttribute('src',imageUrl);
    }
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

function areDatasetPredictionsUpdated(dataset) {
    return new Promise(function(resolve, reject) {
        data = JSON.stringify({ 'dataset': dataset})
        $.post('/are-dataset-predictions-updated', data, function(result){
           resolve(result['is_up_to_date'])
        });
    });
}

async function checkPredictionUpdateStatuses(){
    const rows = document.querySelectorAll('tbody#datasetsTbody > tr')
    for (const row of rows){
        const dataset = row.getAttribute("dataset");
        const isUpdated = await areDatasetPredictionsUpdated(dataset);
        const analyzeDatasetButton = row.querySelector('button.analyze-dataset-button');
        const progressCircle = row.querySelector('svg.analyze-progress-circle');
        if (isUpdated == true){
            const errorMetrics = await getDatasetErrorMetrics(dataset);
            row.querySelector('td.dataset-error').textContent = errorMetrics['avg_abs_error'];
            row.querySelector('td.dataset-critical-percent').textContent = errorMetrics['critical_percent'];
            analyzeDatasetButton.style.display = 'none';
            progressCircle.style.display = 'block';
            updateProgressCircle(progressCircle,100);
        } else {
            const isSyncing = await isDatasetPredictionSyncing(dataset);
            if (isSyncing == true){
                const syncPercent = await datasetPredictionSyncPercent(dataset);
                updateProgressCircle(progressCircle,syncPercent);
                analyzeDatasetButton.style.display = 'none';
                progressCircle.style.display = 'block';
            } else {
                analyzeDatasetButton.style.display = 'block';
                progressCircle.style.display = 'none';
            }
        }
    }
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

function adjustSpeedBar(barId, speed){
    const speedBar = document.querySelector("div#"+barId);
    const speedPercent = (speed * 100).toFixed(2) + '%';
    speedBar.style.height = speedPercent;
}

async function playVideo(args) {
    const dataset = args[0];
    const recordIds = args[1];
    const recordIdIndex = args[2]
    const oldVideoSessionId = args[3]
    const cropFactor = args[4];
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
        updateImage(dataset, recordId, cropFactor);
        await updateDonut(donuts.ai,state.ai.angle);
        await updateDonut(donuts.human,state.human.angle);
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

        const showCutImage = document.getElementById("show-cut-image").checked;
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
            } else {
                recordIdIndexPlaying = recordIdIndex + 1;
                window.requestAnimationFrame(playVideo.bind(playVideo,[dataset, recordIds, recordIdIndexPlaying, oldVideoSessionId, cropFactor]));
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

function getDatasetReviewTableHtml() {
    return new Promise(function(resolve, reject) {
        $.get( "/datasets-review-table.html", function(datasetString) {
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
    $("#dataset-import").removeClass('active');
    $("#dataset-review").addClass('active');
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

function getNewDatasetName(){
    return new Promise(function(resolve, reject) {
        $.post('/new-dataset-name', function(result){
           resolve(result['name']);
        });
    });
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

function removeVideoSafely(){
    if (document.contains(document.getElementById("drive-mpeg-image"))) {
        document.querySelector("#drive-mpeg-image").remove();
    }
}

function showVideo(){
    removeVideoSafely();
    const videoImageContainer = document.querySelector('div#video-image-container');
    const videoImage = new Image();
    videoImage.src = "/video";
    videoImage.setAttribute("id","drive-mpeg-image");
    videoImageContainer.appendChild(videoImage);
    return videoImage
}

function rewindFrameIndex(){
    recordIdIndexPlaying = recordIdIndexPlaying - 15;
    recordIdIndexPlaying = Math.max(0,recordIdIndexPlaying);
}

function fastForwardFrameIndex(recordType){
    return new Promise(function(resolve, reject) {
        const data = JSON.stringify({
            'dataset': datasetPlaying,
            'dataset_type':recordType
        });
        $.post('/dataset-record-ids', data, function(response){
            const queriedRecordIds = response.record_ids;
            const sampleIndices = batchMatchRecordIdsToIndices(
                queriedRecordIds,
                recordIdsPlaying
            );
            const higherIndices = sampleIndices.filter(index => index > recordIdIndexPlaying);
            const nextFastForwardedRecordIndex = Array.min(higherIndices);
            recordIdIndexPlaying = nextFastForwardedRecordIndex;
            resolve(response.record_ids);
        });
    });
}

function applyBrake(){
    isBrakeOn = true;
    const applyBrakeColumn = document.querySelector('div#applyBrakeColumn');
    applyBrakeColumn.style.display = 'none';
    const releaseBrakeColumn = document.querySelector('div#releaseBrakeColumn');
    releaseBrakeColumn.style.display = 'inline';
    console.log('Is brake applied: '+isBrakeOn);
}

function releaseBrake(){
    isBrakeOn = false;
    const applyBrakeColumn = document.querySelector('div#applyBrakeColumn');
    applyBrakeColumn.style.display = 'inline';
    const releaseBrakeColumn = document.querySelector('div#releaseBrakeColumn');
    releaseBrakeColumn.style.display = 'none';
    console.log('Is brake applied: '+isBrakeOn);
}

function startRecording(){
    driveRecordOnColumn.style.display = 'none';
    driveRecordOffColumn.style.display = 'inline';
    isRecording = true;
    const recordingIndicatorLight = document.querySelector('span#recordingDotAndText');
    recordingIndicatorLight.style.display = 'inline';
}

function stopRecording(){
    driveRecordOnColumn.style.display = 'inline';
    driveRecordOffColumn.style.display = 'none';
    isRecording = false;
    const recordingIndicatorLight = document.querySelector('span#recordingDotAndText');
    recordingIndicatorLight.style.display = 'none';
}

function hideDriveButtonsRow(){
    const driveButtonsRow = document.querySelector('div#driveButtonsRow');
    driveButtonsRow.style.display = 'none';
}

function showDriveButtonsRow(){
    const driveButtonsRow = document.querySelector('div#driveButtonsRow');
    driveButtonsRow.style.display = 'flex';
}

async function makeNewDataset(){
    recordingDataset = await getNewDatasetName();
    recordingRecordId = 0;
}

document.addEventListener('DOMContentLoaded', function() {
    loadReviewDatasetsTable();
    // TODO: Replace with plain javascript instead of jquery
    $("#dataset-review").click(function(){
        $("#dataset-import").removeClass('active');
        $("#dataset-review").addClass('active');
        loadReviewDatasetsTable();
    });
    updateDatasetsCountBadge('review');
    $("#dataset-import").click(function(){
        $("#dataset-review").removeClass('active');
        $("#dataset-import").addClass('active');
        loadImportDatasetsTable();
    });
    updateDatasetsCountBadge('import');

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
        recordIdIndexPlaying = recordIdIndexPlaying + 1;
        playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId, cropFactor]);

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
        playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId, cropFactor]);

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
                playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId, cropFactor]);
            });
        }
    };

    // Stop playing video when user closes the video modal
    const closeModalButton = document.querySelector("button#closeModal");
    closeModalButton.onclick = function() {
        isVideoPlaying = false;
        addDatasetReviewRows();
    }

    const rewindButton = document.querySelector("span#rewind");
    rewindButton.onclick = function(){
        rewindFrameIndex();
        videoSessionId = Date.now();
        playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId, cropFactor]);
    }

    const fastForwardFlagButton = document.querySelector("span#fastForwardFlag");
    fastForwardFlagButton.onclick = async function(){
        const recordType = "flagged";
        await fastForwardFrameIndex(recordType);
        videoSessionId = Date.now();
        playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId, cropFactor]);
    }

    const fastForwardCriticalErrorButton = document.querySelector("button#fastForwardCriticalError");
    fastForwardCriticalErrorButton.onclick = async function(){
        const recordType = "critical-errors";
        await fastForwardFrameIndex(recordType);
        videoSessionId = Date.now();
        playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId, cropFactor]);
    }


    const showCutImageButton = document.getElementById("show-cut-image");
    showCutImageButton.onclick = function(){
        const recordId = updateRecordId(recordIdsPlaying, recordIdIndexPlaying);
        updateImage(datasetPlaying, recordId, cropFactor);
    }

    const driveVehicleButton = document.getElementById("drive-vehicle-button");
    driveVehicleButton.onclick = async function(){
        await makeNewDataset();
        const datasetId = await getDatasetIdFromDataset(recordingDataset);
        const driveVehicleHeaderDatasetId = document.querySelector('span#driveVehicleHeaderDatasetId')
        driveVehicleHeaderDatasetId.textContent = datasetId;
        startCarVideo();
        const videoHeathCheckLoop = setInterval(async function(){
            const isHealthy = await videoHealthCheck();
            if(isHealthy == true){
                clearInterval(videoHeathCheckLoop);
                const videoImage = showVideo();
                videoImage.onload = function(){
                    const videoSpinner = document.querySelector("div#video-loader");
                    videoSpinner.style.display = 'none';
                    const metricsHeader = document.querySelector('div#drive-metrics-header');
                    const metricsGraphics = document.querySelector('div#drive-metrics-graphics');
                    const metricsText = document.querySelector('div#drive-metrics-text');
                    metricsHeader.style.display = 'flex';
                    metricsGraphics.style.display = 'flex';
                    metricsText.style.display = 'flex';
                    showDriveButtonsRow();
                }
            }
        }, 1000);
        // Check if device supports orientation (ie is a phone vs laptop)
        if (window.DeviceOrientationEvent) {
            window.addEventListener("deviceorientation", captureDeviceOrientation);
        }
    }

    const driveVehicleCloseButton = document.getElementById("closeDriveVehicleModal");
    driveVehicleCloseButton.onclick = function(){
        removeVideoSafely();
        stopCarVideo();
        initialBeta = null;
        const videoSpinner = document.querySelector("div#video-loader");
        videoSpinner.style.display = 'block';
        if (window.DeviceOrientationEvent) {
            window.removeEventListener("deviceorientation", captureDeviceOrientation);
        }
        const metricsHeader = document.querySelector('div#drive-metrics-header');
        const metricsGraphics = document.querySelector('div#drive-metrics-graphics');
        const metricsText = document.querySelector('div#drive-metrics-text');
        metricsHeader.style.display = 'none';
        metricsGraphics.style.display = 'none';
        metricsText.style.display = 'none';
        // Assume user wants to stop recording when drive modal is closed
        driveRecordOnColumn.style.display = 'inline';
        driveRecordOffColumn.style.display = 'none';
        isRecording = false;
        // Reset brake to off for when the modal opens next time
        applyBrake();
        hideDriveButtonsRow();
    }

    const trainingStateTimer = setInterval(function(){
      checkPredictionUpdateStatuses()
    }, 1000);

    // Update Raspberry Pi statues
    const piHealthCheckTime = setInterval(function(){
        updatePiConnectionStatuses()
    }, 1000);

    /*
    I think I can only get device orientation from an orientation
    change event, which means that I can't directly check it from
    this onclick event. That means the onclick can only indirectly
    reset the initialBeta. The captureDeviceOrientation() function
    in drive.js assigns a new value if it sees that initialBeta is
    null, so here I just set initialBeta to null so that it gets
    reset elsewhere
    */
    const resetDeviceOrientationButton = document.querySelector('span#resetDeviceOrientation');
    resetDeviceOrientationButton.onclick = function(){
        initialBeta = null;
    }

    /*
    These are global variables but need to be defined here
    or else you'll get undefined errors for makeDonut
    */
    donuts.ai = makeDonut('aiAngleDonut');
    donuts.human = makeDonut('humanAngleDonut');
    donuts.drive = makeDonut('driveHumanAngleDonut');

    const driveRecordOnColumn = document.querySelector('div#driveRecordOnColumn');
    const driveRecordOnButton = document.querySelector('span#driveRecordOnButton');
    const driveRecordOffColumn = document.querySelector('div#driveRecordOffColumn');
    const driveRecordOffButton = document.querySelector('span#driveRecordOffButton');
    driveRecordOnButton.onclick = function(){
        startRecording();
        /*
        Assume that the user wants to drive when they're
        recording
        */
        releaseBrake();
    }
    driveRecordOffButton.onclick = function(){
        stopRecording();
        /*
        Assume that the user generally stops recording
        when stop has gone wrong and the car needs
        to stop
        */
        applyBrake();
    }

    const applyBrakeButton = document.querySelector("span#applyBrakeButton");
    applyBrakeButton.onclick = function(){
        applyBrake();
        /*
        Assume that the user generally stops recording
        when stop has gone wrong and the car needs
        to stop
        */
        stopRecording();
    }

    const releaseBrakeButton = document.querySelector("span#releaseBrakeButton");
    releaseBrakeButton.onclick = function(){
        releaseBrake();
    }

    const makeNewDatasetButton = document.querySelector('span#makeNewDatasetButton');
    makeNewDatasetButton.onclick = async function(){
        await makeNewDataset();
        console.log(recordingDataset);
    }

}, false);

// Global variables
var cropFactor = 2;
var videoSessionId = -1;
var isVideoPlaying = false;
var datasetPlaying = '';
var dadtasetIdPlaying = '';
var recordIdIndexPlaying = -1;
var recordIdsPlaying = [];
var pauseOnBadMistakeThreshold = 0.8;
var recordingDataset = '';
var recordingRecordId = 0;
var isRecording = false
var isBrakeOn = true
var speedMultiplier = 1.0
var driveMode = 'user'
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

/*
Need these donuts to be set in the DOMContentLoaded
but available outside of that scope
*/
var donuts = {
    "ai":null,
    'human':null,
    'drive':null
}
