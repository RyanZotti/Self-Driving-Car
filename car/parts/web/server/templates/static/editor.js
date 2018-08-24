var driveHandler = new function() {
    //functions used to drive the vehicle.

    // Dataset selected via drop-down or entire pass
    var dataset = '';

    // Record IDs of the current dataset
    var recordIds = [];

    var recordId = -1;

    // Index of the record ID in recordIds
    var recordIdIndex = 0;

    var maxRecordId = -1;

    var state = {
        "human": {
                'angle': 0,
                'throttle': 0,
                },
        "ai":   {
                'angle':0,
                'throttle':0,
                'angleAbsError':0,
                'throttleAbsError':0
                },
        'isVideoPlaying':false,
    }

    // Delete records that likely include human mistakes
    function autoPurgeRecords(dataset,minThrottle) {
        /*
          dataset: String
              Name of dataset to clean up
          minThrottle: Integer
              Threshold for deleting records. Any record with a
              throttle value below this number is automatically
              deleted
        */

        getDatasetRecordIds(dataset).then(function(recordIds){
            recordIds.forEach(function(recordId) {
                getHumanAngleAndThrottle(
                    dataset,
                    recordId
                ).then(function(labels){
                    throttle = labels.throttle;
                    if (throttle < minThrottle) {
                        // TODO: Call delete record API
                        console.log('Delete: '+dataset+' '+recordId);
                    }
                });
            });
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

    function getAiAngle(dataset, recordId) {
        return new Promise(function(resolve, reject) {
            data = JSON.stringify({ 'dataset': dataset, 'record_id' : recordId})
            console.log(data);
            $.post('/ai-angle', data, function(result){
               resolve(result)
            });
        });
    }

    function setDatasetProgress(dataset,recordIds,recordId) {
        if (dataset.length > 0) {
              var maxRecordId = recordIds.reduce(function(a, b) {
                  return Math.max(a, b);
              });
              percentComplete = ((recordId / maxRecordId) * 100).toFixed(2) + '%';
              $('#image-progress').css('width', percentComplete);
              $('#text-image-progress').html('<b>Dataset Frames: </b>' + recordId + ' / '+ maxRecordId + ' ' + percentComplete);
          } else {
              $('#image-progress').css('width', '0%');
          }
    }

    function getHumanAngleAndThrottle(dataset, recordId) {
        return new Promise(function(resolve, reject) {
            data = JSON.stringify({ 'dataset': dataset, 'record_id' : recordId})
            $.post('/user-labels', data, function(result){
               resolve(result)
            });
        });
    }

    // Show available datasets in dataset drop-down menu
    $.get( "/list-datasets", function(response) {
        datasets = response.datasets
        // Option.value: What sent to the server
        // Option.text: What the user sees
        $('#select_dataset').append($('<option>', {
                value: 'All Datasets',
                text : 'All Datasets'
        }));
        $.each(datasets, function (i, dataset) {
            $('#select_dataset').append($('<option>', {
                value: dataset,
                text : dataset
            }));
        });
    });

    var driveURL = ""
    var vehicleURL = ""

    this.load = function() {
      driveURL = '/drive'
      vehicleURL = '/drive'

      setBindings()
    };

    async function playVideo() {
        recordId = updateRecordId(recordIds);
        updateImage(dataset, recordId);
        setDatasetProgress(dataset,recordIds,recordId);
        await updateAiAndHumanLabelValues(dataset, recordId);
        updateLabelBars();
        console.log('record ID: '+recordId + ' '+ state.ai.angleAbsError);
        if (recordId <= maxRecordId && state.ai.angleAbsError < 0.8 && state.isVideoPlaying == true) {
            console.log('record ID: '+recordId + ' continuing animation');
            window.requestAnimationFrame(playVideo);
        } else {
            state.isVideoPlaying = false;
        }
    }

    function updateRecordId(recordIds){
        recordIdIndex = recordIdIndex + 1;
        // Check if last record has been reached
        if (recordIdIndex < recordIds.length){
           recordId = recordIds[recordIdIndex];
        } else {
           recordId = -1
        }
        return recordId;
    }

    var setBindings = function() {

      $("#select_dataset").change(function(){
        dataset = $('#select_dataset :selected').text();

        getDatasetRecordIds(dataset).then(function (data){
            recordIds = data;
        }).then(function(){
            maxRecordId = recordIds.reduce(function(a, b) {
                return Math.max(a, b);
            });
        });

        data = JSON.stringify({ 'dataset': dataset})
        $.post('/dataset-record-ids', data, function(result){
            recordIds = result.record_ids;
            recordIdIndex = 0;
            recordId = recordIds[recordIdIndex]
            updateUI();
        });
      });

      $("#keep_button").click(function(){
        data = JSON.stringify({'dataset': dataset, 'record_id': record_id})
        $.post('/keep', data, function(){
          recordId = updateRecordId(recordIds);
          updateUI();
        });
      });

      $("#ignore_button").click(function(){
          recordId = updateRecordId(recordIds);
          updateUI();
      });

      // Tell the server to delete the current record
      $('#delete_button').click(function () {
          data = JSON.stringify({'dataset': dataset, 'record_id': record_id})
          $.post('/delete', data);
          recordId = updateRecordId(recordIds);
          updateUI();
      });

      // Play the video, stopping when there is a
      // sufficiently bad model error
      $('#play_button').click(function () {

        // Same button is used for play and pause,
        // so hitting the button changes the state
        // to the opposite boolean value
        if (state.isVideoPlaying == true){
            state.isVideoPlaying = false;
        } else {
            state.isVideoPlaying = true;
            window.requestAnimationFrame(playVideo);
        }
      });

      $('#pilot_select').on('change', function () {
        state.pilot = $(this).val(); // get selected value
        postPilot()
      });

      $('#mode_select').on('change', function () {
        updateDriveMode($(this).val());
      });
    };

    var postPilot = function(){
        data = JSON.stringify({ 'pilot': state.pilot })
        $.post(vehicleURL, data)
    }

    function updateImage(dataset, recordId) {
        imageUrl = '/image?dataset='+dataset+'&record-id='+recordId;
        if ($('#mpeg-image').length > 0) {
            $('#mpeg-image')[0].src = imageUrl;
        } else {
            $("#image-thumbnail").html('<img id="mpeg-image", src="'+imageUrl+'"> </img>');
        }
    }

    function updateLabelBars(){
        var userThrottlePercent = Math.round(Math.abs(state.human.throttle) * 100) + '%';
        var userSteeringPercent = Math.round(Math.abs(state.human.angle) * 100) + '%';
        var userThrottleRounded = Number(state.human.throttle.toFixed(2))
        var userSteeringRounded = Number(state.human.angle.toFixed(2))
        var aiThrottlePercent = Math.round(Math.abs(state.ai.throttle) * 100) + '%';
        var aiSteeringPercent = Math.round(Math.abs(state.ai.angle) * 100) + '%';
        var aiThrottleRounded = Number(state.ai.throttle.toFixed(2))
        var aiSteeringRounded = Number(state.ai.angle.toFixed(2))
        var aiSteeringAbsError = Math.abs(userSteeringRounded - aiSteeringRounded) * 100
        var aiThrottleAbsError = Math.abs(userThrottleRounded - aiThrottleRounded) * 100

        if(state.human.throttle < 0) {
            $('#user-throttle-bar-backward').css('width', userThrottlePercent).html(userThrottleRounded)
            $('#user-throttle-bar-forward').css('width', '0%').html('')
        }
        else if (state.human.throttle > 0) {
            $('#user-throttle-bar-backward').css('width', '0%').html('')
            $('#user-throttle-bar-forward').css('width', userThrottlePercent).html(userThrottleRounded)
        }
        else {
            $('#user-throttle-bar-forward').css('width', '0%').html('')
            $('#user-throttle-bar-backward').css('width', '0%').html('')
        }

        if(state.ai.throttle < 0) {
            $('#ai-throttle-bar-backward').css('width', aiThrottlePercent).html(aiThrottleRounded)
            $('#ai-throttle-bar-forward').css('width', '0%').html('')
            if (aiThrottleAbsError < 40) {
                $('#ai-throttle-bar-backward')
                    .removeClass('progress-bar-info')
                    .removeClass('progress-bar-warning')
                    .removeClass('progress-bar-danger')
                    .addClass('progress-bar-success').end()
                }
            else if (aiThrottleAbsError < 60){
                $('#ai-throttle-bar-backward')
                    .removeClass('progress-bar-info')
                    .removeClass('progress-bar-success')
                    .removeClass('progress-bar-danger')
                    .addClass('progress-bar-warning').end()
            } else {
                $('#ai-throttle-bar-backward')
                    .removeClass('progress-bar-info')
                    .removeClass('progress-bar-success')
                    .removeClass('progress-bar-warning')
                    .addClass('progress-bar-danger').end()
            }
        } else if (state.ai.throttle > 0) {
            $('#ai-throttle-bar-backward').css('width', '0%').html('')
            $('#ai-throttle-bar-forward').css('width', aiThrottlePercent).html(aiThrottleRounded)
            if (aiThrottleAbsError < 40) {
                $('#ai-throttle-bar-forward')
                    .removeClass('progress-bar-info')
                    .removeClass('progress-bar-warning')
                    .removeClass('progress-bar-danger')
                    .addClass('progress-bar-success').end()
                }
            else if (aiThrottleAbsError < 60){
                $('#ai-throttle-bar-forward')
                    .removeClass('progress-bar-info')
                    .removeClass('progress-bar-success')
                    .removeClass('progress-bar-danger')
                    .addClass('progress-bar-warning').end()
            } else {
                $('#ai-throttle-bar-forward')
                    .removeClass('progress-bar-info')
                    .removeClass('progress-bar-success')
                    .removeClass('progress-bar-warning')
                    .addClass('progress-bar-danger').end()
            }
        } else {
            $('#ai-throttle-bar-forward').css('width', '0%').html('')
            $('#ai-throttle-bar-backward').css('width', '0%').html('')
        }
        if(state.human.angle < 0) {
            $('#user-angle-bar-backward').css('width', userSteeringPercent).html(userSteeringRounded)
            $('#user-angle-bar-forward').css('width', '0%').html('')
        }
        else if (state.human.angle > 0) {
            $('#user-angle-bar-backward').css('width', '0%').html('')
            $('#user-angle-bar-forward').css('width', userSteeringPercent).html(userSteeringRounded)
        }
        else {
            $('#user-angle-bar-forward').css('width', '0%').html('')
            $('#user-angle-bar-backward').css('width', '0%').html('')
        }
        if(state.ai.angle < 0) {
            $('#ai-angle-bar-backward').css('width', aiSteeringPercent).html(aiSteeringRounded)
            $('#ai-angle-bar-forward').css('width', '0%').html('')
                if (aiSteeringAbsError < 40) {
                    $('#ai-angle-bar-backward')
                        .removeClass('progress-bar-info')
                        .removeClass('progress-bar-warning')
                        .removeClass('progress-bar-danger')
                        .addClass('progress-bar-success').end()
                    }
                else if (aiSteeringAbsError < 60){
                    $('#ai-angle-bar-backward')
                        .removeClass('progress-bar-info')
                        .removeClass('progress-bar-success')
                        .removeClass('progress-bar-danger')
                        .addClass('progress-bar-warning').end()
                } else {
                    $('#ai-angle-bar-backward')
                        .removeClass('progress-bar-info')
                        .removeClass('progress-bar-success')
                        .removeClass('progress-bar-warning')
                        .addClass('progress-bar-danger').end()
                }
        }
        else if (state.ai.angle > 0) {
            $('#ai-angle-bar-backward').css('width', '0%').html('')
            $('#ai-angle-bar-forward').css('width', aiSteeringPercent).html(aiSteeringRounded)
            if (aiSteeringAbsError < 40) {
                $('#ai-angle-bar-forward')
                    .removeClass('progress-bar-info')
                    .removeClass('progress-bar-warning')
                    .removeClass('progress-bar-danger')
                    .addClass('progress-bar-success').end()
                }
            else if (aiSteeringAbsError < 60){
                $('#ai-angle-bar-forward')
                    .removeClass('progress-bar-info')
                    .removeClass('progress-bar-success')
                    .removeClass('progress-bar-danger')
                    .addClass('progress-bar-warning').end()
            } else {
                $('#ai-angle-bar-forward')
                    .removeClass('progress-bar-info')
                    .removeClass('progress-bar-success')
                    .removeClass('progress-bar-warning')
                    .addClass('progress-bar-danger').end()
            }
        }
        else {
            $('#ai-angle-bar-forward').css('width', '0%').html('')
            $('#ai-angle-bar-backward').css('width', '0%').html('')
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
            console.log(results[1]);
            // TODO: Figure out to do when selecting constant throttle
            //state.ai.throttle = results[1].throttle;
            state.ai.angleAbsError = Math.abs(state.human.angle - state.ai.angle);
            state.ai.throttleAbsError = Math.abs(state.human.throttle - state.ai.throttle);
        });
    }

    async function updateUI() {
        if (dataset.length > 0 && recordId > 0) {
            await updateAiAndHumanLabelValues(dataset, recordId);
            updateImage(dataset, recordId);
            setDatasetProgress(dataset,recordIds,recordId);
            updateLabelBars();
        } else {
            $("#image-thumbnail").html('<div id="image_placeholder"><p>Select a dataset from the dropdown menu.</p></div>');
        }
    };

    var postDrive = function() {

        //Send angle and throttle values
        data = JSON.stringify({ 'angle': state.human.angle,
                                'throttle':state.human.throttle,
                                'drive_mode':state.driveMode,
                                'recording': state.recording,
                                'brake':state.brakeOn,
                                'max_throttle':state.maxThrottle})
        $.post(driveURL, data)
        updateUI();
    };

    // Math.sign() not available in iOS 8
    function sign(x) {
        return typeof x === 'number' ? x ? x < 0 ? -1 : 1 : x === x ? 0 : NaN : NaN;
    }

}();