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
function updateProgressCircle(svg,percent){

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
