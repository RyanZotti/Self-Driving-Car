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
    const readInput = JSON.stringify({
        'web_page': webPage,
        'name': name,
        'detail': detail
    });
    readToggle(readInput).then(function(is_on) {
        checkbox.checked = is_on;
    });
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
}
