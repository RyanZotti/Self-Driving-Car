var Node = require('../node');
var NodeType = require('../node-types');
var TokenType = require('../token-types');

/**
 * @type {Array}
 */
var tokens;

/**
 * @type {Number}
 */
var tokensLength;

/**
 * @type {Number}
 */
var pos;

var rules = {
    'arguments': function() { return checkArguments(pos) && getArguments(); },
    'atkeyword': function() { return checkAtkeyword(pos) && getAtkeyword(); },
    'atruleb': function() { return checkAtruleb(pos) && getAtruleb(); },
    'atruler': function() { return checkAtruler(pos) && getAtruler(); },
    'atrulerq': function() { return checkAtrulerq(pos) && getAtrulerq(); },
    'atrulers': function() { return checkAtrulers(pos) && getAtrulers(); },
    'atrules': function() { return checkAtrules(pos) && getAtrules(); },
    'attrib': function() { return checkAttrib(pos) && getAttrib(); },
    'attrselector': function() { return checkAttrselector(pos) && getAttrselector(); },
    'block': function() { return checkBlock(pos) && getBlock(); },
    'braces': function() { return checkBraces(pos) && getBraces(); },
    'class': function() { return checkClass(pos) && getClass(); },
    'combinator': function() { return checkCombinator(pos) && getCombinator(); },
    'commentML': function() { return checkCommentML(pos) && getCommentML(); },
    'declaration': function() { return checkDeclaration(pos) && getDeclaration(); },
    'declDelim': function() { return checkDeclDelim(pos) && getDeclDelim(); },
    'delim': function() { return checkDelim(pos) && getDelim(); },
    'dimension': function() { return checkDimension(pos) && getDimension(); },
    'filter': function() { return checkFilter(pos) && getFilter(); },
    'filterv': function() { return checkFilterv(pos) && getFilterv(); },
    'functionExpression': function() { return checkFunctionExpression(pos) && getFunctionExpression(); },
    'function': function() { return checkFunction(pos) && getFunction(); },
    'ident': function() { return checkIdent(pos) && getIdent(); },
    'important': function() { return checkImportant(pos) && getImportant(); },
    'namespace': function() { return checkNamespace(pos) && getNamespace(); },
    'nth': function() { return checkNth(pos) && getNth(); },
    'nthselector': function() { return checkNthselector(pos) && getNthselector(); },
    'number': function() { return checkNumber(pos) && getNumber(); },
    'operator': function() { return checkOperator(pos) && getOperator(); },
    'percentage': function() { return checkPercentage(pos) && getPercentage(); },
    'progid': function() { return checkProgid(pos) && getProgid(); },
    'property': function() { return checkProperty(pos) && getProperty(); },
    'propertyDelim': function() { return checkPropertyDelim(pos) && getPropertyDelim(); },
    'pseudoc': function() { return checkPseudoc(pos) && getPseudoc(); },
    'pseudoe': function() { return checkPseudoe(pos) && getPseudoe(); },
    'ruleset': function() { return checkRuleset(pos) && getRuleset(); },
    's': function() { return checkS(pos) && getS(); },
    'selector': function() { return checkSelector(pos) && getSelector(); },
    'shash': function() { return checkShash(pos) && getShash(); },
    'simpleselector': function() { return checkSimpleSelector(pos) && getSimpleSelector(); },
    'string': function() { return checkString(pos) && getString(); },
    'stylesheet': function() { return checkStylesheet(pos) && getStylesheet(); },
    'unary': function() { return checkUnary(pos) && getUnary(); },
    'uri': function() { return checkUri(pos) && getUri(); },
    'value': function() { return checkValue(pos) && getValue(); },
    'vhash': function() { return checkVhash(pos) && getVhash(); }
};

/**
 * Stop parsing and display error
 * @param {Number=} i Token's index number
 */
function throwError(i) {
    var ln = tokens[i].ln;

    throw {line: ln, syntax: 'css'};
}

/**
 * @param {Object} exclude
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkExcluding(exclude, i) {
    var start = i;

    while(i < tokensLength) {
        if (exclude[tokens[i++].type]) break;
    }

    return i - start - 2;
}

/**
 * @param {Number} start
 * @param {Number} finish
 * @return {String}
 */
function joinValues(start, finish) {
    var s = '';

    for (var i = start; i < finish + 1; i++) {
        s += tokens[i].value;
    }

    return s;
}

/**
 * @param {Number} start
 * @param {Number} num
 * @return {String}
 */
function joinValues2(start, num) {
    if (start + num - 1 >= tokensLength) return;

    var s = '';

    for (var i = 0; i < num; i++) {
        s += tokens[start + i].value;
    }

    return s;
}


/////////////////////////////////////
/////////////////////////////////////
/////////////////////////////////////


/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkAny(i) {
    var l;

    if (l = checkBraces(i)) tokens[i].any_child = 1;
    else if (l = checkString(i)) tokens[i].any_child = 2;
    else if (l = checkPercentage(i)) tokens[i].any_child = 3;
    else if (l = checkDimension(i)) tokens[i].any_child = 4;
    else if (l = checkNumber(i)) tokens[i].any_child = 5;
    else if (l = checkUri(i)) tokens[i].any_child = 6;
    else if (l = checkFunctionExpression(i)) tokens[i].any_child = 7;
    else if (l = checkFunction(i)) tokens[i].any_child = 8;
    else if (l = checkIdent(i)) tokens[i].any_child = 9;
    else if (l = checkClass(i)) tokens[i].any_child = 10;
    else if (l = checkUnary(i)) tokens[i].any_child = 11;

    return l;
}

/**
 * @return {Node}
 */
function getAny() {
    var childType = tokens[pos].any_child;

    if (childType === 1) return getBraces();
    else if (childType === 2) return getString();
    else if (childType === 3) return getPercentage();
    else if (childType === 4) return getDimension();
    else if (childType === 5) return getNumber();
    else if (childType === 6) return getUri();
    else if (childType === 7) return getFunctionExpression();
    else if (childType === 8) return getFunction();
    else if (childType === 9) return getIdent();
    else if (childType === 10) return getClass();
    else if (childType === 11) return getUnary();
}

/**
 * Check if token is part of an @-word (e.g. `@import`, `@include`)
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkAtkeyword(i) {
    var l;

    // Check that token is `@`:
    if (i >= tokensLength ||
        tokens[i++].type !== TokenType.CommercialAt) return 0;

    return (l = checkIdent(i)) ? l + 1 : 0;
}

/**
 * Get node with @-word
 * @return {Node}
 */
