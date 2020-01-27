// https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro/35385518#35385518
function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

function getHtmlString(url) {
    return new Promise(function(resolve, reject) {
        $.get( url, function(htmlString) {
            resolve(htmlString);
        });
    });
}

async function getHtml(url){
    const htmlString = await getHtmlString(url);
    const html = htmlToElement(htmlString);
    return html
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x, y, radius, startAngle, endAngle){
    var start = polarToCartesian(x, y, radius, endAngle);
    var end = polarToCartesian(x, y, radius, startAngle);
    var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    var d = [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
    return d;
}

/**
 * @param {element} svg - SVG element containing the circle progress
 * @param {int} percent - Amount between 0 and 100
 */
function updateProgressCircle(svg,rawPercent){
    const percent = rawPercent.toFixed(0);
    /*
     * My circular path function fails with I specify a full 360
     * degrees, so I rely on a circle svg instead when I want to
     * show a complete circle
     */
    const fullGreenCircle = svg.querySelector("circle.full-circle-progress");
    const partialGreenCircle = svg.querySelector("path.partial-circle-progress");
    const progressText = svg.querySelector("text.circle-progress-text");
    if (percent == 100){
        fullGreenCircle.style.display = 'block';
        partialGreenCircle.style.display = 'none';
        progressText.textContent = percent;
    } else {
        fullGreenCircle.style.display = 'none';
        partialGreenCircle.style.display = 'block';
        const centerX = 0;
        const centerY = 0;
        const radius = 40;
        const startAngle = 0;
        const endAngle = (360 * (percent/100)).toFixed(0);
        partialGreenCircle.setAttribute("d", describeArc(centerX, centerY, radius, startAngle, endAngle));
        progressText.textContent = percent;
    }
}

function writeToggle(input) {
    return new Promise(function(resolve, reject) {
        $.post('/write-toggle', input, function(){
            resolve();
        });
    });
}

function readToggle(input) {
    return new Promise(function(resolve, reject) {
        $.post('/read-toggle', input, function(output){
            resolve(output['is_on']);
        });
    });
}

function writeSlider(input) {
    return new Promise(function(resolve, reject) {
        $.post('/write-slider', input, function(){
            resolve();
        });
    });
}

function readSlider(input) {
    return new Promise(function(resolve, reject) {
        $.post('/read-slider', input, function(output){
            resolve(output['amount']);
        });
    });
}

function raspberryPiConnectionTest() {
    return new Promise(function(resolve, reject) {
        $.ajax({
            method: 'POST',
            url: '/raspberry-pi-healthcheck',
            timeout: 1000,
            success: function(response) {
                resolve(response['is_able_to_connect']);
            },
            error: function(){
                resolve(false);
            }
        });
    });
}

function piServiceHealth(json_input){
    return new Promise(function(resolve, reject) {
        $.ajax({
            method: 'POST',
            url: '/pi-service-health',
            timeout: 1000,
            data: JSON.stringify(json_input),
            success: function(response) {
                resolve(response['is_healthy']);
            },
            error: function(){
                resolve(false);
            }
        });
    });
}

async function updateToggleHtmlFromDB(checkbox){
    const webPage = checkbox.getAttribute('toggle-web-page');
    const name = checkbox.getAttribute('toggle-name');
    const detail = checkbox.getAttribute('toggle-detail');
    const readInput = JSON.stringify({
            'web_page': webPage,
            'name': name,
            'detail': detail
    });
    const is_on = await readToggle(readInput);
    checkbox.checked = is_on;
}

function configureToggle(checkbox){
    const webPage = checkbox.getAttribute('toggle-web-page');
    const name = checkbox.getAttribute('toggle-name');
    const detail = checkbox.getAttribute('toggle-detail');
    checkbox.onclick = function(){
        const writeInput = JSON.stringify({
            'web_page': webPage,
            'name': name,
            'detail': detail,
            'is_on': checkbox.checked
        });
        writeToggle(writeInput);
    }
    const checkToggleTime = setInterval(function(){
        updateToggleHtmlFromDB(checkbox);
    }, 5000);

}

async function updatePiConnectionStatuses(){
    const statuses = document.querySelectorAll('span.raspberry-pi-connection-status');
    const isHealthy = await raspberryPiConnectionTest();
    if(isHealthy == true){
        for (const status of statuses){
            status.classList.remove('text-danger');
            status.classList.add('text-success');
            status.style.display = 'inline';
        }
    } else {
        for (const status of statuses){
            status.classList.remove('text-success');
            status.classList.add('text-danger');
            status.style.display = 'inline';
        }
    }
    return isHealthy
}

/*
Prior to writing this function I would recreate the
steering / angle donut everytime I changed rotation.
While this didn't have any noticeable impact on the
laptop it caused massive CPU utilization on iOS and
made the iPhone experience awful -- the entire UI
would go unresponive, the app would crash and you
would have to do a hard refresh just to re-open the
modal. The fix is to create the donuts once and
simply update the values of existing objects
*/
function makeDonut(donutId){
    const options = {
        'cutoutPercentage':50,
        'rotation':0,
        'animation': {
            'animateRotate':false
        }
    }
    const donut = new Chart(donutId, {
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
    return donut;
}

function updateDonut(donut, angle){
    /*
    Angle is between -1 and 1 so need to scale
    to rotate donut appropriately. Full left is
    -0.5, middle is 0.0, and full right is 0.5
    */
    const scaledAngle = angle / 2;
    const rotation = scaledAngle * Math.PI;
    donut.options.rotation = rotation;
    donut.update();
}

async function configureSlider(config){
    const inputQuery = JSON.stringify({
        'web_page': config['web_page'],
        'name': config['name']
    });
    const startAmount = await readSlider(inputQuery);
    const sliderId = config['sliderId'];
    const slider = $("#"+sliderId);
    slider.attr("data-slider-value",startAmount);
    slider.attr("data-slider-step",config['step']);
    slider.attr("data-slider-max",config['max']);
    slider.attr("data-slider-min",config['min']);
    slider.slider();
    const sliderTextId = sliderId + "-text";
    const sliderText = $("#"+sliderTextId);
    // Initialize
    if (config['type']=='percent'){
        sliderText.text(startAmount+"%");
    } else if (config['type']=='reduceFactor') {
        sliderText.text('1/'+startAmount);
    } else {
        sliderText.text(startAmount);
    }
    // Change on slide
    slider.on("slide", function(slideEvent) {
        if (config['type']=='percent'){
            sliderText.text(slideEvent.value+"%");
        } else if (config['type']=='reduceFactor') {
            sliderText.text('1/'+slideEvent.value);
        } else {
            sliderText.text(slideEvent.value);
        }
        const input = JSON.stringify({
            'web_page': config['web_page'],
            'name': config['name'],
            'amount': slideEvent.value
        });
        writeSlider(input);
    });
}

function deployModel(data) {
    return new Promise(function(resolve, reject){
        const jsonData = JSON.stringify(data);
        $.post('/deploy-model', jsonData, function(result){
            resolve(result);
        });
    });
}

function getModelDeployments(){
    return new Promise(function(resolve, reject){
        $.post('/list-model-deployments', function(result){
           resolve(result)
        });
    });
}

function deploymentHealth(device) {
    return new Promise(function(resolve, reject){
        const jsonData = JSON.stringify({
            'device':device
        });
        $.post('/deployment-health', jsonData, function(result){
            resolve(result);
        });
    });
}

/*
Checks which model is expected to be deployed, sees if
that model's prediction microservice is up running, and
deploys it if not
*/
async function pollDeployment(){
    const deployments = await getModelDeployments();
    // TODO: Support Pi deployment
    const device = 'laptop';
    deployment = deployments[device]
    // Deploy if you expect a model but it is not running
    if (deployment['model_id'] != 'N/A'){
        const healthcheck = await deploymentHealth(device);
        // Deploy if it's not running
        if (healthcheck['is_alive']==false) {
            deployModel({
               'device':device
            });
            console.log('is not alive');
        } else {
            console.log('is alive');
            // If it is running, check that's it up-to-date
            if (parseInt(deployment['model_id'])!=parseInt(healthcheck['model_id']) ||
              parseInt(deployment['epoch_id'])!=parseInt(healthcheck['epoch_id'])) {
                deployModel({
                   'device':device
                });
            }
        }
    }
}

/*
Call like this:
    measureLatency(getAiAngle('dataset_5_18-10-20',460))
*/
async function measureLatency(functionTested){
    const start = new Date();
    await functionTested
    const end = new Date();
    const seconds = (end.getTime() - start.getTime()) / 1000;
    return seconds
}

// Got code example from here: https://codehandbook.org/javascript-date-format/
// Returns in format: "2018-10-19 17:25:56"
function getDateTime(){
    const current_datetime = new Date()
    const formatted_date = current_datetime.getFullYear() + "-" + (current_datetime.getMonth() + 1) + "-" + current_datetime.getDate() + " " + current_datetime.getHours() + ":" + current_datetime.getMinutes() + ":" + current_datetime.getSeconds()
    return formatted_date
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
