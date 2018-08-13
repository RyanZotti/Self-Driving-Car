var driveHandler = new function() {
    //functions used to drive the vehicle.

    // Dataset selected via drop-down or entire pass
    var dataset = ''

    // Record IDs of the current dataset
    var record_ids = []

    var record_id = -1

    // Index of the record ID in record_ids
    var record_id_index = 0

    var state = {'tele': {
                          "user": {
                                  'angle': 0,
                                  'throttle': 0,
                                  },
                          "pilot": {
                                  'angle': 0,
                                  'throttle': 0,
                                  },
                          "ai":   {
                                  'angle':0,
                                  'throttle':0,
                                  'angleAbsError':0,
                                  'throttleAbsError':0
                                  }
                          },
                  'brakeOn': true,
                  'isVideoPlaying':false,
                  'recording': false,
                  'driveMode': "user",
                  'pilot': 'None',
                  'session': 'None',
                  'lag': 0,
                  'controlMode': 'joystick',
                  'maxThrottle' : 1,
                  'throttleMode' : 'user',
                  'dataset' : {
                        'file_number':0,
                        'highest_index':0,
                        'percent_complete':0.0
                  }
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
      updateUI();
    };

    function playVideo() {
        // Update everything in a loop if video is on
        // Stop for a sufficiently bad error
        if (state.isVideoPlaying == true) {
            while (state.tele.ai.angleAbsError < 0.8) {
                update_record_id();
                updateUI();
            }
            // Pause at end of video or where encountering
            // a bad error
            state.isVideoPlaying = false
        }
    }

    // TODO: Show light blue screen at end and beginning of dataset
    function update_record_id(){
      record_id_index = record_id_index + 1
      record_id = record_ids[record_id_index]
    }

    var setBindings = function() {

      $("#select_dataset").change(function(){
        dataset = $('#select_dataset :selected').text();
        data = JSON.stringify({ 'dataset': dataset})
        $.post('/dataset-record-ids', data, function(result){
            record_ids = result.record_ids
            record_id_index = record_id_index = 0
            record_id = record_ids[record_id_index]
            updateUI();
        });
      });

      $("#keep_button").click(function(){
        $.post("/keep");
        update_record_id();
        updateUI();
      });

      $("#ignore_button").click(function(){
        update_record_id();
        updateUI();
      });

      // Tell the server to delete the current record
      $('#delete_button').click(function () {
        update_record_id();
        $.post('/delete');
        updateUI();
      });

      // Play the video, stopping when there is a
      // sufficiently bad model error
      $('#play_button').click(function () {

        // Same button is used for play and pause,
        // so hitting the button changes the state
        // to the opposite boolean value
        if (state.isVideoPlaying == true){
            state.isVideoPlaying = false
        } else {
            state.isVideoPlaying = true
        }
        playVideo();

      });

      $('#pilot_select').on('change', function () {
        state.pilot = $(this).val(); // get selected value
        postPilot()
      });

      $('#mode_select').on('change', function () {
        updateDriveMode($(this).val());
      });

        updateUI();

    };


    function parseMetadata(data, status) {
      state.tele.user.angle = data.user.angle;
      state.tele.user.throttle = data.user.throttle;
      state.tele.ai.angle = data.ai.angle;
      state.tele.ai.throttle = data.ai.throttle;

      state.tele.ai.angleAbsError = Math.abs(state.tele.user.angle - state.tele.ai.angle);
      state.tele.ai.throttleAbsError = Math.abs(state.tele.user.throttle - state.tele.ai.throttle);

      state.dataset.file_number = data.dataset.file_number;
      state.dataset.highest_index = data.dataset.highest_index;
      state.dataset.percent_complete = ((data.dataset.file_number / data.dataset.highest_index) * 100).toFixed(2) + '%';

    }

    var postPilot = function(){
        data = JSON.stringify({ 'pilot': state.pilot })
        $.post(vehicleURL, data)
    }

    var updateUI = function() {

        if (dataset.length > 0) {
            image_url = '/image?dataset='+dataset+'&record-id='+record_id;
            if ($('#mpeg-image').length > 0) {
                /*
                Updating the src attribute rather than the whole html
                element avoids the weird white flashing between image
                updates
                */
                $('#mpeg-image')[0].src = image_url
            } else {
                $("#image-thumbnail").html('<img id="mpeg-image", class="img-responsive" src="'+image_url+'"> </img>');
            }
        } else {
            $("#image-thumbnail").html('<div id="image_placeholder"><p>Select a dataset from the dropdown menu.</p></div>');
        }

      // AJAX is for all buttons to update
      $.ajax({
                  type:    "POST",
                  url:     "/metadata",
                  data:    {},
                  async: false, // critical, or the image won't update. Not sure why
                  success: function(data) {
                        parseMetadata(data);
                  },
                  error:   function(jqXHR, textStatus, errorThrown) {
                        alert("Error, status = " + textStatus + ", " +
                              "error thrown: " + errorThrown
                        );
                  }
                });

      $("#throttleInput").val(state.tele.user.throttle);
      $("#angleInput").val(state.tele.user.angle);
      $('#mode_select').val(state.driveMode);

      var userThrottlePercent = Math.round(Math.abs(state.tele.user.throttle) * 100) + '%';
      var userSteeringPercent = Math.round(Math.abs(state.tele.user.angle) * 100) + '%';
      var userThrottleRounded = Number(state.tele.user.throttle.toFixed(2))
      var userSteeringRounded = Number(state.tele.user.angle.toFixed(2))

      var aiThrottlePercent = Math.round(Math.abs(state.tele.ai.throttle) * 100) + '%';
      var aiSteeringPercent = Math.round(Math.abs(state.tele.ai.angle) * 100) + '%';
      var aiThrottleRounded = Number(state.tele.ai.throttle.toFixed(2))
      var aiSteeringRounded = Number(state.tele.ai.angle.toFixed(2))

      var aiSteeringAbsError = Math.abs(userSteeringRounded - aiSteeringRounded) * 100
      var aiThrottleAbsError = Math.abs(userThrottleRounded - aiThrottleRounded) * 100

      if (dataset.length > 0) {
          percent_complete = ((record_id_index / record_ids.length) * 100).toFixed(2) + '%';
          $('#image-progress').css('width', percent_complete);
          $('#text-image-progress').html('<b>Dataset Frames: </b>' + record_id_index + ' / '+ record_ids.length + ' ' + percent_complete)
      } else {
          $('#image-progress').css('width', '0%');
      }

      if(state.tele.user.throttle < 0) {
        $('#user-throttle-bar-backward').css('width', userThrottlePercent).html(userThrottleRounded)
        $('#user-throttle-bar-forward').css('width', '0%').html('')
      }
      else if (state.tele.user.throttle > 0) {
        $('#user-throttle-bar-backward').css('width', '0%').html('')
        $('#user-throttle-bar-forward').css('width', userThrottlePercent).html(userThrottleRounded)
      }
      else {
        $('#user-throttle-bar-forward').css('width', '0%').html('')
        $('#user-throttle-bar-backward').css('width', '0%').html('')
      }

      if(state.tele.ai.throttle < 0) {
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
      }
      else if (state.tele.ai.throttle > 0) {
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
      }
      else {
        $('#ai-throttle-bar-forward').css('width', '0%').html('')
        $('#ai-throttle-bar-backward').css('width', '0%').html('')
      }

      if(state.tele.user.angle < 0) {
        $('#user-angle-bar-backward').css('width', userSteeringPercent).html(userSteeringRounded)
        $('#user-angle-bar-forward').css('width', '0%').html('')
      }
      else if (state.tele.user.angle > 0) {
        $('#user-angle-bar-backward').css('width', '0%').html('')
        $('#user-angle-bar-forward').css('width', userSteeringPercent).html(userSteeringRounded)
      }
      else {
        $('#user-angle-bar-forward').css('width', '0%').html('')
        $('#user-angle-bar-backward').css('width', '0%').html('')
      }

      if(state.tele.ai.angle < 0) {
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
      else if (state.tele.ai.angle > 0) {
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

    };

    var postDrive = function() {

        //Send angle and throttle values
        data = JSON.stringify({ 'angle': state.tele.user.angle,
                                'throttle':state.tele.user.throttle,
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