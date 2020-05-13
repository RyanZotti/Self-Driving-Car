function getDatasetTransferProgress(dataset_name) {
    /*
    Used to report the completion percentage when transferring
    a dataset from the Pi to the laptop. 0% means that no files
    have been transferred. 50% means that the SFTP step has
    completed. 100% means that the SFTP has completed and the
    DB load has also completed

    Parameters
    ----------
    dataset_name : string
        Ex: dataset_3_18-10-20

    Returns
    -------
    percent: int
        Percent complete
    */
    return new Promise(function(resolve, reject) {
        inputPayload = JSON.stringify({
            'dataset': dataset_name
        });
        $.post('/transfer-dataset-progress', inputPayload, function(result){
            resolve(result['percent']);
        });
    });
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

function getDatasetImpotRows() {
    return new Promise(function(resolve, reject) {
        $.get( "/list-import-datasets", function(result) {
            resolve(result['records']);
        });
    });
}

async function addDatasetImportRows(){

    if (getActiveDatasetType() == 'import'){
        const datasetRowString = await getDatasetImportRowString();
        const tbody = document.querySelector("tbody#datasetsTbody");
        const records = await getDatasetImpotRows();
        for (let record of records){
            const datasetText = record.dataset;

            // Only add row if it doesn't exist
            const rowId = 'import-row-'+record.dataset;
            const row = document.getElementById(rowId);
            if (row == null){
                const tr = htmlToElement(datasetRowString);
                tr.id = rowId;
                tr.setAttribute("dataset",datasetText);
                tr.querySelector('td.dataset-id').textContent = record.id;
                tr.querySelector('td.created-date').textContent = record.date;
                tr.querySelector('td.images').textContent = record.count;
                const downloadButton = tr.querySelector('button.download-dataset-button');
                downloadButton.setAttribute("dataset",datasetText);
                downloadButton.addEventListener("click", async function(){
                    downloadButton.style.display = 'none';
                    const progressCircle = tr.querySelector('svg.import-progress-circle');
                    progressCircle.style.display = 'inline';
                    const progressPercent = 0;
                    updateProgressCircle(progressCircle, progressPercent);
                    transferDataset(datasetText);

                    /*
                    Protect the progress circle from briefly reverting back to
                    the button if there is a race condition with the timer that
                    updates rows and resets the circle and button states. The
                    clickTime attribute is checked in the timer
                    */
                    const clickTime = new Date().getTime();
                    downloadButton.setAttribute("clickTime",clickTime);
                });
                tr.querySelector('button.delete-dataset-button').setAttribute("dataset",datasetText);
                const input = tr.querySelector('input[name="datasetsSelect"]');
                input.setAttribute('id','dataset-id-'+record.id);
                const label = tr.querySelector('label[name="datasetsSelect"]');
                label.setAttribute('for','dataset-id-'+record.id);
                tbody.appendChild(tr);
                const deleteDatasetButton = tr.querySelector('button.delete-dataset-button');
                deleteDatasetButton.onclick = async function(){
                    const dataset = this.getAttribute("dataset");

                    /*
                    This fixes a super annoying sporadic bug where sometimes I
                    would delete a dataset's row only for it to reappear shortly
                    after. I realized that this happened because the
                    importProgressTimer interval runs every second and calls
                    addDatasetImportRows, which adds back rows if they don't
                    exist. So basically there is a race condition. My workaround
                    is to take advantage of the interval's cadence of 1000 ms. I
                    first hide the dataset so that it looks deleted to the user,
                    then I call the delete API so that future addDatasetImportRows
                    calls won't pick up the dataset, and then I wait a little over
                    a full cadence, 1500 ms, before I delete the tr html element
                    */
                    tr.style.display = 'none';
                    await deleteDataset("pi", dataset);
                    await sleep(1500);
                    tr.parentNode.removeChild(tr);
                }
            } else {
                // The only thing that should change from time to time is the import progress
                const importDatasetButton = row.querySelector('button.download-dataset-button');
                const progressCircle = row.querySelector('svg.import-progress-circle');
                percent = record.percent
                if (percent < 0){
                    if(importDatasetButton.hasAttribute('clickTime')){
                        const nowTime = new Date().getTime()
                        const clickTime = importDatasetButton.getAttribute('clickTime');
                        const secondsDiff = (nowTime - clickTime) / 1000;
                        if (secondsDiff > 10){
                            /*
                            If you clicked the button and don't see progress for a long time,
                            that means the import job probably failed. This should never happen,
                            but if it does, hopefully it's sporadic, so showing the download
                            button again after a long time allows you to retry the job
                            */
                            progressCircle.style.display = 'none';
                            importDatasetButton.style.display = 'inline';
                        }
                    } else {
                        /*
                        If the button doesn't have record of when it was last
                        clicked, then we can assume it was never clicked, in
                        which case it's ok to show the clickable button
                        */
                        progressCircle.style.display = 'none';
                        importDatasetButton.style.display = 'inline';
                    }

                } else {
                    importDatasetButton.style.display = 'none';
                    progressCircle.style.display = 'inline';
                    updateProgressCircle(progressCircle, percent);
                }
                /*
                Make sure the Pi's record count gets updated periodically, since
                the number of records can change while you're recording a live new
                dataset
                */
                row.querySelector('td.images').textContent = record.count;
            }
        }
    }
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

function deleteDataset(machine_type, dataset) {
    // machine_type: "laptop" or "pi"
    return new Promise(function(resolve, reject) {
        deleteDatasetPayload = JSON.stringify({
            'dataset': dataset
        })
        $.post('/delete-'+machine_type+'-dataset', deleteDatasetPayload, function(){
            resolve();
        });
    });
}

async function addDatasetReviewRows() {
    await refreshRecordReader();
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
        loadDatasetMetadata("review")
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
                //tr.querySelector('td.dataset-error').textContent = dataset.error;
                //tr.querySelector('td.dataset-critical-percent').textContent = dataset.criticalPercent;
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

                    // Acknowledge the user clicked the button
                    const progressCircle = tr.querySelector('svg.analyze-progress-circle');
                    updateProgressCircle(progressCircle,0);
                    analyzeDatasetButton.style.display = 'none';
                    progressCircle.style.display = 'block';

                    /*
                    Protect the progress circle from briefly reverting back to
                    the button if there is a race condition with the timer that
                    updates rows and resets the circle and button states. The
                    clickTime attribute is checked in the timer
                    */
                    const dataset = this.getAttribute("dataset");
                    const clickTime = new Date().getTime();
                    analyzeDatasetButton.setAttribute("clickTime",clickTime);

                    // Start the analyze job
                    batchPredict(dataset);
                }
                const deleteDatasetButton = tr.querySelector('button.delete-dataset-action');
                deleteDatasetButton.onclick = function(){
                    const dataset = this.getAttribute("dataset");
                    deleteDataset("laptop",dataset);
                    tr.parentNode.removeChild(tr);
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
            button.onclick = async function() {
                const modalPlayPauseButton = document.querySelector("img#modalPlayPauseButton");
                // Ensure that video starts playing when modal first opens
                modalPlayPauseButton.removeAttribute("src");
                modalPlayPauseButton.setAttribute("src","assets/img/icons/pause.svg");
                isVideoPlaying = true; // set global variable in case of pause and then resume
                const dataset = this.getAttribute('dataset');
                datasetPlaying = dataset; // set global variable in case of pause and then resume
                datasetIdPlaying = datasetNameToId(dataset);
                const datasetType = getActiveDatasetType();
                getDatasetRecordIds("review", dataset).then(async function(recordIds){
                    recordIdIndexPlaying = 0;
                    recordIdIndexPlaying = recordIdIndexPlaying + 1;

                    /*
                    Check if the Docker container model is healthy. If not, set global
                    variable to tell modal UI window not to show model related stats
                    */
                    isLaptopDockerModelHealthy = await getLaptopModelApiHealth()
                    const errorAmount = document.querySelector('div#errorText');
                    const aiSterringAmount = document.querySelector('div#aiSteeringText');
                    const errorBarCol = document.querySelector('div#errorBarCol');
                    const aiAngleDonutCol = document.querySelector('div#aiAngleDonutCol');
                    const modalHeaderTextModel = document.querySelector('div#modal-header-text-ai');
                    const modalHeaderTextError = document.querySelector('div#modal-header-text-error');
                    // Hide by default
                    errorAmount.style.display = "none";
                    aiSterringAmount.style.display = "none";
                    errorBarCol.style.display = "none";
                    aiAngleDonutCol.style.display = "none";
                    modalHeaderTextModel.style.display = "none";
                    modalHeaderTextError.style.display = "none";
                    if (isLaptopDockerModelHealthy == true){
                        // Show model stats
                        errorAmount.style.display = "block";
                        aiSterringAmount.style.display = "block";
                        errorBarCol.style.display = "block";
                        aiAngleDonutCol.style.display = "block";
                        modalHeaderTextModel.style.display = "block";
                        modalHeaderTextError.style.display = "block";
                    }

                    playVideo([datasetPlaying, recordIds, recordIdIndexPlaying, videoSessionId, cropPercent]);
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

function updateImage(dataset, recordId, cropPercent, scaleFactor) {
    const showEffectsButton = document.getElementById("show-effects");
    const videoFrame = document.querySelector("#mpeg-image")
    if (showEffectsButton.checked){
        const imageUrl = '/image?dataset='+dataset+'&record-id='+recordId+'&crop-percent='+cropPercent+'&scale-factor='+scaleFactor;
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

function getLaptopModelApiHealth() {
    /*
    Used to check if the laptop model API Docker container is alive, so
    that if it's not I don't show messed up model speed and angle. This
    happens when you haven't yet trained a model.
    */
    return new Promise(function(resolve, reject) {
        $.get('/laptop-model-api-health', function(result){
           resolve(result['is_healthy'])
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

async function checkAllDatasetsImportProgress(){
    if (getActiveDatasetType() == 'import'){
        const rows = document.querySelectorAll('tbody#datasetsTbody > tr');
        for (const row of rows){
            const dataset = row.getAttribute("dataset");
            const percent = await getDatasetTransferProgress(dataset);
            const importDatasetButton = row.querySelector('button.download-dataset-button');
            const progressCircle = row.querySelector('svg.import-progress-circle');
            if (percent < 0){
                progressCircle.style.display = 'none';
                importDatasetButton.style.display = 'inline';
            } else {
                importDatasetButton.style.display = 'none';
                progressCircle.style.display = 'inline';
                updateProgressCircle(progressCircle, percent);
            }
        }
    }
}

function getPredictionUpdateStatusesBulk(){
    return new Promise(resolve => {
        $.get("/get-dataset-prediction-update-statuses",(response) => {
            const dict = {};
            for (const row of response.rows){
                const dataset = row['dataset'];
                dict[dataset] = row;
            }
            resolve(dict);
        });
    });
}

async function refreshPredictionUpdateStatusesBulk(){
    /*
    This is supposed to be the much faster (more efficient) version
    of checkPredictionUpdateStatuses() that gets data for all datasets
    at once instead of making a separate call for each, which leads to
    terrible performance as the number of datasets grows
    */
    if (getActiveDatasetType() == 'review'){
        const results = await getPredictionUpdateStatusesBulk();
        const rows = document.querySelectorAll('tbody#datasetsTbody > tr');
        for (const row of rows){
            const dataset = row.getAttribute("dataset");
            const isUpdated = results[dataset]['is_up_to_date'];
            const analyzeDatasetButton = row.querySelector('button.analyze-dataset-button');
            const progressCircle = row.querySelector('svg.analyze-progress-circle');
            if (isUpdated == true){
                row.querySelector('td.dataset-error').textContent = results[dataset]['avg_abs_error'].toFixed(2);
                row.querySelector('td.dataset-critical-percent').textContent = results[dataset]['critical_percent'].toFixed(2);
                row.querySelector('td.dataset-critical-percent').textContent = results[dataset]['critical_percent'].toFixed(2);
                analyzeDatasetButton.style.display = 'none';
                progressCircle.style.display = 'block';
                updateProgressCircle(progressCircle,100);
            } else {
                const isSyncing = results[dataset]['is_syncing'];
                if (isSyncing == true){
                    const syncPercent = results[dataset]['completion_percent'];
                    updateProgressCircle(progressCircle,syncPercent);
                    analyzeDatasetButton.style.display = 'none';
                    progressCircle.style.display = 'block';
                } else {
                    if(analyzeDatasetButton.hasAttribute('clickTime')){
                        const nowTime = new Date().getTime()
                        const clickTime = analyzeDatasetButton.getAttribute('clickTime');
                        const secondsDiff = (nowTime - clickTime) / 1000;
                        if (secondsDiff > 10){
                            /*
                            If the analyze button was clicked but the dataset is neither
                            in progress nor completed, then there was clearly a bug.
                            Hopefully the bug is temporary, and if you show the button
                            again the user will be able to restart the analyze job
                            */
                            analyzeDatasetButton.style.display = 'block';
                            progressCircle.style.display = 'none';
                        }
                    } else {
                        /*
                        Shows the analyze dataset button on startup. If you take
                        away these lines the datasets that haven't been analyzed
                        will stay blank after page load
                        */
                        analyzeDatasetButton.style.display = 'block';
                        progressCircle.style.display = 'none';
                    }
                    row.querySelector('td.dataset-error').textContent = 'N/A';
                    row.querySelector('td.dataset-critical-percent').textContent = 'N/A';
                }
            }
        }
    }
}

function updateAiAndHumanLabelValues(dataset, recordId){

    if (isLaptopDockerModelHealthy == true){
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
    } else {
        labels = [
            getHumanAngleAndThrottle(
                dataset,
                recordId
            )
        ];
    }

    return Promise.all(labels).then(function AcceptHandler(results) {
        if (isLaptopDockerModelHealthy == true){
            state.human.angle = results[0].angle;
            state.human.throttle = results[0].throttle;
            state.ai.angle = results[1].angle;
            // TODO: Figure out to do when selecting constant throttle
            //state.ai.throttle = results[1].throttle;
            state.ai.angleAbsError = Math.abs(state.human.angle - state.ai.angle);
            state.ai.throttleAbsError = Math.abs(state.human.throttle - state.ai.throttle);
        } else {
            state.human.angle = results[0].angle;
            state.human.throttle = results[0].throttle;
            state.ai.angle = 0;
            state.ai.angleAbsError = 0;
            state.ai.throttleAbsError = 0;
        }

    });
}


async function playVideo(args) {
    const dataset = args[0];
    const recordIds = args[1];
    const recordIdIndex = args[2]
    const oldVideoSessionId = args[3]
    const cropPercent = args[4];
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
        const scaleFactor = document.querySelector("input#image-scale-slider").getAttribute("data-value");
        updateImage(dataset, recordId, cropPercent, scaleFactor);
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

        const showEffects = document.getElementById("show-effects").checked;
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
                window.requestAnimationFrame(playVideo.bind(playVideo,[dataset, recordIds, recordIdIndexPlaying, oldVideoSessionId, cropPercent]));
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

function assignBulkDeleteDatasetsAction(button){
    button.addEventListener("click", async function(){
        const tabType = button.getAttribute("tab");
        const checkedDatasets = getCheckedDatasets();
        for (const dataset of checkedDatasets){
            const tr = document.querySelector('tr[dataset="'+dataset+'"]')
            deleteDataset(tabType, dataset);
            tr.parentNode.removeChild(tr);
        }
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
    }).then(function(){
        const button = document.querySelector('button#delete-pi-datasets-bulk-action');
        assignBulkDeleteDatasetsAction(button);
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
        // The import datasets API has changed, but the review API hasn't
        if (datasetType == 'import'){
            return response.records;
        } else {
            return response.datasets;
        }
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

function transferDataset(dataset){
    return new Promise(function(resolve, reject) {
        data = JSON.stringify({
            'dataset': dataset
        })
        $.post('/transfer-dataset', data, function(result){
           resolve(result);
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

    updatePiConnectionStatuses().then(function(isPiHealthy){
        if(isPiHealthy == true){
            updateDatasetsCountBadge('import');
            const piNav = document.querySelector("li#pi-nav");
            piNav.style.display ='inline'
        }
    });

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
        playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId, cropPercent]);

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
        playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId, cropPercent]);

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
                playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId, cropPercent]);
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
        playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId, cropPercent]);
    }

    const fastForwardFlagButton = document.querySelector("span#fastForwardFlag");
    fastForwardFlagButton.onclick = async function(){
        const recordType = "flagged";
        await fastForwardFrameIndex(recordType);
        videoSessionId = Date.now();
        playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId, cropPercent]);
    }

    const fastForwardCriticalErrorButton = document.querySelector("button#fastForwardCriticalError");
    fastForwardCriticalErrorButton.onclick = async function(){
        const recordType = "critical-errors";
        await fastForwardFrameIndex(recordType);
        videoSessionId = Date.now();
        playVideo([datasetPlaying, recordIdsPlaying, recordIdIndexPlaying, videoSessionId, cropPercent]);
    }


    const showEffectsButton = document.getElementById("show-effects");
    showEffectsButton.onclick = function(){
        const recordId = updateRecordId(recordIdsPlaying, recordIdIndexPlaying);
        const scaleFactor = document.querySelector("input#image-scale-slider").getAttribute("data-value");
        updateImage(datasetPlaying, recordId, cropPercent, scaleFactor);
    }

    const driveVehicleButton = document.getElementById("drive-vehicle-button");
    driveVehicleButton.onclick = async function(){
        isDriveModalOpen = true // Used to start updating modal w/ vehicle state
        pollVehicleAndUpdateUI();
        await makeNewDataset();
        const datasetId = await getDatasetIdFromDataset(recordingDataset);
        const driveVehicleHeaderDatasetId = document.querySelector('span#driveVehicleHeaderDatasetId')
        driveVehicleHeaderDatasetId.textContent = datasetId;
        const videoHeathCheckLoop = setInterval(async function(){

            /*
            Remove this deprecated type of video health check
            and replace it with the one that is also compatible
            with the test / local video server
            */
            //const isHealthy = await videoHealthCheck();
            isHealthy = true;

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
        isDriveModalOpen = false // Used to stop updating modal w/ vehicle state
        removeVideoSafely();
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
      refreshPredictionUpdateStatusesBulk()
    }, 3000);

    const importProgressTimer = setInterval(function(){
        /*
        Only attempt to check the import progress if the user is on the
        import page. This saves the server from checking Pi stats when
        the Pi isn't connected. This also assumes that the user will
        also know not to go to the imports page when the Pi is not
        connected, though it might also be a good idea to disable that
        page with code when the Pi is not available
        */
        if(getActiveDatasetType() == 'import'){
            addDatasetImportRows()
        }
    }, 1000);

    // Update Raspberry Pi statues and disable Pi connection calls if Pi is unavailable
    const piHealthCheckTime = setInterval(async function(){
        isPiHealthy = await updatePiConnectionStatuses();
        const piNav = document.querySelector("li#pi-nav");
        if(isPiHealthy == true){
            piNav.style.display ='inline'
        } else {
            piNav.style.display ='none'
        }
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

    configureSlider({
        'sliderId':'speed-threshold-cleanup-slider',
        'web_page':'datasets',
        'name':'auto clean speed',
        'type':'percent',
        'min':0,
        'max':95,
        'step':5
    });

    configureSlider({
        'sliderId':'image-top-cut-slider',
        'web_page':'datasets',
        'name':'image top cut',
        'type':'percent',
        'min':0,
        'max':90,
        'step':10
    });

    configureSlider({
        'sliderId':'image-scale-slider',
        'web_page':'datasets',
        'name':'image scale',
        'type':'reduceFactor',
        'min':1,
        'max':16,
        'step':1
    });

    configureSlider({
        'sliderId':'critical-error-threshold-slider',
        'web_page':'datasets',
        'name':'critical error',
        'type':'percent',
        'min':0,
        'max':200,
        'step':5
    });

}, false);

// Global variables
var isLaptopDockerModelHealthy = false;
var isPiHealthy = false;
var cropPercent = 50;
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
