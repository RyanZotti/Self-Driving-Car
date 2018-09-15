var fs = require('fs');
var ParsingError = require('./parsing-error');

var Defaults = {
    SYNTAX: 'css',
    NEED_INFO: false,
    CSS_RULE: 'stylesheet',
    JS_RULE: 'program'
};

/**
 * @param {String} css
 * @param {Object} options
 * @return {Object} AST
 */
function parse(css, options) {
    if (!css || typeof css !== 'string')
        throw new Error('Please, pass a string to parse');

    var syntax = options && options.syntax || Defaults.SYNTAX;
    var needInfo = options && options.needInfo || Defaults.NEED_INFO;
    var rule = options && options.rule ||
        (syntax === 'js' ? Defaults.JS_RULE : Defaults.CSS_RULE);

    if (!fs.existsSync(__dirname + '/' + syntax))
        return console.error('Syntax "' + syntax + '" is not supported yet, sorry');

    var getTokens = require('./' + syntax + '/tokenizer');
    var mark = require('./' + syntax + '/mark');
    var parse = require('./' + syntax + '/parse');

    var tokens = getTokens(css);
    mark(tokens);

    try {
        return parse(tokens, rule, needInfo);
    } catch (e) {
        throw new ParsingError(e, css);
    }
}

module.exports = parse;
