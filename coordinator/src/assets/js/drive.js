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

function getMemory(args){
    const host = args['host'];
    const port = args['port'];
    data = JSON.stringify({
        'port': port,
        'host': host
    });
    return new Promise(function(resolve, reject){
        const jsonData = JSON.stringify(data);
        $.post('/vehicle-memory', data, function(result){
            resolve(result);
        });
    });
}

function startRecording(){
    const recordingIndicatorLight = document.querySelector('span#recordingDotAndText');
    recordingIndicatorLight.style.display = 'inline';
}

function stopRecording(){
    const recordingIndicatorLight = document.querySelector('span#recordingDotAndText');
    recordingIndicatorLight.style.display = 'none';
}

function applyBrake(){
    const brakeIcon = document.querySelector('span#applyBrakeButton');
    brakeIcon.style.display = 'inline';
}

function releaseBrake(){
    const brakeIcon = document.querySelector('span#applyBrakeButton');
    brakeIcon.style.display = 'none';
}

function adjustSpeedBar(barId, speed){
    const speedBar = document.querySelector("div#"+barId);
    const speedPercent = (speed * 100).toFixed(2) + '%';
    speedBar.style.height = speedPercent;
}

async function pollVehicleAndUpdateUI(){

    const userEngineToggle = document.querySelector("input#engine-toggle");
    const modelToggle = document.querySelector("input#model-toggle");
    const constantSpeed = document.querySelector("input#model-constant-speed-slider");

    memoryArgs = {
        'host' : serviceHost,
        'port' : 8095 // Don't hardcode this port
    }
    const result = await getMemory(memoryArgs);

    function getSpeed(result){
        if (result['dashboard/driver_type']=='user'){
            return result['ps3_controller/throttle']
        } else {
            return result['dashboard/model_constant_throttle'] / 100
        }
    }

    // Set speed
    const speed = getSpeed(result);
    adjustSpeedBar('driveSpeedBar',speed);
    const speedText = document.querySelector("div#driveSpeedText");
    speedText.textContent = (speed * 100).toFixed(0) + '%';

    // Show either the human steering or the model steering but not both simultaneously
    if (result['dashboard/driver_type']=='user') {
        const steering = result['ps3_controller/angle'];
        updateDonut(donuts.human,steering);
        const steeringText = document.querySelector("div#driveHumanSteeringText");
        steeringText.textContent = (steering * 100).toFixed(0) + '%';

        /*
        I only want to show either the model steering or the human steering,
        so if the model is turned on I should hide all of the human steering
        elements. The elements include the text that says "model", as well
        as the donut for the human steering, and the steering percentage text
        */
        // Hide all the model elements
        const modelSteeringElements = document.querySelectorAll("div.model-angle-col");
        for (const element of modelSteeringElements){
            element.style.display = 'none';
        }
        // Show all the human elements
        const humanSteeringElements = document.querySelectorAll("div.human-angle-col");
        for (const element of humanSteeringElements){
            element.style.display = 'block';
        }
    } else {

        /*
        I only want to show either the model steering or the human steering,
        so if the model is turned on I should hide all of the human steering
        elements. The elements include the text that says "human", as well
        as the donut for the human steering, and the steering percentage text
        */
        // Hide all of the human elements
        const humanSteeringElements = document.querySelectorAll("div.human-angle-col");
        for (const element of humanSteeringElements){
            element.style.display = 'none';
        }
        // Show all of the model elements
        const modelSteeringElements = document.querySelectorAll("div.model-angle-col");
        for (const element of modelSteeringElements){
            element.style.display = 'block';
        }

        function getModelSteering(result){
            if (result['dashboard/driver_type']=='remote_model') {
                return result['remote_model/angle']
            } else if(result['dashboard/driver_type']=='local_model') {
                return result['local_model/angle']
            }
        }
        const modelSteering = getModelSteering(result);
        updateDonut(donuts.ai,modelSteering);
        const modelSteeringText = document.querySelector("div#driveModelSteeringText");
        modelSteeringText.textContent = (modelSteering * 100).toFixed(0) + '%';
    }

    // Show the video when viewing the dashboard
    const dashboardWrapper = document.querySelector("#dashboard-wrapper");
    if (dashboardWrapper.style.display != 'none') {
        pollVehicleAndUpdateUI();
    }

    if (result["ps3_controller/recording"] == true){
        startRecording();
    } else {
        stopRecording();
    }

    /*
    Turns on an orange warning octagon when there are problems
    with parts running on the car (Pi). The control loop measures
    slowness by checking how long ago a part's last successful
    API request took place
    */
    const partSlownessIcon = document.querySelector("span#slowness-brake-icon");
    if (result["vehicle/brake"] == true){
        partSlownessIcon.style.display = 'inline';
    } else {
        partSlownessIcon.style.display = 'none';
    }

    if (result["ps3_controller/brake"] == true){
        applyBrake();
    } else {
        releaseBrake();
    }


}

/*
This will no longer be necessary once I move drive.js to Pi page
*/
var piHostname = '';

var initialBeta;

