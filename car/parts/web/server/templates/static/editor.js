var driveHandler = new function() {
    //functions used to drive the vehicle.

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

    var joystick_options = {}
    var joystickLoopRunning=false;

    var hasGamepad = false;

    var deviceHasOrientation=false;
    var initialGamma;

    var vehicle_id = ""
    var driveURL = ""
    var vehicleURL = ""

    this.load = function() {
      driveURL = '/drive'
      vehicleURL = '/drive'

      setBindings()

      joystick_options = {
        zone: document.getElementById('joystick_container'),  // active zone
        color: '#668AED',
        size: 350,
      };

      if(!!navigator.getGamepads){
        console.log("Device has gamepad support.")
        hasGamepad = true;
      }

      if (window.DeviceOrientationEvent) {
        window.addEventListener("deviceorientation", handleOrientation);
        console.log("Browser supports device orientation, setting control mode to tilt.");
        state.controlMode = 'tilt';
        deviceOrientationLoop();
      } else {
        console.log("Device Orientation not supported by browser, setting control mode to joystick.");
        state.controlMode = 'joystick';
      }
      updateUI();
    };

    function playVideo() {
        // Update everything in a loop if video is on
        // Stop for a sufficiently bad error
        if (state.isVideoPlaying == true) {
            while (state.tele.ai.angleAbsError < 0.8) {
                updateUI();
            }
            // Pause at end of video or where encountering
            // a bad error
            state.isVideoPlaying = false
        }
    }

    var setBindings = function() {

      $(document).keydown(function(e) {
          if(e.which == 32) { toggleBrake() }  // 'space'  brake
          if(e.which == 82) { toggleRecording() }  // 'r'  toggle recording
          if(e.which == 73) { throttleUp() }  // 'i'  throttle up
          if(e.which == 75) { throttleDown() } // 'k'  slow down
          if(e.which == 74) { angleLeft() } // 'j' turn left
          if(e.which == 76) { angleRight() } // 'l' turn right
          if(e.which == 65) { updateDriveMode('auto') } // 'a' turn on auto mode
          if(e.which == 68) { updateDriveMode('user') } // 'd' turn on manual mode
          if(e.which == 83) { updateDriveMode('auto_angle') } // 'a' turn on auto mode
      });

      $("#keep_button").click(function(){
        $.post("/keep");
        updateUI();
      });

      $("#ignore_button").click(function(){
        updateUI();
      });

      // Tell the server to delete the current record
      $('#delete_button').click(function () {
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

      $('#max_throttle_select').on('change', function () {
        updateMaxThrottle(parseFloat($(this).val()));
      });

      $('#throttle_mode_select').on('change', function () {
        state.throttleMode = $(this).val();
      });

      $('#record_button').click(function () {
        toggleRecording();
      });

      $('#brake_button').click(function() {
        toggleBrake();
      });

      $('input[type=radio][name=controlMode]').change(function() {
        if (this.value == 'joystick') {
          state.controlMode = "joystick";
          joystickLoopRunning = true;
          console.log('joystick mode');
          joystickLoop();
        } else if (this.value == 'tilt' && deviceHasOrientation) {
          joystickLoopRunning = false;
          state.controlMode = "tilt";
          console.log('tilt mode')
        } else if (this.value == 'gamepad' && hasGamepad) {
          joystickLoopRunning = false;
          state.controlMode = "gamepad";
          console.log('gamepad mode')
          gamePadLoop();
        }
        updateUI();
      });

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

    function bindNipple(manager) {
      manager.on('start', function(evt, data) {
        state.tele.user.angle = 0
        state.tele.user.throttle = 0
        state.recording = true
        joystickLoopRunning=true;
        joystickLoop();

      }).on('end', function(evt, data) {
        joystickLoopRunning=false;
        brake()

      }).on('move', function(evt, data) {
        state.brakeOn = false;
        radian = data['angle']['radian']
        distance = data['distance']

        state.tele.user.angle = Math.max(Math.min(Math.cos(radian)/70*distance, 1), -1)
        state.tele.user.throttle = limitedThrottle(Math.max(Math.min(Math.sin(radian)/70*distance , 1), -1))

        if (state.tele.user.throttle < .001) {
          state.tele.user.angle = 0
        }

      });
    }


    var postPilot = function(){
        data = JSON.stringify({ 'pilot': state.pilot })
        $.post(vehicleURL, data)
    }




    var updateUI = function() {

        // Add the html element for the image if it doesn't exist yet
        if ($('#mpeg-image').length == 0) {
            $("#image-thumbnail").html('<img id="mpeg-image", class="img-responsive" src="/image"> </img>');
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

      $("#mpeg-image").prop("src", "/image?" + +new Date());
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

      $('#image-progress')
        .css('width', state.dataset.percent_complete);

      $('#text-image-progress')
        .html('<b>Dataset Frames: </b>' + state.dataset.file_number + ' / '+ state.dataset.highest_index + '    ' + state.dataset.percent_complete)

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

      if(userSteeringRounded < 0 && aiSteeringRounded <= 0) {
        commonPercent = '0%'
        differentPercent = '0%'
        differenceNumber = 0
        if (userSteeringRounded < aiSteeringRounded) {
            commonPercent = aiSteeringPercent;
            differenceNumber = Math.abs(userSteeringRounded - aiSteeringRounded) * 100
            differentPercent = differenceNumber +'%';
        } else {
            commonPercent = userSteeringPercent
            differentPercent = aiSteeringPercent - userSteeringPercent
        }
        $('#error-angle-bar-backward').css('width', differentPercent)
        if (differenceNumber < 40) {
            $('#error-angle-bar-backward')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-success').end()
        } else if (differenceNumber < 60){
            $('#error-angle-bar-backward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-warning').end()
        } else {
            $('#error-angle-bar-backward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .addClass('progress-bar-danger').end()
        }

      } else if (userSteeringRounded > 0 && aiSteeringRounded >= 0){
        commonPercent = '0%'
        differentPercent = '0%'
        differenceNumber = 0
        if (userSteeringRounded > aiSteeringRounded) {
            commonPercent = aiSteeringPercent;
            differenceNumber = Math.abs(userSteeringRounded - aiSteeringRounded) * 100
            differentPercent = differenceNumber +'%';
        } else {
            commonPercent = userSteeringPercent
            differentPercent = aiSteeringPercent - userSteeringPercent
        }
        $('#error-angle-bar-forward').css('width', differentPercent)
        if (differenceNumber < 40) {
            $('#error-angle-bar-forward')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-success').end()
        } else if (differenceNumber < 60){
            $('#error-angle-bar-forward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-warning').end()
        } else {
            $('#error-angle-bar-forward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .addClass('progress-bar-danger').end()
        }
      } else {
        differenceNumber = Math.abs(userSteeringRounded - aiSteeringRounded) * 100
        differentPercent = differenceNumber +'%';

        if (userSteeringRounded < 0){
            $('#error-angle-bar-backward').css('width', userSteeringPercent)
            $('#error-angle-bar-forward').css('width', aiSteeringPercent)
        } else {
            $('#error-angle-bar-backward').css('width', aiSteeringPercent)
            $('#error-angle-bar-forward').css('width', userSteeringPercent)
        }
        if (differenceNumber < 40) {
            $('#error-angle-bar-forward')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-success').end()
            $('#error-angle-bar-backward')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-success').end()
        } else if (differenceNumber < 60){
            $('#error-angle-bar-forward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-warning').end()
            $('#error-angle-bar-backward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-warning').end()
        } else {
            $('#error-angle-bar-forward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .addClass('progress-bar-danger').end()
            $('#error-angle-bar-backward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .addClass('progress-bar-danger').end()
        }

      }

      if(userThrottleRounded < 0 && aiThrottleRounded <= 0) {
        commonPercent = '0%'
        differentPercent = '0%'
        differenceNumber = 0
        if (userThrottleRounded < aiThrottleRounded) {
            commonPercent = aiThrottlePercent;
            differenceNumber = Math.abs(userThrottleRounded - aiThrottleRounded) * 100
            differentPercent = differenceNumber +'%';
        } else {
            commonPercent = userThrottlePercent
            differentPercent = aiThrottlePercent - userThrottlePercent
        }
        $('#error-throttle-bar-backward').css('width', differentPercent)
        if (differenceNumber < 40) {
            $('#error-throttle-bar-backward')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-success').end()
        } else if (differenceNumber < 60){
            $('#error-throttle-bar-backward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-warning').end()
        } else {
            $('#error-throttle-bar-backward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .addClass('progress-bar-danger').end()
        }

      } else if (userThrottleRounded > 0 && aiThrottleRounded >= 0){
        commonPercent = '0%'
        differentPercent = '0%'
        differenceNumber = 0
        if (userThrottleRounded > aiThrottleRounded) {
            commonPercent = aiThrottlePercent;
            differenceNumber = Math.abs(userThrottleRounded - aiThrottleRounded) * 100
            differentPercent = differenceNumber +'%';
        } else {
            commonPercent = userThrottlePercent
            differentPercent = aiThrottlePercent - userThrottlePercent
        }
        $('#error-throttle-bar-forward').css('width', differentPercent)
        $('#error-throttle-bar-backward').css('width', '0%')
        if (differenceNumber < 40) {
            $('#error-throttle-bar-forward')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-success').end()
        } else if (differenceNumber < 60){
            $('#error-throttle-bar-forward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-warning').end()
        } else {
            $('#error-throttle-bar-forward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .addClass('progress-bar-danger').end()
        }
      } else {
        differenceNumber = Math.abs(userThrottleRounded - aiThrottleRounded) * 100
        differentPercent = differenceNumber +'%';

        if (userThrottleRounded < 0){
            $('#error-throttle-bar-backward').css('width', userThrottlePercent)
            $('#error-throttle-bar-forward').css('width', aiThrottlePercent)
        } else {
            $('#error-throttle-bar-backward').css('width', aiThrottlePercent)
            $('#error-throttle-bar-forward').css('width', userThrottlePercent)
        }
        if (differenceNumber < 40) {
            $('#error-throttle-bar-forward')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-success').end()
            $('#error-throttle-bar-backward')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-success').end()
        } else if (differenceNumber < 60){
            $('#error-throttle-bar-forward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-warning').end()
            $('#error-throttle-bar-backward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-danger')
                .addClass('progress-bar-warning').end()
        } else {
            $('#error-throttle-bar-forward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .addClass('progress-bar-danger').end()
            $('#error-throttle-bar-backward')
                .removeClass('progress-bar-success')
                .removeClass('progress-bar-info')
                .removeClass('progress-bar-warning')
                .addClass('progress-bar-danger').end()
        }

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

      if (state.recording) {
        $('#record_button')
          .html('Stop Recording (r)')
          .removeClass('btn-info')
          .addClass('btn-warning').end()
      } else {
        $('#record_button')
          .html('Start Recording (r)')
          .removeClass('btn-warning')
          .addClass('btn-info').end()
      }

      if (state.brakeOn) {
        $('#brake_button')
          .html('Start Vehicle')
          .removeClass('btn-danger')
          .addClass('btn-success').end()
      } else {
        $('#brake_button')
          .html('Stop Vehicle')
          .removeClass('btn-success')
          .addClass('btn-danger').end()
      }

      if(deviceHasOrientation) {
        $('#tilt-toggle').removeAttr("disabled")
        $('#tilt').removeAttr("disabled")
      } else {
        $('#tilt-toggle').attr("disabled", "disabled");
        $('#tilt').prop("disabled", true);
      }

      if(hasGamepad) {
        $('#gamepad-toggle').removeAttr("disabled")
        $('#gamepad').removeAttr("disabled")
      } else {
        $('#gamepad-toggle').attr("disabled", "disabled");
        $('#gamepad').prop("disabled", true);
      }

      if (state.controlMode == "joystick") {
        $('#joystick-column').show();
        $('#tilt-toggle').removeClass("active");
        $('#joystick-toggle').addClass("active");
        $('#joystick').attr("checked", "checked")
        $('#tilt').removeAttr("checked")
      } else if (state.controlMode == "tilt") {
        $('#joystick-column').hide();
        $('#joystick-toggle').removeClass("active");
        $('#tilt-toggle').addClass("active");
        $('#joystick').removeAttr("checked");
        $('#tilt').attr("checked", "checked");
      }

      //drawLine(state.tele.user.angle, state.tele.user.throttle)
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

    var applyDeadzone = function(number, threshold){
       percentage = (Math.abs(number) - threshold) / (1 - threshold);

       if(percentage < 0)
          percentage = 0;

       return percentage * (number > 0 ? 1 : -1);
    }



    function gamePadLoop() {
      setTimeout(gamePadLoop,100);

      if (state.controlMode != "gamepad") {
        return;
      }

      var gamepads = navigator.getGamepads();

      for (var i = 0; i < gamepads.length; ++i)
        {
          var pad = gamepads[i];
          // some pads are NULL I think.. some aren't.. use one that isn't null
          if (pad && pad.timestamp!=0)
          {

            var joystickX = applyDeadzone(pad.axes[2], 0.05);

            var joystickY = applyDeadzone(pad.axes[1], 0.15);

            state.tele.user.angle = joystickX;
            state.tele.user.throttle = limitedThrottle((joystickY * -1));

            if (state.tele.user.throttle == 0 && state.tele.user.throttle == 0) {
              state.brakeOn = true;
            } else {
              state.brakeOn = false;
            }

            if (state.tele.user.throttle != 0) {
              state.recording = true;
            } else {
              state.recording = false;
            }

            postDrive()

          }
            // todo; simple demo of displaying pad.axes and pad.buttons
        }
      }


    // Send control updates to the server every .1 seconds.
    function joystickLoop () {
       setTimeout(function () {
            postDrive()

          if (joystickLoopRunning && state.controlMode == "joystick") {
             joystickLoop();
          }
       }, 100)
    }

    // Control throttle and steering with device orientation
    function handleOrientation(event) {

      var alpha = event.alpha;
      var beta = event.beta;
      var gamma = event.gamma;

      if (beta == null || gamma == null) {
        deviceHasOrientation = false;
        state.controlMode = "joystick";
        console.log("Invalid device orientation values, switched to joystick mode.")
      } else {
        deviceHasOrientation = true;
        console.log("device has valid orientation values")
      }

      updateUI();

      if(state.controlMode != "tilt" || !deviceHasOrientation || state.brakeOn){
        return;
      }

      if(!initialGamma && gamma) {
        initialGamma = gamma;
      }

      var newThrottle = gammaToThrottle(gamma);
      var newAngle = betaToSteering(beta, gamma);

      // prevent unexpected switch between full forward and full reverse
      // when device is parallel to ground
      if (state.tele.user.throttle > 0.9 && newThrottle <= 0) {
        newThrottle = 1.0
      }

      if (state.tele.user.throttle < -0.9 && newThrottle >= 0) {
        newThrottle = -1.0
      }

      state.tele.user.throttle = limitedThrottle(newThrottle);
      state.tele.user.angle = newAngle;
    }

    function deviceOrientationLoop () {
       setTimeout(function () {
          if(!state.brakeOn){
            postDrive()
          }

          if (state.controlMode == "tilt") {
            deviceOrientationLoop();
          }
       }, 100)
    }

    var throttleUp = function(){
      state.tele.user.throttle = limitedThrottle(Math.min(state.tele.user.throttle + .05, 1));
      postDrive()
    };

    var throttleDown = function(){
      state.tele.user.throttle = limitedThrottle(Math.max(state.tele.user.throttle - .05, -1));
      postDrive()
    };

    var angleLeft = function(){
      state.tele.user.angle = Math.max(state.tele.user.angle - .1, -1)
      postDrive()
    };

    var angleRight = function(){
      state.tele.user.angle = Math.min(state.tele.user.angle + .1, 1)
      postDrive()
    };

    var updateDriveMode = function(mode){
      state.driveMode = mode;
      postDrive()
    };

    var updateMaxThrottle = function(throttle){
      state.maxThrottle = throttle;
      postDrive()
    };

    var toggleRecording = function(){
      state.recording = !state.recording
      postDrive()
    };

    var toggleBrake = function(){
      state.brakeOn = !state.brakeOn;
      initialGamma = null;


      if (state.brakeOn) {
        brake();
      }
    };

    var brake = function(i){
          console.log('post drive: ' + i)
          state.tele.user.angle = 0
          state.tele.user.throttle = 0
          state.recording = false
          state.driveMode = 'user';
          postDrive()


      i++
      if (i < 5) {
        setTimeout(function () {
          console.log('calling brake:' + i)
          brake(i);
        }, 500)
      };

      state.brakeOn = true;
      updateUI();
    };

    var limitedThrottle = function(newThrottle){
      var limitedThrottle = 0;

      if (newThrottle > 0) {
        limitedThrottle = Math.min(state.maxThrottle, newThrottle);
      }

      if (newThrottle < 0) {
        limitedThrottle = Math.max((state.maxThrottle * -1), newThrottle);
      }

      if (state.throttleMode == 'constant') {
        limitedThrottle = state.maxThrottle;
      }

      return limitedThrottle;
    }


    // var drawLine = function(angle, throttle) {
    //
    //   throttleConstant = 100
    //   throttle = throttle * throttleConstant
    //   angleSign = Math.sign(angle)
    //   angle = toRadians(Math.abs(angle*90))
    //
    //   var canvas = document.getElementById("angleView"),
    //   context = canvas.getContext('2d');
    //   context.clearRect(0, 0, canvas.width, canvas.height);
    //
    //   base={'x':canvas.width/2, 'y':canvas.height}
    //
    //   pointX = Math.sin(angle) * throttle * angleSign
    //   pointY = Math.cos(angle) * throttle
    //   xPoint = {'x': pointX + base.x, 'y': base.y - pointY}
    //
    //   context.beginPath();
    //   context.moveTo(base.x, base.y);
    //   context.lineTo(xPoint.x, xPoint.y);
    //   context.lineWidth = 5;
    //   context.strokeStyle = '#ff0000';
    //   context.stroke();
    //   context.closePath();
    //
    // };

    var betaToSteering = function(beta, gamma) {
      const deadZone = 5;
      var angle = 0.0;
      var outsideDeadZone = false;
      var controlDirection = (sign(initialGamma) * -1)

      //max steering angle at device 35º tilt
      var fullLeft = -35.0;
      var fullRight = 35.0;

      //handle beta 90 to 180 discontinuous transition at gamma 90
      if (beta > 90) {
        beta = (beta - 180) * sign(gamma * -1) * controlDirection
      } else if (beta < -90) {
        beta = (beta + 180) * sign(gamma * -1) * controlDirection
      }

      // set the deadzone for neutral sterring
      if (Math.abs(beta) > 90) {
        outsideDeadZone = Math.abs(beta) < 180 - deadZone;
      }
      else {
        outsideDeadZone = Math.abs(beta) > deadZone;
      }

      if (outsideDeadZone && beta < -90.0) {
        angle = remap(beta, fullLeft, (-180.0 + deadZone), -1.0, 0.0);
      }
      else if (outsideDeadZone && beta > 90.0) {
        angle = remap(beta, (180.0 - deadZone), fullRight, 0.0, 1.0);
      }
      else if (outsideDeadZone && beta < 0.0) {
        angle = remap(beta, fullLeft, 0.0 - deadZone, -1.0, 0);
      }
      else if (outsideDeadZone && beta > 0.0) {
        angle = remap(beta, 0.0 + deadZone, fullRight, 0.0, 1.0);
      }

      // set full turn if abs(angle) > 1
      if (angle < -1) {
        angle = -1;
      } else if (angle > 1) {
        angle = 1;
      }

      return angle * controlDirection;
    };

    // Math.sign() not available in iOS 8
    function sign(x) {
        return typeof x === 'number' ? x ? x < 0 ? -1 : 1 : x === x ? 0 : NaN : NaN;
    }

    var gammaToThrottle = function(gamma) {
      var throttle = 0.0;
      var gamma180 = gamma + 90;
      var initialGamma180 = initialGamma + 90;



      var controlDirection = (sign(initialGamma) * -1);
      //var controlDirection = (Math.sign(initialGamma) * -1);

      // 10 degree deadzone around the initial position
      // 45 degrees of motion for forward and reverse
      var minForward = Math.min((initialGamma180 + (5 * controlDirection)), (initialGamma180 + (50 * controlDirection)));
      var maxForward = Math.max((initialGamma180 + (5 * controlDirection)), (initialGamma180 + (50 * controlDirection)));
      var minReverse = Math.min((initialGamma180 - (50 * controlDirection)), (initialGamma180 - (5 * controlDirection)));
      var maxReverse = Math.max((initialGamma180 - (50 * controlDirection)), (initialGamma180 - (5 * controlDirection)));

      //constrain control input ranges to 0..180 continuous range
      minForward = Math.max(minForward, 0);
      maxForward = Math.min(maxForward, 180);
      minReverse = Math.max(minReverse, 0);
      maxReverse = Math.min(maxReverse, 180);

      if(gamma180 > minForward && gamma180 < maxForward) {
        // gamma in forward range
        if (controlDirection == -1) {
          throttle = remap(gamma180, minForward, maxForward, 1.0, 0.0);
        } else {
          throttle = remap(gamma180, minForward, maxForward, 0.0, 1.0);
        }
      } else if (gamma180 > minReverse && gamma180 < maxReverse) {
        // gamma in reverse range
        if (controlDirection == -1) {
          throttle = remap(gamma180, minReverse, maxReverse, 0.0, -1.0);
        } else  {
          throttle = remap(gamma180, minReverse, maxReverse, -1.0, 0.0);
        }
      }

      return throttle;
    };

}();


function toRadians (angle) {
  return angle * (Math.PI / 180);
}

function remap( x, oMin, oMax, nMin, nMax ){
  //range check
  if (oMin == oMax){
      console.log("Warning: Zero input range");
      return None;
  };

  if (nMin == nMax){
      console.log("Warning: Zero output range");
      return None
  }

  //check reversed input range
  var reverseInput = false;
  oldMin = Math.min( oMin, oMax );
  oldMax = Math.max( oMin, oMax );
  if (oldMin != oMin){
      reverseInput = true;
  }

  //check reversed output range
  var reverseOutput = false;
  newMin = Math.min( nMin, nMax )
  newMax = Math.max( nMin, nMax )
  if (newMin != nMin){
      reverseOutput = true;
  };

  var portion = (x-oldMin)*(newMax-newMin)/(oldMax-oldMin)
  if (reverseInput){
      portion = (oldMax-x)*(newMax-newMin)/(oldMax-oldMin);
  };

  var result = portion + newMin
  if (reverseOutput){
      result = newMax - portion;
  }

return result;
}



