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