function getAtkeyword() {
    var type = NodeType.AtkeywordType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [];

    pos++;

    content.push(getIdent());

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of an attribute selector (e.g. `[attr]`,
 *      `[attr='panda']`)
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkAttrib(i) {
    if (i >= tokensLength ||
        tokens[i].type !== TokenType.LeftSquareBracket ||
        !tokens[i].right) return 0;

    return tokens[i].right - i + 1;
}

/**
 * Get node with an attribute selector
 * @return {Node}
 */
function getAttrib() {
    if (checkAttrib1(pos)) return getAttrib1();
    if (checkAttrib2(pos)) return getAttrib2();
}

/**
 * Check if token is part of an attribute selector of the form `[attr='value']`
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkAttrib1(i) {
    var start = i,
        l;

    if (i++ >= tokensLength) return 0;

    if (l = checkSC(i)) i += l;

    if (l = checkIdent(i)) i += l;
    else return 0;

    if (l = checkSC(i)) i += l;

    if (l = checkAttrselector(i)) i += l;
    else return 0;

    if (l = checkSC(i)) i += l;

    if (l = checkIdent(i) || checkString(i)) i += l;
    else return 0;

    if (l = checkSC(i)) i += l;

    return tokens[i].type === TokenType.RightSquareBracket ? i - start : 0;
}

/**
 * Get node with an attribute selector of the form `[attr='value']`
 * @return {Node}
 */
function getAttrib1() {
    var type = NodeType.AttribType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [];

    pos++;

    content = content
        .concat(getSC())
        .concat([getIdent()])
        .concat(getSC())
        .concat([getAttrselector()])
        .concat(getSC())
        .concat([checkString(pos)? getString() : getIdent()])
        .concat(getSC());

    pos++;

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of an attribute selector of the form `[attr]`
 * Attribute can not be empty, e.g. `[]`.
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkAttrib2(i) {
    var start = i,
        l;

    if (i++ >= tokensLength) return 0;

    if (l = checkSC(i)) i += l;

    if (l = checkIdent(i)) i += l;
    else return 0;

    if (l = checkSC(i)) i += l;

    return tokens[i].type === TokenType.RightSquareBracket ? i - start : 0;
}

/**
 * Get node with an attribute selector of the form `[attr]`
 * @return {Node}
 */
function getAttrib2() {
    var type = NodeType.AttribType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [];

    pos++;

    content = content
        .concat(getSC())
        .concat([getIdent()])
        .concat(getSC());

    pos++;

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of an attribute selector operator (`=`, `~=`,
 *      `^=`, `$=`, `*=` or `|=`)
 * @param {Number} i Token's index number
 * @return {Number} Length of operator (`0` if token is not part of an
 *       operator, `1` or `2` if it is).
 */
function checkAttrselector(i) {
    if (i >= tokensLength) return 0;

    if (tokens[i].type === TokenType.EqualsSign) return 1;

    // TODO: Add example or remove
    if (tokens[i].type === TokenType.VerticalLine &&
        (!tokens[i + 1] || tokens[i + 1].type !== TokenType.EqualsSign))
        return 1;

    if (!tokens[i + 1] || tokens[i + 1].type !== TokenType.EqualsSign) return 0;

    switch(tokens[i].type) {
        case TokenType.Tilde:
        case TokenType.CircumflexAccent:
        case TokenType.DollarSign:
        case TokenType.Asterisk:
        case TokenType.VerticalLine:
            return 2;
    }

    return 0;
}

/**
 * Get node with an attribute selector operator (`=`, `~=`, `^=`, `$=`,
 *      `*=` or `|=`)
 * @return {Node}
 */
function getAttrselector() {
    var type = NodeType.AttrselectorType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = tokens[pos].value;

    pos++;

    if (tokens[pos] && tokens[pos].type === TokenType.EqualsSign)
        content += tokens[pos++].value;

    return new Node(type, content, line, column);
}

/**
 * Check if token is a part of an @-rule
 * @param {Number} i Token's index number
 * @return {Number} Length of @-rule
 */
function checkAtrule(i) {
    var l;

    if (i >= tokensLength) return 0;

    // If token already has a record of being part of an @-rule,
    // return the @-rule's length:
    if (tokens[i].atrule_l !== undefined) return tokens[i].atrule_l;

    // If token is part of an @-rule, save the rule's type to token:
    if (l = checkAtruler(i)) tokens[i].atrule_type = 1; // @-rule with ruleset
    else if (l = checkAtruleb(i)) tokens[i].atrule_type = 2; // block @-rule
    else if (l = checkAtrules(i)) tokens[i].atrule_type = 3; // single-line @-rule
    else return 0;

    // If token is part of an @-rule, save the rule's length to token:
    tokens[i].atrule_l = l;

    return l;
}

/**
 * Get node with @-rule
 * @return {Node}
 */
function getAtrule() {
    switch (tokens[pos].atrule_type) {
        case 1: return getAtruler(); // @-rule with ruleset
        case 2: return getAtruleb(); // block @-rule
        case 3: return getAtrules(); // single-line @-rule
    }
}

/**
 * Check if token is part of a block @-rule
 * @param {Number} i Token's index number
 * @return {Number} Length of the @-rule
 */
function checkAtruleb(i) {
    var start = i,
        l;

    if (i >= tokensLength) return 0;

    if (l = checkAtkeyword(i)) i += l;
    else return 0;

    if (l = checkTsets(i)) i += l;

    if (l = checkBlock(i)) i += l;
    else return 0;

    return i - start;
}

/**
 * Get node with a block @-rule
 * @return {Node}
 */
function getAtruleb() {
    var type = NodeType.AtrulebType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [getAtkeyword()]
            .concat(getTsets())
            .concat([getBlock()]);

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of an @-rule with ruleset
 * @param {Number} i Token's index number
 * @return {Number} Length of the @-rule
 */
function checkAtruler(i) {
    var start = i,
        l;

    if (i >= tokensLength) return 0;

    if (l = checkAtkeyword(i)) i += l;
    else return 0;

    if (l = checkAtrulerq(i)) i += l;

    if (i < tokensLength && tokens[i].type === TokenType.LeftCurlyBracket) i++;
    else return 0;

    if (l = checkAtrulers(i)) i += l;

    if (i < tokensLength && tokens[i].type === TokenType.RightCurlyBracket) i++;
    else return 0;

    return i - start;
}

/**
 * Get node with an @-rule with ruleset
 * @return {Node}
 */
function getAtruler() {
    var type = NodeType.AtrulerType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [getAtkeyword(), getAtrulerq()];

    pos++;

    content.push(getAtrulers());

    pos++;

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkAtrulerq(i) {
    return checkTsets(i);
}

/**
 * @return {Node}
 */
function getAtrulerq() {
    var type = NodeType.AtrulerqType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = getTsets();

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkAtrulers(i) {
    var start = i,
        l;

    if (i >= tokensLength) return 0;

    if (l = checkSC(i)) i += l;

    while (i < tokensLength) {
        if (l = checkSC(i)) tokens[i].atrulers_child = 1;
        else if (l = checkAtrule(i)) tokens[i].atrulers_child = 2;
        else if (l = checkRuleset(i)) tokens[i].atrulers_child = 3;
        else break;
        i += l;
    }

    tokens[i].atrulers_end = 1;

    if (l = checkSC(i)) i += l;

    return i - start;
}

/**
 * @return {Node}
 */
function getAtrulers() {
    var type = NodeType.AtrulersType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = getSC();

    while (!tokens[pos].atrulers_end) {
        var childType = tokens[pos].atrulers_child;
        if (childType === 1) content = content.concat(getSC());
        else if (childType === 2) content.push(getAtrule());
        else if (childType === 3) content.push(getRuleset());
    }

    content = content.concat(getSC());

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkAtrules(i) {
    var start = i,
        l;

    if (i >= tokensLength) return 0;

    if (l = checkAtkeyword(i)) i += l;
    else return 0;

    if (l = checkTsets(i)) i += l;

    return i - start;
}

/**
 * @return {Node}
 */
function getAtrules() {
    var type = NodeType.AtrulesType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [getAtkeyword()].concat(getTsets());

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of a block (e.g. `{...}`).
 * @param {Number} i Token's index number
 * @return {Number} Length of the block
 */
function checkBlock(i) {
    return i < tokensLength && tokens[i].type === TokenType.LeftCurlyBracket ?
        tokens[i].right - i + 1 : 0;
}

/**
 * Get node with a block
 * @return {Node}
 */
function getBlock() {
    var type = NodeType.BlockType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [],
        end = tokens[pos++].right,
        content = [];

    while (pos < end) {
        if (checkBlockdecl(pos)) content = content.concat(getBlockdecl());
        else throwError(pos);
    }

    pos = end + 1;

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of a declaration (property-value pair)
 * @param {Number} i Token's index number
 * @return {Number} Length of the declaration
 */
function checkBlockdecl(i) {
    var l;

    if (i >= tokensLength) return 0;

    if (l = checkBlockdecl1(i)) tokens[i].bd_type = 1;
    else if (l = checkBlockdecl2(i)) tokens[i].bd_type = 2;
    else if (l = checkBlockdecl3(i)) tokens[i].bd_type = 3;
    else if (l = checkBlockdecl4(i)) tokens[i].bd_type = 4;
    else return 0;

    return l;
}

/**
 * @return {Array}
 */
function getBlockdecl() {
    switch (tokens[pos].bd_type) {
        case 1: return getBlockdecl1();
        case 2: return getBlockdecl2();
        case 3: return getBlockdecl3();
        case 4: return getBlockdecl4();
    }
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkBlockdecl1(i) {
    var start = i,
        l;

    if (l = checkSC(i)) i += l;

    if (l = checkFilter(i)) tokens[i].bd_kind = 1;
    else if (l = checkDeclaration(i)) tokens[i].bd_kind = 2;
    else if (l = checkAtrule(i)) tokens[i].bd_kind = 3;
    else return 0;

    i += l;

    if (l = checkSC(i)) i += l;

    if (i < tokensLength && (l = checkDeclDelim(i))) i += l;
    else return 0;

    if (l = checkSC(i)) i += l;
    else return 0;

    return i - start;
}

/**
 * @return {Array}
 */
function getBlockdecl1() {
    var sc = getSC(),
        x;

    switch (tokens[pos].bd_kind) {
        case 1:
            x = getFilter();
            break;
        case 2:
            x = getDeclaration();
            break;
        case 3:
            x = getAtrule();
            break;
    }

    return sc
        .concat([x])
        .concat(getSC())
        .concat([getDeclDelim()])
        .concat(getSC());
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkBlockdecl2(i) {
    var start = i,
        l;

    if (l = checkSC(i)) i += l;

    if (l = checkFilter(i)) tokens[i].bd_kind = 1;
    else if (l = checkDeclaration(i)) tokens[i].bd_kind = 2;
    else if (l = checkAtrule(i)) tokens[i].bd_kind = 3;
    else return 0;

    i += l;

    if (l = checkSC(i)) i += l;

    return i - start;
}

/**
 * @return {Array}
 */
function getBlockdecl2() {
    var sc = getSC(),
        x;

    switch (tokens[pos].bd_kind) {
        case 1:
            x = getFilter();
            break;
        case 2:
            x = getDeclaration();
            break;
        case 3:
            x = getAtrule();
            break;
    }

    return sc
        .concat([x])
        .concat(getSC());
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkBlockdecl3(i) {
    var start = i,
        l;

    if (l = checkSC(i)) i += l;

    if (l = checkDeclDelim(i)) i += l;
    else return 0;

    if (l = checkSC(i)) i += l;

    return i - start;
}

/**
 * @return {Array}
 */
function getBlockdecl3() {
    return getSC()
        .concat([getDeclDelim()])
        .concat(getSC());
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkBlockdecl4(i) {
    return checkSC(i);
}

/**
 * @return {Array}
 */
function getBlockdecl4() {
    return getSC();
}

/**
 * Check if token is part of text inside parentheses or square brackets
 *      (e.g. `(1)`)
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkBraces(i) {
    if (i >= tokensLength ||
        (tokens[i].type !== TokenType.LeftParenthesis &&
        tokens[i].type !== TokenType.LeftSquareBracket)) return 0;

    return tokens[i].right - i + 1;
}

/**
 * Get node with text inside parentheses or square brackets (e.g. `(1)`)
 * @return {Node}
 */
function getBraces() {
    var type = NodeType.BracesType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        left = pos,
        right = tokens[pos++].right;
        content = [tokens[left].value, tokens[right].value]
            .concat(getTsets());

    pos++;

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of a class selector (e.g. `.abc`)
 * @param {Number} i Token's index number
 * @return {Number} Length of the class selector
 */
function checkClass(i) {
    var l;

    if (i >= tokensLength) return 0;

    if (tokens[i].class_l) return tokens[i].class_l;

    if (tokens[i++].type === TokenType.FullStop && (l = checkIdent(i))) {
        tokens[i].class_l = l + 1;
        return l + 1;
    }

    return 0;
}

/**
 * Get node with a class selector
 * @return {Node}
 */
function getClass() {
    var type = NodeType.ClassType,
        token = tokens[pos++],
        line = token.ln,
        column = token.col,
        content = [getIdent()];

    return new Node(type, content, line, column);
}

/**
 * Check if token is a combinator (`+`, `>` or `~`)
 * @param {Number} i Token's index number
 * @return {Number} Length of the combinator
 */
function checkCombinator(i) {
    if (i >= tokensLength) return 0;

    switch (tokens[i].type) {
        case TokenType.PlusSign:
        case TokenType.GreaterThanSign:
        case TokenType.Tilde:
            return 1;
    }

    return 0;
}

/**
 * Get node with a combinator (`+`, `>` or `~`)
 * @return {Node}
 */
function getCombinator() {
    var type = NodeType.CombinatorType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = tokens[pos++].value;

    return new Node(type, content, line, column);
}

/**
 * Check if token is a multiline comment.
 * @param {Number} i Token's index number
 * @return {Number} `1` if token is a multiline comment, otherwise `0`
 */
function checkCommentML(i) {
    return i < tokensLength && tokens[i].type === TokenType.CommentML ? 1 : 0;
}

/**
 * Get node with a multiline comment
 * @return {Node}
 */
function getCommentML() {
    var type = NodeType.CommentMLType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = tokens[pos].value.substring(2),
        l = content.length;

    if (content.charAt(l - 2) === '*' && content.charAt(l - 1) === '/')
        content = content.substring(0, l - 2);

    pos++;

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of a declaration (property-value pair)
 * @param {Number} i Token's index number
 * @return {Number} Length of the declaration
 */
function checkDeclaration(i) {
    var start = i,
        l;

    if (i >= tokensLength) return 0;

    if (l = checkProperty(i)) i += l;
    else return 0;

    if (l = checkSC(i)) i += l;

    if (l = checkPropertyDelim(i)) i++;
    else return 0;

    if (l = checkSC(i)) i += l;

    if (l = checkValue(i)) i += l;
    else return 0;

    return i - start;
}

/**
 * Get node with a declaration
 * @return {Node}
 */
function getDeclaration() {
    var type = NodeType.DeclarationType,
        token = tokens[pos],
        line = token.ln,
        column = token.col;

    var content = [getProperty()]
        .concat(getSC())
        .concat([getPropertyDelim()])
        .concat(getSC())
        .concat([getValue()]);

    return new Node(type, content, line, column);
}

/**
 * Check if token is a semicolon
 * @param {Number} i Token's index number
 * @return {Number} `1` if token is a semicolon, otherwise `0`
 */
function checkDeclDelim(i) {
    return i < tokensLength && tokens[i].type === TokenType.Semicolon ? 1 : 0;
}

/**
 * Get node with a semicolon
 * @return {Node}
 */
function getDeclDelim() {
    var type = NodeType.DeclDelimType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = ';';

    pos++;

    return new Node(type, content, line, column);
}

function checkDeepSelector(i) {
    if (tokens[i + 2] &&
        tokens[i].value + tokens[i + 1].value + tokens[i + 2].value === '/deep/') {
        return 3;
    }
}

function getDeepSelector() {
    var _pos = pos++;
    var ident = getIdent();
    ident.content = '/deep/';
    ident.start.column -= 1;
    pos = _pos + 3;
    return ident;
}

/**
 * Check if token is a comma
 * @param {Number} i Token's index number
 * @return {Number} `1` if token is a comma, otherwise `0`
 */
function checkDelim(i) {
    return i < tokensLength && tokens[i].type === TokenType.Comma ? 1 : 0;
}

/**
 * Get node with a comma
 * @return {Node}
 */
function getDelim() {
    var type = NodeType.DelimType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = ',';

    pos++;

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of a number with dimension unit (e.g. `10px`)
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkDimension(i) {
    var ln = checkNumber(i),
        li;

    if (i >= tokensLength ||
        !ln ||
        i + ln >= tokensLength) return 0;

    return (li = checkNmName2(i + ln)) ? ln + li : 0;
}

/**
 * Get node of a number with dimension unit
 * @return {Node}
 */
function getDimension() {
    var type = NodeType.DimensionType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [getNumber()];

    token = tokens[pos];
    var ident = new Node(NodeType.IdentType, getNmName2(), token.ln, token.col);

    content.push(ident);

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkFilter(i) {
    var start = i,
        l;

    if (i >= tokensLength) return 0;

    if (l = checkFilterp(i)) i += l;
    else return 0;

    if (tokens[i].type === TokenType.Colon) i++;
    else return 0;

    if (l = checkFilterv(i)) i += l;
    else return 0;

    return i - start;
}

/**
 * @return {Node}
 */
function getFilter() {
    var type = NodeType.FilterType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [getFilterp()];

    pos++;

    content.push(getFilterv());

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkFilterp(i) {
    var start = i,
        l,
        x;

    if (i >= tokensLength) return 0;

    if (tokens[i].value === 'filter') l = 1;
    else {
        x = joinValues2(i, 2);

        if (x === '-filter' || x === '_filter' || x === '*filter') l = 2;
        else {
            x = joinValues2(i, 4);

            if (x === '-ms-filter') l = 4;
            else return 0;
        }
    }

    tokens[start].filterp_l = l;

    i += l;

    if (checkSC(i)) i += l;

    return i - start;
}

/**
 * @return {Node}
 */
function getFilterp() {
    var type = NodeType.PropertyType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content;

    token = tokens[pos];
    var ident = new Node(NodeType.IdentType, joinValues2(pos, token.filterp_l), token.ln, token.col);

    pos += token.filterp_l;

    content = [ident].concat(getSC());

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkFilterv(i) {
    var start = i,
        l;

    if (i >= tokensLength) return 0;

    if (l = checkSC(i)) i += l;

    if (l = checkProgid(i)) i += l;
    else return 0;

    while (l = checkProgid(i)) {
        i += l;
    }

    tokens[start].last_progid = i;

    if (i < tokensLength && (l = checkSC(i))) i += l;

    if (i < tokensLength && (l = checkImportant(i))) i += l;

    return i - start;
}

/**
 * @return {Node}
 */
function getFilterv() {
    var type = NodeType.FiltervType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [],
        last_progid = token.last_progid;

    content = content.concat(getSC());

    while (pos < last_progid) {
        content.push(getProgid());
    }

    if (checkSC(pos)) content = content.concat(getSC());

    if (pos < tokensLength && checkImportant(pos)) content.push(getImportant());

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkFunctionExpression(i) {
    var start = i;

    if (i >= tokensLength || tokens[i++].value !== 'expression' ||
        i >= tokensLength || tokens[i].type !== TokenType.LeftParenthesis) return 0;

    return tokens[i].right - start + 1;
}

/**
 * @return {Node}
 */
function getFunctionExpression() {
    var type = NodeType.FunctionExpressionType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [];

    pos++;

    content.push(joinValues(pos + 1, tokens[pos].right - 1));

    pos = tokens[pos].right + 1;

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkFunction(i) {
    var start = i,
        l;

    if (i >= tokensLength) return 0;

    if (l = checkIdent(i)) i +=l;
    else return 0;

    return i < tokensLength && tokens[i].type === TokenType.LeftParenthesis ?
        tokens[i].right - start + 1 : 0;
}

/**
 * @return {Node}
 */
function getFunction() {
    var type = NodeType.FunctionType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        ident = getIdent(),
        content = [ident];

    content.push(ident.content === 'not' ? getNotArguments() : getArguments());

    return new Node(type, content, line, column);
}

/**
 * @return {Node}
 */
function getArguments() {
    var type = NodeType.ArgumentsType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [],
        body;

    pos++;

    while (pos < tokensLength && tokens[pos].type !== TokenType.RightParenthesis) {
        if (checkDeclaration(pos)) content.push(getDeclaration());
        else if (checkArgument(pos)) {
            body = getArgument();
            if (typeof body.content === 'string') content.push(body);
            else content = content.concat(body);
        } else if (checkClass(pos)) content.push(getClass());
        else throwError(pos);
    }

    pos++;

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkArgument(i) {
    var l;

    if (l = checkVhash(i)) tokens[i].argument_child = 1;
    else if (l = checkAny(i)) tokens[i].argument_child = 2;
    else if (l = checkSC(i)) tokens[i].argument_child = 3;
    else if (l = checkOperator(i)) tokens[i].argument_child = 4;

    return l;
}

/**
 * @return {Node}
 */
function getArgument() {
    var childType = tokens[pos].argument_child;
    if (childType === 1) return getVhash();
    else if (childType === 2) return getAny();
    else if (childType === 3) return getSC();
    else if (childType === 4) return getOperator();
}

/**
 * @return {Node}
 */
function getNotArguments() {
    var type = NodeType.ArgumentsType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [];

    pos++;

    while (pos < tokensLength && tokens[pos].type !== TokenType.RightParenthesis) {
        // TODO: Remove these checks
        if (checkSimpleSelector(pos)) content.push(getSimpleSelector());
        else throwError(pos);
    }

    pos++;

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of an identifier
 * @param {Number} i Token's index number
 * @return {Number} Length of the identifier
 */
function checkIdent(i) {
    var start = i,
        wasIdent,
        l;

    if (i >= tokensLength) return 0;

    // Check if token is part of an identifier starting with `_`:
    if (tokens[i].type === TokenType.LowLine) return checkIdentLowLine(i);

    // If token is a character, `-`, `$` or `*`, skip it & continue:
    if (tokens[i].type === TokenType.HyphenMinus ||
        tokens[i].type === TokenType.Identifier ||
        tokens[i].type === TokenType.DollarSign ||
        tokens[i].type === TokenType.Asterisk) i++;
    else return 0;

    // Remember if previous token's type was identifier:
    wasIdent = tokens[i - 1].type === TokenType.Identifier;

    for (; i < tokensLength; i++) {
        if (i >= tokensLength) break;

        if (tokens[i].type !== TokenType.HyphenMinus &&
            tokens[i].type !== TokenType.LowLine) {
            if (tokens[i].type !== TokenType.Identifier &&
                (tokens[i].type !== TokenType.DecimalNumber || !wasIdent)) break;
            else wasIdent = true;
        }
    }

    if (!wasIdent && tokens[start].type !== TokenType.Asterisk) return 0;

    tokens[start].ident_last = i - 1;

    return i - start;
}

/**
 * Check if token is part of an identifier starting with `_`
 * @param {Number} i Token's index number
 * @return {Number} Length of the identifier
 */
function checkIdentLowLine(i) {
    var start = i;

    if (i++ >= tokensLength) return 0;

    for (; i < tokensLength; i++) {
        if (tokens[i].type !== TokenType.HyphenMinus &&
            tokens[i].type !== TokenType.DecimalNumber &&
            tokens[i].type !== TokenType.LowLine &&
            tokens[i].type !== TokenType.Identifier) break;
    }

    // Save index number of the last token of the identifier:
    tokens[start].ident_last = i - 1;

    return i - start;
}

/**
 * Get node with an identifier
 * @return {Node}
 */
function getIdent() {
    var type = NodeType.IdentType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = joinValues(pos, tokens[pos].ident_last);

    pos = tokens[pos].ident_last + 1;

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of `!important` word
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkImportant(i) {
    var start = i,
        l;

    if (i >= tokensLength ||
        tokens[i++].type !== TokenType.ExclamationMark) return 0;

    if (l = checkSC(i)) i += l;

    return tokens[i].value === 'important' ? i - start + 1 : 0;
}

/**
 * Get node with `!important` word
 * @return {Node}
 */
function getImportant() {
    var type = NodeType.ImportantType,
        token = tokens[pos++],
        line = token.ln,
        column = token.col,
        content = getSC();

    if (!content || !content.length) content = '';

    pos++;

    return new Node(type, content, line, column);
}

/**
 * Check if token is a namespace sign (`|`)
 * @param {Number} i Token's index number
 * @return {Number} `1` if token is `|`, `0` if not
 */
function checkNamespace(i) {
    return i < tokensLength && tokens[i].type === TokenType.VerticalLine ? 1 : 0;
}

/**
 * Get node with a namespace sign
 * @return {Node}
 */
function getNamespace() {
    var type = NodeType.NamespaceType,
        token = tokens[pos++],
        line = token.ln,
        column = token.col,
        content = '|';

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkNmName(i) {
    var start = i;

    if (i >= tokensLength) return 0;

    // start char / word
    if (tokens[i].type === TokenType.HyphenMinus ||
        tokens[i].type === TokenType.LowLine ||
        tokens[i].type === TokenType.Identifier ||
        tokens[i].type === TokenType.DecimalNumber) i++;
    else return 0;

    for (; i < tokensLength; i++) {
        if (tokens[i].type !== TokenType.HyphenMinus &&
            tokens[i].type !== TokenType.LowLine &&
            tokens[i].type !== TokenType.Identifier &&
            tokens[i].type !== TokenType.DecimalNumber) break;
    }

    tokens[start].nm_name_last = i - 1;

    return i - start;
}

/**
 * @return {String}
 */
function getNmName() {
    var s = joinValues(pos, tokens[pos].nm_name_last);

    pos = tokens[pos].nm_name_last + 1;

    return s;
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkNmName2(i) {
    if (tokens[i].type === TokenType.Identifier) return 1;
    else if (tokens[i].type !== TokenType.DecimalNumber) return 0;

    i++;

    return i < tokensLength && tokens[i].type === TokenType.Identifier ? 2 : 1;
}

/**
 * @return {String}
 */
function getNmName2() {
    var s = tokens[pos].value;

    if (tokens[pos++].type === TokenType.DecimalNumber &&
        pos < tokensLength &&
        tokens[pos].type === TokenType.Identifier) s += tokens[pos++].value;

    return s;
}

/**
 * Check if token is part of an nth-selector's identifier (e.g. `2n+1`)
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkNth(i) {
    if (i >= tokensLength) return 0;

    return checkNth1(i) || checkNth2(i);
}

/**
 * Check if token is part of an nth-selector's identifier in the form of
 *      sequence of decimals and n-s (e.g. `3`, `n`, `2n+1`)
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkNth1(i) {
    var start = i;

    for (; i < tokensLength; i++) {
        if (tokens[i].type !== TokenType.DecimalNumber &&
            tokens[i].value !== 'n') break;
    }

    if (i !== start) tokens[start].nth_last = i - 1;

    return i - start;
}

/**
 * Get node for nth-selector's identifier (e.g. `2n+1`)
 * @return {Node}
 */
function getNth() {
    var type = NodeType.NthType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content;

    if (token.nth_last) {
        content = joinValues(pos, token.nth_last);
        pos = token.nth_last + 1;
    } else {
        content = token.value;
        pos++;
    }

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of `even` or `odd` nth-selector's identifier
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkNth2(i) {
    return tokens[i].value === 'even' || tokens[i].value === 'odd' ? 1 : 0;
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkNthf(i) {
    var start = i,
        l = 0;

    if (tokens[i++].type !== TokenType.Colon) return 0;

    // There was `:`:
    l++;

    if (tokens[i++].value !== 'nth' || tokens[i++].value !== '-') return 0;

    // There was either `nth-` or `last-`:
    l += 2;

    if ('child' === tokens[i].value) {
        l += 1;
    } else if ('last-child' === tokens[i].value +
        tokens[i + 1].value +
        tokens[i + 2].value) {
        l += 3;
    } else if ('of-type' === tokens[i].value +
        tokens[i + 1].value +
        tokens[i + 2].value) {
        l += 3;
    } else if ('last-of-type' === tokens[i].value +
        tokens[i + 1].value +
        tokens[i + 2].value +
        tokens[i + 3].value +
        tokens[i + 4].value) {
        l += 5;
    } else return 0;

    tokens[start + 1].nthf_last = start + l - 1;

    return l;
}

/**
 * @return {String}
 */
function getNthf() {
    pos++;

    var s = joinValues(pos, tokens[pos].nthf_last);

    pos = tokens[pos].nthf_last + 1;

    return s;
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkNthselector(i) {
    var start = i,
        l;

    if (i >= tokensLength) return 0;

    if (l = checkNthf(i)) i += l;
    else return 0;

    if (tokens[i].type !== TokenType.LeftParenthesis || !tokens[i].right) return 0;

    l++;

    var rp = tokens[i++].right;

    while (i < rp) {
        if (l = checkSC(i)) tokens[i].nthselector_child = 1;
        else if (l = checkUnary(i)) tokens[i].nthselector_child = 2;
        else if (l = checkNth(i)) tokens[i].nthselector_child = 3;
        else return 0;
        i += l;
    }

    return rp - start + 1;
}

/**
 * @return {Node}
 */
function getNthselector() {
    var type = NodeType.NthselectorType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [];


    var nthf = new Node(NodeType.IdentType, getNthf(), line, column);
    content.push(nthf);

    pos++;

    while (tokens[pos].type !== TokenType.RightParenthesis) {
        var childType = tokens[pos].nthselector_child;
        if (childType === 1) content = content.concat(getSC());
        else if (childType === 2) content.push(getUnary());
        else if (childType === 3) content.push(getNth());
    }

    pos++;

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of a number
 * @param {Number} i Token's index number
 * @return {Number} Length of number
 */
function checkNumber(i) {
    if (i >= tokensLength) return 0;

    if (tokens[i].number_l) return tokens[i].number_l;

    // `10`:
    if (i < tokensLength && tokens[i].type === TokenType.DecimalNumber &&
        (!tokens[i + 1] ||
        (tokens[i + 1] && tokens[i + 1].type !== TokenType.FullStop)))
        return (tokens[i].number_l = 1, tokens[i].number_l);

    // `10.`:
    if (i < tokensLength &&
        tokens[i].type === TokenType.DecimalNumber &&
        tokens[i + 1] && tokens[i + 1].type === TokenType.FullStop &&
        (!tokens[i + 2] || (tokens[i + 2].type !== TokenType.DecimalNumber)))
        return (tokens[i].number_l = 2, tokens[i].number_l);

    // `.10`:
    if (i < tokensLength &&
        tokens[i].type === TokenType.FullStop &&
        tokens[i + 1].type === TokenType.DecimalNumber)
        return (tokens[i].number_l = 2, tokens[i].number_l);

    // `10.10`:
    if (i < tokensLength &&
        tokens[i].type === TokenType.DecimalNumber &&
        tokens[i + 1] && tokens[i + 1].type === TokenType.FullStop &&
        tokens[i + 2] && tokens[i + 2].type === TokenType.DecimalNumber)
        return (tokens[i].number_l = 3, tokens[i].number_l);

    return 0;
}

/**
 * Get node with number
 * @return {Node}
 */
function getNumber() {
    var type = NodeType.NumberType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = '',
        l = tokens[pos].number_l;

    for (var j = 0; j < l; j++) {
        content += tokens[pos + j].value;
    }

    pos += l;

    return new Node(type, content, line, column);
}

/**
 * Check if token is an operator (`/`, `,`, `:` or `=`).
 * @param {Number} i Token's index number
 * @return {Number} `1` if token is an operator, otherwise `0`
 */
function checkOperator(i) {
    if (i >= tokensLength) return 0;

    switch(tokens[i].type) {
        case TokenType.Solidus:
        case TokenType.Comma:
        case TokenType.Colon:
        case TokenType.EqualsSign:
            return 1;
    }

    return 0;
}

/**
 * Get node with an operator
 * @return {Node}
 */
function getOperator() {
    var type = NodeType.OperatorType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = token.value;

    pos++;

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of a number with percent sign (e.g. `10%`)
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkPercentage(i) {
    var x;

    if (i >= tokensLength) return 0;

    x = checkNumber(i);

    if (!x || i + x >= tokensLength) return 0;

    return tokens[i + x].type === TokenType.PercentSign ? x + 1 : 0;
}

/**
 * Get node of number with percent sign
 * @return {Node}
 */
function getPercentage() {
    var type = NodeType.PercentageType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [getNumber()];

    pos++;

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkProgid(i) {
    var start = i,
        l;

    if (i >= tokensLength) return 0;

    if (l = checkSC(i)) i += l;

    if (joinValues2(i, 6) === 'progid:DXImageTransform.Microsoft.') i += 6;
    else return 0;

    if (l = checkIdent(i)) i += l;
    else return 0;

    if (l = checkSC(i)) i += l;

    if (tokens[i].type === TokenType.LeftParenthesis) {
        tokens[start].progid_end = tokens[i].right;
        i = tokens[i].right + 1;
    } else return 0;

    if (l = checkSC(i)) i += l;

    return i - start;
}

/**
 * @return {Node}
 */
function getProgid() {
    var type = NodeType.ProgidType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        progid_end = token.progid_end,
        content = []
            .concat(getSC())
            .concat([_getProgid(progid_end)])
            .concat(getSC());

    return new Node(type, content, line, column);
}

/**
 * @param {Number} progid_end
 * @return {Node}
 */
function _getProgid(progid_end) {
    var type = NodeType.RawType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = joinValues(pos, progid_end);

    pos = progid_end + 1;

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of a property
 * @param {Number} i Token's index number
 * @return {Number} Length of the property
 */
function checkProperty(i) {
    var start = i,
        l;

    if (i >= tokensLength) return 0;

    if (l = checkIdent(i)) i += l;
    else return 0;

    return i - start;
}

/**
 * Get node with a property
 * @return {Node}
 */
function getProperty() {
    var type = NodeType.PropertyType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [getIdent()];

    return new Node(type, content, line, column);
}

/**
 * Check if token is a colon
 * @param {Number} i Token's index number
 * @return {Number} `1` if token is a colon, otherwise `0`
 */
function checkPropertyDelim(i) {
    return i < tokensLength && tokens[i].type === TokenType.Colon ? 1 : 0;
}

/**
 * Get node with a colon
 * @return {Node}
 */
function getPropertyDelim() {
    var type = NodeType.PropertyDelimType,
        token = tokens[pos++],
        line = token.ln,
        column = token.col,
        content = ':';

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkPseudo(i) {
    return checkPseudoe(i) ||
        checkPseudoc(i);
}

/**
 * @return {Node}
 */
function getPseudo() {
    if (checkPseudoe(pos)) return getPseudoe();
    if (checkPseudoc(pos)) return getPseudoc();
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkPseudoe(i) {
    var l;

    if (i >= tokensLength || tokens[i++].type !== TokenType.Colon ||
        i >= tokensLength || tokens[i++].type !== TokenType.Colon) return 0;

    return (l = checkIdent(i)) ? l + 2 : 0;
}

/**
 * @return {Node}
 */
function getPseudoe() {
    var type = NodeType.PseudoeType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [];

    pos += 2;

    content.push(getIdent());

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkPseudoc(i) {
    var l;

    if (i >= tokensLength || tokens[i++].type !== TokenType.Colon) return 0;

    if (l = checkFunction(i)) tokens[i].pseudoc_child = 1;
    else if (l = checkIdent(i)) tokens[i].pseudoc_child = 2;
    else return 0;

    return l + 1;
}

/**
 * @return {Node}
 */
function getPseudoc() {
    var type = NodeType.PseudocType,
        token = tokens[pos++],
        line = token.ln,
        column = token.col,
        content = [];

    var childType = tokens[pos].pseudoc_child;
    if (childType === 1) content.push(getFunction());
    else content.push(getIdent());

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkRuleset(i) {
    var start = i,
        l;

    if (i >= tokensLength) return 0;

    if (tokens[start].ruleset_l) return tokens[start].ruleset_l;

    while (i < tokensLength) {
        if (l = checkBlock(i)) {
            tokens[i].ruleset_child = 1;
            i += l;
            break;
        } else if (l = checkSelector(i)) {
            tokens[i].ruleset_child = 2;
            i += l;
        } else return 0;
    }

    tokens[start].ruleset_l = i - start;

    return i - start;
}

/**
 * @return {Node}
 */
function getRuleset() {
    var type = NodeType.RulesetType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [];

    while (pos < tokensLength) {
        var childType = tokens[pos].ruleset_child;
        if (childType === 1) { content.push(getBlock()); break; }
        else if (childType === 2) content.push(getSelector());
        else break;
    }

    return new Node(type, content, line, column);
}

/**
 * Check if token is marked as a space (if it's a space or a tab
 *      or a line break).
 * @param i
 * @return {Number} Number of spaces in a row starting with the given token.
 */
function checkS(i) {
    return i < tokensLength && tokens[i].ws ? tokens[i].ws_last - i + 1 : 0;
}

/**
 * Get node with spaces
 * @return {Node}
 */
function getS() {
    var type = NodeType.SType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = joinValues(pos, tokens[pos].ws_last);

    pos = tokens[pos].ws_last + 1;

    return new Node(type, content, line, column);
}

/**
 * Check if token is a space or a comment.
 * @param {Number} i Token's index number
 * @return {Number} Number of similar (space or comment) tokens
 *      in a row starting with the given token.
 */
function checkSC(i) {
    var l,
        lsc = 0;

    while (i < tokensLength) {
        if (l = checkS(i)) tokens[i].sc_child = 1;
        else if (l = checkCommentML(i)) tokens[i].sc_child = 2;
        else break;
        i += l;
        lsc += l;
    }

    return lsc || 0;
}

/**
 * Get node with spaces and comments
 * @return {Array}
 */
function getSC() {
    var sc = [];

    if (pos >= tokensLength) return sc;

    while (pos < tokensLength) {
        var childType = tokens[pos].sc_child;
        if (childType === 1) sc.push(getS());
        else if (childType === 2) sc.push(getCommentML());
        else break;
    }

    return sc;
}

/**
 * Check if token is part of a selector
 * @param {Number} i Token's index number
 * @return {Number} Length of the selector
 */
function checkSelector(i) {
    var start = i,
        l;

    while (i < tokensLength) {
        if (l = checkDelim(i)) tokens[i].selector_child = 1;
        else if (l = checkSimpleSelector(i)) tokens[i].selector_child = 2;
        else break;
        i += l;
    }

    if (i !== start) tokens[start].selector_end = i - 1;

    return i - start;
}

/**
 * @return {Node}
 */
function getSelector() {
    var type = NodeType.SelectorType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [],
        selector_end = token.selector_end;

    while (pos <= selector_end) {
        var childType = tokens[pos].selector_child;
        if (childType === 1) content.push(getDelim());
        else if (childType === 2) content.push(getSimpleSelector());
    }

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of a hexadecimal number (e.g. `#fff`) inside
 *      a simple selector
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkShash(i) {
    var l;

    if (i >= tokensLength || tokens[i].type !== TokenType.NumberSign) return 0;

    return (l = checkNmName(i + 1)) ? l + 1 : 0;
}

/**
 * Get node with a hexadecimal number (e.g. `#fff`) inside a simple
 *      selector
 * @return {Node}
 */
function getShash() {
    var type = NodeType.ShashType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [];

    pos++;

    content.push(getNmName());

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkSimpleSelector(i) {
    var start = i,
        l;

    while (i < tokensLength) {
        if (l = checkSimpleSelector1(i)) i += l;
        else break;
    }

    tokens[start].simpleselector_end = i;
    return i - start;
}

/**
 * @return {Node}
 */
function getSimpleSelector() {
    var type = NodeType.SimpleselectorType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [],
        end = token.simpleselector_end,
        t;

    while (pos < end) {
        t = getSimpleSelector1();

        if (typeof t.content === 'string') content.push(t);
        else content = content.concat(t);
    }

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkSimpleSelector1(i) {
    var l;

    if (l = checkNthselector(i)) tokens[i].simpleselector1_child = 1;
    else if (l = checkCombinator(i)) tokens[i].simpleselector1_child = 2;
    else if (l = checkAttrib(i)) tokens[i].simpleselector1_child = 3;
    else if (l = checkPseudo(i)) tokens[i].simpleselector1_child = 4;
    else if (l = checkShash(i)) tokens[i].simpleselector1_child = 5;
    else if (l = checkAny(i)) tokens[i].simpleselector1_child = 6;
    else if (l = checkSC(i)) tokens[i].simpleselector1_child = 7;
    else if (l = checkNamespace(i)) tokens[i].simpleselector1_child = 8;
    else if (l = checkDeepSelector(i)) tokens[i].simpleselector1_child = 9;

    return l;
}

/**
 * @return {Node}
 */
function getSimpleSelector1() {
    var childType = tokens[pos].simpleselector1_child;
    if (childType === 1) return getNthselector();
    else if (childType === 2) return getCombinator();
    else if (childType === 3) return getAttrib();
    else if (childType === 4) return getPseudo();
    else if (childType === 5) return getShash();
    else if (childType === 6) return getAny();
    else if (childType === 7) return getSC();
    else if (childType === 8) return getNamespace();
    else if (childType === 9) return getDeepSelector();
}

/**
 * Check if token is part of a string (text wrapped in quotes)
 * @param {Number} i Token's index number
 * @return {Number} `1` if token is part of a string, `0` if not
 */
function checkString(i) {
    return i < tokensLength && (tokens[i].type === TokenType.StringSQ || tokens[i].type === TokenType.StringDQ) ? 1 : 0;
}

/**
 * Get string's node
 * @return {Array} `['string', x]` where `x` is a string (including
 *      quotes).
 */
function getString() {
    var type = NodeType.StringType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = token.value;

    pos++;

    return new Node(type, content, line, column);
}

/**
 * Validate stylesheet: it should consist of any number (0 or more) of
 * rulesets (sets of rules with selectors), @-rules, whitespaces or
 * comments.
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkStylesheet(i) {
    var start = i,
        l;

    // Check every token:
    while (i < tokensLength) {
        if (l = checkSC(i)) tokens[i].stylesheet_child = 1;
        else if (l = checkRuleset(i)) tokens[i].stylesheet_child = 2;
        else if (l = checkAtrule(i)) tokens[i].stylesheet_child = 3;
        else if (l = checkDeclDelim(i)) tokens[i].stylesheet_child = 4;
        else throwError(i);

        i += l;
    }

    return i - start;
}

/**
 * @return {Array} `['stylesheet', x]` where `x` is all stylesheet's
 *      nodes.
 */
function getStylesheet() {
    var type = NodeType.StylesheetType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = [],
        childType;

    while (pos < tokensLength) {
        childType = tokens[pos].stylesheet_child;
        if (childType === 1) content = content.concat(getSC());
        else if (childType === 2) content.push(getRuleset());
        else if (childType === 3) content.push(getAtrule());
        else if (childType === 4) content.push(getDeclDelim());
    }

    return new Node(type, content, line, column);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkTset(i) {
    var l;

    if (l = checkVhash(i)) tokens[i].tset_child = 1;
    else if (l = checkAny(i)) tokens[i].tset_child = 2;
    else if (l = checkSC(i)) tokens[i].tset_child = 3;
    else if (l = checkOperator(i)) tokens[i].tset_child = 4;

    return l;
}

/**
 * @return {Array}
 */
function getTset() {
    var childType = tokens[pos].tset_child;
    if (childType === 1) return getVhash();
    else if (childType === 2) return getAny();
    else if (childType === 3) return getSC();
    else if (childType === 4) return getOperator();
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkTsets(i) {
    var start = i,
        l;

    if (i >= tokensLength) return 0;

    while (l = checkTset(i)) {
        i += l;
    }

    return i - start;
}

/**
 * @return {Array}
 */
function getTsets() {
    var x = [],
        t;

    while (checkTset(pos)) {
        t = getTset();
        if (typeof t.content === 'string') x.push(t);
        else x = x.concat(t);
    }

    return x;
}

/**
 * Check if token is an unary (arithmetical) sign (`+` or `-`)
 * @param {Number} i Token's index number
 * @return {Number} `1` if token is an unary sign, `0` if not
 */
function checkUnary(i) {
    return i < tokensLength && (tokens[i].type === TokenType.HyphenMinus || tokens[i].type === TokenType.PlusSign) ? 1 : 0;
}

/**
 * Get node with an unary (arithmetical) sign (`+` or `-`)
 * @return {Array} `['unary', x]` where `x` is an unary sign
 *      converted to string.
 */
function getUnary() {
    var type = NodeType.UnaryType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content = token.value;

    pos++;

    return new Node(type, content, line, column);
}

/**
 * Check if token is part of URI (e.g. `url('/css/styles.css')`)
 * @param {Number} i Token's index number
 * @return {Number} Length of URI
 */
function checkUri(i) {
    var start = i;

    if (i >= tokensLength || tokens[i].value !== 'url') return 0;
    i += 1;
    if (i >= tokensLength || tokens[i].type !== TokenType.LeftParenthesis)
        return 0;

    return tokens[i].right - start + 1;
}

/**
 * Get node with URI
 * @return {Array} `['uri', x]` where `x` is URI's nodes (without `url`
 *      and braces, e.g. `['string', ''/css/styles.css'']`).
 */
function getUri() {
    var startPos = pos,
        uriExcluding = {},
        uri,
        l,
        raw;

    var rawContent, t;

    pos += 2;

    uriExcluding[TokenType.Space] = 1;
    uriExcluding[TokenType.Tab] = 1;
    uriExcluding[TokenType.Newline] = 1;
    uriExcluding[TokenType.LeftParenthesis] = 1;
    uriExcluding[TokenType.RightParenthesis] = 1;

    if (checkUri1(pos)) {
        uri = []
            .concat(getSC())
            .concat([getString()])
            .concat(getSC());

        pos++;
    } else {
        uri = checkSC(pos) ? getSC() : [];
        l = checkExcluding(uriExcluding, pos),
        rawContent = joinValues(pos, pos + l);
        t = tokens[pos];
        raw = new Node(NodeType.RawType, rawContent, t.ln, t.col);

        uri.push(raw);

        pos += l + 1;

        if (checkSC(pos)) uri = uri.concat(getSC());

        pos++;
    }

    t = tokens[startPos];
    return new Node(NodeType.UriType, uri, t.ln, t.col);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkUri1(i) {
    var start = i,
        l;

    if (i >= tokensLength) return 0;

    if (l = checkSC(i)) i += l;

    if (tokens[i].type !== TokenType.StringDQ && tokens[i].type !== TokenType.StringSQ) return 0;

    i++;

    if (l = checkSC(i)) i += l;

    return i - start;
}

/**
 * Check if token is part of a value
 * @param {Number} i Token's index number
 * @return {Number} Length of the value
 */
function checkValue(i) {
    var start = i,
        l, s, _i;

    while (i < tokensLength) {
        s = checkSC(i);
        _i = i + s;

        if (l = _checkValue(_i)) i += l + s;
        else break;
    }

    tokens[start].value_end = i;
    return i - start;
}

/**
 * @return {Array}
 */
function getValue() {
    var startPos = pos,
        end = tokens[pos].value_end,
        x = [],
        s, _pos;

    while (pos < end) {
        if (tokens[pos].value_child) x.push(_getValue());
        else x = x.concat(getSC());
    }

    var t = tokens[startPos];
    return new Node(NodeType.ValueType, x, t.ln, t.col);
}

/**
 * @param {Number} i Token's index number
 * @return {Number}
 */
function _checkValue(i) {
    var l;

    if (l = checkVhash(i)) tokens[i].value_child = 1;
    else if (l = checkAny(i)) tokens[i].value_child = 2;
    else if (l = checkOperator(i)) tokens[i].value_child = 3;
    else if (l = checkImportant(i)) tokens[i].value_child = 4;

    return l;
}

/**
 * @return {Array}
 */
function _getValue() {
    var childType = tokens[pos].value_child;
    if (childType === 1) return getVhash();
    else if (childType === 2) return getAny();
    else if (childType === 3) return getOperator();
    else if (childType === 4) return getImportant();
}

/**
 * Check if token is part of a hexadecimal number (e.g. `#fff`) inside
 *      some value
 * @param {Number} i Token's index number
 * @return {Number}
 */
function checkVhash(i) {
    var l;

    if (i >= tokensLength || tokens[i].type !== TokenType.NumberSign) return 0;

    return (l = checkNmName2(i + 1)) ? l + 1 : 0;
}

/**
 * Get node with a hexadecimal number (e.g. `#fff`) inside some value
 * @return {Array} `['vhash', x]` where `x` is a hexadecimal number
 *      converted to string (without `#`, e.g. `'fff'`).
 */
function getVhash() {
    var type = NodeType.VhashType,
        token = tokens[pos],
        line = token.ln,
        column = token.col,
        content;

    pos++;

    content = getNmName2();
    return new Node(type, content, line, column);
}

module.exports = function(_tokens, rule) {
    tokens = _tokens;
    tokensLength = tokens.length;
    pos = 0;

    return rules[rule]();
};
