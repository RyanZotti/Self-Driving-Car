module.exports = function(css) {
    var TokenType = require('../token-types');

    var tokens = [],
        urlMode = false,
        blockMode = 0,
        c, // current character
        cn, // next character
        pos = 0,
        tn = 0,
        ln = 1,
        col = 1;

    var Punctuation = {
        ' ': TokenType.Space,
        '\n': TokenType.Newline,
        '\r': TokenType.Newline,
        '\t': TokenType.Tab,
        '!': TokenType.ExclamationMark,
        '"': TokenType.QuotationMark,
        '#': TokenType.NumberSign,
        '$': TokenType.DollarSign,
        '%': TokenType.PercentSign,
        '&': TokenType.Ampersand,
        '\'': TokenType.Apostrophe,
        '(': TokenType.LeftParenthesis,
        ')': TokenType.RightParenthesis,
        '*': TokenType.Asterisk,
        '+': TokenType.PlusSign,
        ',': TokenType.Comma,
        '-': TokenType.HyphenMinus,
        '.': TokenType.FullStop,
        '/': TokenType.Solidus,
        ':': TokenType.Colon,
        ';': TokenType.Semicolon,
        '<': TokenType.LessThanSign,
        '=': TokenType.EqualsSign,
        '==': TokenType.EqualitySign,
        '!=': TokenType.InequalitySign,
        '>': TokenType.GreaterThanSign,
        '?': TokenType.QuestionMark,
        '@': TokenType.CommercialAt,
        '[': TokenType.LeftSquareBracket,
        ']': TokenType.RightSquareBracket,
        '^': TokenType.CircumflexAccent,
        '_': TokenType.LowLine,
        '{': TokenType.LeftCurlyBracket,
        '|': TokenType.VerticalLine,
        '}': TokenType.RightCurlyBracket,
        '~': TokenType.Tilde
    };

    /**
     * Add a token to the token list
     * @param {string} type
     * @param {string} value
     */
    function pushToken(type, value, column) {
        tokens.push({
            tn: tn++,
            ln: ln,
            col: column,
            type: type,
            value: value
        });
    }

    /**
     * Check if a character is a decimal digit
     * @param {string} c Character
     * @returns {boolean}
     */
    function isDecimalDigit(c) {
        return '0123456789'.indexOf(c) >= 0;
    }

    /**
     * Parse spaces
     * @param {string} css Unparsed part of CSS string
     */
    function parseSpaces(css) {
        var start = pos;

        // Read the string until we meet a non-space character:
        for (; pos < css.length; pos++) {
            if (css.charAt(pos) !== ' ') break;
        }

        // Add a substring containing only spaces to tokens:
        pushToken(TokenType.Space, css.substring(start, pos--), col);
        col += pos - start;
    }

    /**
     * Parse a string within quotes
     * @param {string} css Unparsed part of CSS string
     * @param {string} q Quote (either `'` or `"`)
     */
    function parseString(css, q) {
        var start = pos;

        // Read the string until we meet a matching quote:
        for (pos++; pos < css.length; pos++) {
            // Skip escaped quotes:
            if (css.charAt(pos) === '\\') pos++;
            else if (css.charAt(pos) === q) break;
        }

        // Add the string (including quotes) to tokens:
        pushToken(q === '"' ? TokenType.StringDQ : TokenType.StringSQ, css.substring(start, pos + 1), col);
        col += pos - start;
    }

    /**
     * Parse numbers
     * @param {string} css Unparsed part of CSS string
     */
    function parseDecimalNumber(css) {
        var start = pos;

        // Read the string until we meet a character that's not a digit:
        for (; pos < css.length; pos++) {
            if (!isDecimalDigit(css.charAt(pos))) break;
        }

        // Add the number to tokens:
        pushToken(TokenType.DecimalNumber, css.substring(start, pos--), col);
        col += pos - start;
    }

    /**
     * Parse identifier
     * @param {string} css Unparsed part of CSS string
     */
    function parseIdentifier(css) {
        var start = pos;

        // Skip all opening slashes:
        while (css.charAt(pos) === '/') pos++;

        // Read the string until we meet a punctuation mark:
        for (; pos < css.length; pos++) {
            // Skip all '\':
            if (css.charAt(pos) === '\\') pos++;
            else if (css.charAt(pos) in Punctuation) break;
        }

        var ident = css.substring(start, pos--);

        // Enter url mode if parsed substring is `url`:
        urlMode = urlMode || ident === 'url';

        // Add identifier to tokens:
        pushToken(TokenType.Identifier, ident, col);
        col += pos - start;
    }

    /**
     * Parse equality sign
     * @param {string} sass Unparsed part of SASS string
     */
    function parseEquality(css) {
        pushToken(TokenType.EqualitySign, '==', col);
        pos++;
        col++;
    }

    /**
     * Parse inequality sign
     * @param {string} sass Unparsed part of SASS string
     */
    function parseInequality(css) {
        pushToken(TokenType.InequalitySign, '!=', col);
        pos++;
        col++;
    }

    /**
    * Parse a multiline comment
    * @param {string} css Unparsed part of CSS string
    */
    function parseMLComment(css) {
        var start = pos;

        // Get current indent level:
        var il = 0;
        for (var _pos = pos - 1; _pos > -1; _pos--) {
            // TODO: Can be tabs:
            if (css.charAt(_pos) === ' ') il++;
            else break;
        }

        for (pos += 2; pos < css.length; pos++) {
            if (css.charAt(pos) === '\n') {
                // Get new line's indent level:
                var _il = 0;
                for (var _pos = pos + 1; _pos < css.length; _pos++) {
                    if (css.charAt(_pos) === ' ') _il++;
                    else break;
                }

                if (_il > il) {
                    col = 0;
                    pos += _pos - pos;
                } else break;
            }
        }

        // Add full comment (including `/*`) to the list of tokens:
        var comment = css.substring(start, pos + 1);
        pushToken(TokenType.CommentML, comment, col);

       var newlines = comment.split('\n');
       if (newlines.length > 1) {
           ln += newlines.length - 1;
           col = newlines[newlines.length - 1].length;
       } else {
           col += (pos - start);
       }
    }

    /**
    * Parse a single line comment
    * @param {string} css Unparsed part of CSS string
    */
    function parseSLComment(css) {
        var start = pos;

        // Check if comment is the only token on the line, and if so,
        // get current indent level:
        var il = 0;
        var onlyToken = false;
        for (var _pos = pos - 1; _pos > -1; _pos--) {
            // TODO: Can be tabs:
            if (css.charAt(_pos) === ' ') il++;
            else if (css.charAt(_pos) === '\n') {
                onlyToken = true;
                break;
            } else break;
        }
        if (_pos === -1) onlyToken = true;

        // Read the string until we meet comment end.
        // Since we already know first 2 characters (`//`), start reading
        // from `pos + 2`:
        if (!onlyToken) {
            for (pos += 2; pos < css.length; pos++) {
                if (css.charAt(pos) === '\n' || css.charAt(pos) === '\r') {
                    break;
                }
            }
        } else {
            for (pos+=2; pos < css.length; pos++) {
                if (css.charAt(pos) === '\n') {
                    // Get new line's indent level:
                    var _il = 0;
                    for (var _pos = pos + 1; _pos < css.length; _pos++) {
                        if (css.charAt(_pos) === ' ') _il++;
                        else break;
                    }

                    if (_il > il) {
                        col = 0;
                        pos += _pos - pos;
                    } else break;
                }
            }
        }

        // Add comment (including `//` and line break) to the list of tokens:
        pushToken(TokenType.CommentSL, css.substring(start, pos--), col);
        col += pos - start;
    }

    /**
     * Convert a CSS string to a list of tokens
     * @param {string} css CSS string
     * @returns {Array} List of tokens
     * @private
     */
    function getTokens(css) {
        // Parse string, character by character:
        for (pos = 0; pos < css.length; col++, pos++) {
            c = css.charAt(pos);
            cn = css.charAt(pos + 1);

            // If we meet `/*`, it's a start of a multiline comment.
            // Parse following characters as a multiline comment:
            if (c === '/' && cn === '*') {
                parseMLComment(css);
            }

            // If we meet `//` and it is not a part of url:
            else if (!urlMode && c === '/' && cn === '/') {
                // If we're currently inside a block, treat `//` as a start
                // of identifier. Else treat `//` as a start of a single-line
                // comment:
                parseSLComment(css);
            }

            // If current character is a double or single quote, it's a start
            // of a string:
            else if (c === '"' || c === "'") {
                parseString(css, c);
            }

            // If current character is a space:
            else if (c === ' ') {
                parseSpaces(css);
            }

            // If current character is `=`, it must be combined with next `=`
            else if (c === '=' && cn === '=') {
                parseEquality(css);
            }

            // If we meet `!=`, this must be inequality
            else if (c === '!' && cn === '=') {
                parseInequality(css);
            }

            // If current character is a punctuation mark:
            else if (c in Punctuation) {
                // Add it to the list of tokens:
                pushToken(Punctuation[c], c, col);
                if (c === '\n' || c === '\r') {
                    ln++;
                    col = 0;
                } // Go to next line
                if (c === ')') urlMode = false; // exit url mode
                if (c === '{') blockMode++; // enter a block
                if (c === '}') blockMode--; // exit a block
            }

            // If current character is a decimal digit:
            else if (isDecimalDigit(c)) {
                parseDecimalNumber(css);
            }

            // If current character is anything else:
            else {
                parseIdentifier(css);
            }
        }

        return tokens;
    }

    return getTokens(css);
};
