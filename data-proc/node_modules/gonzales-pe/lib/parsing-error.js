var parserPackage = require('../package.json');

/**
 * @param {Error} e
 * @param {String} css
 */
function ParsingError(e, css) {
    this.line = e.line;
    this.syntax = e.syntax;
    this.css_ = css;
}

ParsingError.prototype = {
    /**
     * @type {Number}
     */
    line: null,

    /**
     * @type {String}
     */
    name: 'Parsing error',

    /**
     * @type {String}
     */
    syntax: null,

    /**
     * @type {String}
     */
    version: parserPackage.version,

    /**
     * @return {String}
     */
    toString: function() {
        return this.name + ': ' + this.message;
    },

    /**
     * @type {String}
     */
    get message() {
        return [
            'Please check the validity of the block starting from line #' + this.line,
            '',
            this.codeFragment_,
            '',
            'Gonzales PE version: ' + this.version,
            'Syntax: ' + this.syntax
        ].join('\n');
    },

    /**
     * @type {String}
     */
    get codeFragment_() {
        var LINES_AROUND = 2;

        var result = [];
        var currentLineNumber = this.line;
        var start = currentLineNumber - 1 - LINES_AROUND;
        var end = currentLineNumber + LINES_AROUND;
        var lines = this.css_.split(/\r\n|\r|\n/);

        for (var i = start; i < end; i++) {
            var line = lines[i];
            if (!line) continue;
            var ln = i + 1;
            var mark = ln === currentLineNumber ? '*' : ' ';
            result.push(ln + mark + '| ' + line);
        }

        return result.join('\n');
    }
};

module.exports = ParsingError;
