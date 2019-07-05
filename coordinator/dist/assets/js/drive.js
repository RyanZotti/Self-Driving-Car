/*
Device Orientation Docs
  - Gamma:
    - https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/gamma
    - Device allows values between -90 and 90
  - Beta:
    - https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/beta
    - Device allows values between -180 and 180
*/

function gammaToSteering(gamma){
    // Lower scale is more sensitive, higher scale is less sensitive
    const scale = 30;
    const limited = Math.min(Math.max(gamma,-scale),scale)
    const steering = (limited / scale);
    return steering;
}

function betaToSpeed(beta){
    // Lower scale is more sensitive, higher scale is less sensitive
    const scale = 30;
    /*
    Assume initial orientation is 0% speed. Tilting the
    top of the phone downwards reduces beta, so if you
    want a beta number that increases as speed increases
    (assuming the user angles the top lower to speed up),
    you should subtract the current beta from the initial
    beta rather than the other way around, since initial
    beta will always be higher than later betas
    */
    const cappedBeta =  Math.min(beta, initialBeta)
    const capAndflooredBeta = Math.max(cappedBeta, initialBeta - scale);
    const changeFromInitialBeta = initialBeta - capAndflooredBeta;
    const speed = (changeFromInitialBeta / scale);
    return speed;
}

function updateDriveState(userSteering, userSpeed, driveMode, isRecording, isBrakeOn, speedMultiplier){
    if (isRecording == true){
        recordingRecordId = recordingRecordId + 1;
    }
    data = JSON.stringify({
        'angle': userSteering,
        'throttle':userSpeed,
        'driver_type':driveMode,
        'recording': isRecording,
        'brake':isBrakeOn,
        'max_throttle':speedMultiplier,
        'dataset':recordingDataset,
        'record_id':recordingRecordId
    });
    $.post('/update-drive-state', data);
}

function captureDeviceOrientation(event) {
    // Get device orientation values
    const beta = event.beta;
    const gamma = event.gamma;
    /*
    The initialBeta variable saves users from having to hold
    their devices perfectly vertical. Uses the starting
    vertical orientation at start. The initialBeta variable is
    reset to null when the user clicks the close modal window button
    */
    if(initialBeta == null){
        initialBeta = beta;
        /*
        If initialBeta is not set, then there is no meaningful
        speed measurement for this iteration, so you should
        skip the settings
        */
    } else {
        // Set speed
        const speed = betaToSpeed(beta);
        adjustSpeedBar('driveSpeedBar',speed);
        const speedText = document.querySelector("div#driveSpeedText");
        speedText.textContent = (speed * 100).toFixed(0) + '%';
        // Set steering
        const steering = gammaToSteering(gamma);
        updateDonut(donuts.drive,steering);
        const steeringText = document.querySelector("div#driveHumanSteeringText");
        steeringText.textContent = (steering * 100).toFixed(0) + '%';
        updateDriveState(
            steering,
            speed,
            driveMode,
            isRecording,
            isBrakeOn,
            speedMultiplier
        );
    }
}

function pollVehicleAndUpdateUI(){
    $.get('/vehicle-memory', function(result){
        // Set speed
        const speed = result['user_input/throttle'];
        adjustSpeedBar('driveSpeedBar',speed);
        const speedText = document.querySelector("div#driveSpeedText");
        speedText.textContent = (speed * 100).toFixed(0) + '%';
        // Set steering
        const steering = result['user_input/angle'];
        updateDonut(donuts.drive,steering);
        const steeringText = document.querySelector("div#driveHumanSteeringText");
        steeringText.textContent = (steering * 100).toFixed(0) + '%';
        // isDriveModalOpen gets toggled on/off when modal is opened/closed
        if (isDriveModalOpen == true) {
            pollVehicleAndUpdateUI();
        }
    });
}

// Used to check if vehicle state should be polled
var isDriveModalOpen = false;

var initialBeta;

