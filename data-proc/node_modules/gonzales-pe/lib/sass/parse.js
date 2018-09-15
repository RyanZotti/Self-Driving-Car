var Node = require('../node');
var NodeType = require('../node-types');
var TokenType = require('../token-types');

module.exports = (function() {
    var tokens, tokensLength, pos, needInfo;

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
        'commentSL': function() { return checkCommentSL(pos) && getCommentSL(); },
        'condition': function() { return checkCondition(pos) && getCondition(); },
        'conditionalStatement': function() { return checkConditionalStatement(pos) && getConditionalStatement(); },
        'declaration': function() { return checkDeclaration(pos) && getDeclaration(); },
        'declDelim': function() { return checkDeclDelim(pos) && getDeclDelim(); },
        'default': function() { return checkDefault(pos) && getDefault(); },
        'delim': function() { return checkDelim(pos) && getDelim(); },
        'dimension': function() { return checkDimension(pos) && getDimension(); },
        'filter': function() { return checkFilter(pos) && getFilter(); },
        'filterv': function() { return checkFilterv(pos) && getFilterv(); },
        'functionExpression': function() { return checkFunctionExpression(pos) && getFunctionExpression(); },
        'function': function() { return checkFunction(pos) && getFunction(); },
        'ident': function() { return checkIdent(pos) && getIdent(); },
        'important': function() { return checkImportant(pos) && getImportant(); },
        'include': function() { return checkInclude(pos) && getInclude(); },
        'interpolation': function() { return checkInterpolation(pos) && getInterpolation(); },
        'loop': function() { return checkLoop(pos) && getLoop(); },
        'mixin': function() { return checkMixin(pos) && getMixin(); },
        'namespace': function() { return checkNamespace(pos) && getNamespace(); },
        'nth': function() { return checkNth(pos) && getNth(); },
        'nthselector': function() { return checkNthselector(pos) && getNthselector(); },
        'number': function() { return checkNumber(pos) && getNumber(); },
        'operator': function() { return checkOperator(pos) && getOperator(); },
        'parentselector': function() { return checkParentSelector(pos) && getParentSelector(); },
        'percentage': function() { return checkPercentage(pos) && getPercentage(); },
        'placeholder': function() { return checkPlaceholder(pos) && getPlaceholder(); },
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
        'variable': function () { return checkVariable(pos) && getVariable(); },
        'variableslist': function () { return checkVariablesList(pos) && getVariablesList(); },
        'vhash': function() { return checkVhash(pos) && getVhash(); }
    };

    /**
     * Stop parsing and display error
     * @param {Number=} i Token's index number
     */
    function throwError(i) {
        var ln = i ? tokens[i].ln : tokens[pos].ln;

        throw {line: ln, syntax: 'sass'};
    }

    /**
     * @param {Object} exclude
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {String}
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
     * @returns {String}
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
     * @returns {Number}
     */
    function checkAny(i) {
        var l;

        if (l = checkBraces(i)) tokens[i].any_child = 1;
        else if (l = checkString(i)) tokens[i].any_child = 2;
        else if (l = checkVariablesList(i)) tokens[i].any_child = 3;
        else if (l = checkVariable(i)) tokens[i].any_child = 4;
        else if (l = checkPlaceholder(i)) tokens[i].any_child = 5;
        else if (l = checkPercentage(i)) tokens[i].any_child = 6;
        else if (l = checkDimension(i)) tokens[i].any_child = 7;
        else if (l = checkNumber(i)) tokens[i].any_child = 8;
        else if (l = checkUri(i)) tokens[i].any_child = 9;
        else if (l = checkFunctionExpression(i)) tokens[i].any_child = 10;
        else if (l = checkFunction(i)) tokens[i].any_child = 11;
        else if (l = checkIdent(i)) tokens[i].any_child = 12;
        else if (l = checkClass(i)) tokens[i].any_child = 13;
        else if (l = checkUnary(i)) tokens[i].any_child = 14;

        return l;
    }

    /**
     * @returns {Array}
     */
    function getAny() {
        var childType = tokens[pos].any_child;

        if (childType === 1) return getBraces();
        else if (childType === 2) return getString();
        else if (childType === 3) return getVariablesList();
        else if (childType === 4) return getVariable();
        else if (childType === 5) return getPlaceholder();
        else if (childType === 6) return getPercentage();
        else if (childType === 7) return getDimension();
        else if (childType === 8) return getNumber();
        else if (childType === 9) return getUri();
        else if (childType === 10) return getFunctionExpression();
        else if (childType === 11) return getFunction();
        else if (childType === 12) return getIdent();
        else if (childType === 13) return getClass();
        else if (childType === 14) return getUnary();
    }

    /**
     * Check if token is part of mixin's arguments.
     * @param {Number} i Token's index number
     * @returns {Number} Length of arguments
     */
    function checkArguments(i) {
        var start = i,
            l;

        if (i >= tokensLength ||
            tokens[i].type !== TokenType.LeftParenthesis) return 0;

        i++;

        while (i < tokens[start].right) {
            if (l = checkArgument(i)) i +=l;
            else return 0;
        }

        return tokens[start].right - start + 1;
    }

    /**
     * Check if token is valid to be part of arguments list
     * @param i Token's index number
     * @returns {Number} Length of argument
     */
    function checkArgument(i) {
        var l;

        if (l = checkBraces(i)) tokens[i].argument_child = 1;
        else if (l = checkDeclaration(i)) tokens[i].argument_child = 2;
        else if (l = checkFunction(i)) tokens[i].argument_child = 3;
        else if (l = checkVariablesList(i)) tokens[i].argument_child = 4;
        else if (l = checkVariable(i)) tokens[i].argument_child = 5;
        else if (l = checkSC(i)) tokens[i].argument_child = 6;
        else if (l = checkDelim(i)) tokens[i].argument_child = 7;
        else if (l = checkDeclDelim(i)) tokens[i].argument_child = 8;
        else if (l = checkString(i)) tokens[i].argument_child = 9;
        else if (l = checkPercentage(i)) tokens[i].argument_child = 10;
        else if (l = checkDimension(i)) tokens[i].argument_child = 11;
        else if (l = checkNumber(i)) tokens[i].argument_child = 12;
        else if (l = checkUri(i)) tokens[i].argument_child = 13;
        else if (l = checkInterpolation(i)) tokens[i].argument_child = 14;
        else if (l = checkIdent(i)) tokens[i].argument_child = 15;
        else if (l = checkVhash(i)) tokens[i].argument_child = 16;
        else if (l = checkOperator(i)) tokens[i].argument_child = 17;
        else if (l = checkUnary(i)) tokens[i].argument_child = 18;

        return l;
    }

    /**
     * @returns {Array} Node that is part of arguments list
     */
    function getArgument() {
        var childType = tokens[pos].argument_child;

        if (childType === 1) return getBraces();
        else if (childType === 2) return getDeclaration();
        else if (childType === 3) return getFunction();
        else if (childType === 4) return getVariablesList();
        else if (childType === 5) return getVariable();
        else if (childType === 6) return getSC();
        else if (childType === 7) return getDelim();
        else if (childType === 8) return getDeclDelim();
        else if (childType === 9) return getString();
        else if (childType === 10) return getPercentage();
        else if (childType === 11) return getDimension();
        else if (childType === 12) return getNumber();
        else if (childType === 13) return getUri();
        else if (childType === 14) return getInterpolation();
        else if (childType === 15) return getIdent();
        else if (childType === 16) return getVhash();
        else if (childType === 17) return getOperator();
        else if (childType === 18) return getUnary();
    }

    /**
     * Check if token is part of an @-word (e.g. `@import`, `@include`)
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {Array} `['atkeyword', ['ident', x]]` where `x` is
     *      an identifier without
     *      `@` (e.g. `import`, `include`)
     */
    function getAtkeyword() {
        var startPos = pos++,
            x = [getIdent()];

        var token = tokens[startPos];
        return new Node(NodeType.AtkeywordType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of an attribute selector (e.g. `[attr]`,
     *      `[attr='panda']`)
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkAttrib(i) {
        if (i >= tokensLength ||
            tokens[i].type !== TokenType.LeftSquareBracket ||
            !tokens[i].right) return 0;

        return tokens[i].right - i + 1;
    }

    /**
    * Get node with an attribute selector
    * @returns {Array} `['attrib', ['ident', x], ['attrselector', y]*, [z]*]`
    *      where `x` is attribute's name, `y` is operator (if there is any)
    *      and `z` is attribute's value (if there is any)
    */
    function getAttrib() {
        if (checkAttrib1(pos)) return getAttrib1();
        if (checkAttrib2(pos)) return getAttrib2();
    }

    /**
     * Check if token is part of an attribute selector of the form `[attr='value']`
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {Array} `['attrib', ['ident', x], ['attrselector', y], [z]]`
     *      where `x` is attribute's name, `y` is operator and `z` is attribute's
     *      value
     */
    function getAttrib1() {
        var startPos = pos,
            x;

        pos++;

        x = []
            .concat(getSC())
            .concat([getIdent()])
            .concat(getSC())
            .concat([getAttrselector()])
            .concat(getSC())
            .concat([checkString(pos)? getString() : getIdent()])
            .concat(getSC());

        pos++;

        var token = tokens[startPos];
        return new Node(NodeType.AttribType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of an attribute selector of the form `[attr]`
     * Attribute can not be empty, e.g. `[]`.
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {Array} `['attrib', ['ident', x]]` where `x` is attribute's name
     */
    function getAttrib2() {
        var startPos = pos,
            x;

        pos++;

        x = []
            .concat(getSC())
            .concat([getIdent()])
            .concat(getSC());

        pos++;

        var token = tokens[startPos];
        return new Node(NodeType.AttribType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of an attribute selector operator (`=`, `~=`,
     *      `^=`, `$=`, `*=` or `|=`)
     * @param {Number} i Token's index number
     * @returns {Number} Length of operator (`0` if token is not part of an
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
     * @returns {Array} `['attrselector', x]` where `x` is an operator.
     */
    function getAttrselector() {
        var startPos = pos,
            s = tokens[pos++].value;

        if (tokens[pos] && tokens[pos].type === TokenType.EqualsSign)
            s += tokens[pos++].value;

        var token = tokens[startPos];
        return new Node(NodeType.AttrselectorType, s, token.ln, token.col);
    }

    /**
     * Check if token is a part of an @-rule
     * @param {Number} i Token's index number
     * @returns {Number} Length of @-rule
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
     * @returns {Array}
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
     * @returns {Number} Length of the @-rule
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
     * @returns {Array} `['atruleb', ['atkeyword', x], y, ['block', z]]`
     */
    function getAtruleb() {
        var startPos = pos,
            x;

        x = [getAtkeyword()]
            .concat(getTsets())
            .concat([getBlock()]);

        var token = tokens[startPos];
        return new Node(NodeType.AtrulebType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of an @-rule with ruleset
     * @param {Number} i Token's index number
     * @returns {Number} Length of the @-rule
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
     * @returns {Array} ['atruler', ['atkeyword', x], y, z]
     */
    function getAtruler() {
        var startPos = pos,
            x;

        x = [getAtkeyword(), getAtrulerq()];

        pos++;

        x.push(getAtrulers());

        pos++;

        var token = tokens[startPos];
        return new Node(NodeType.AtrulerType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkAtrulerq(i) {
        return checkTsets(i);
    }

    /**
     * @returns {Array} `['atrulerq', x]`
     */
    function getAtrulerq() {
        var startPos = pos,
            x = getTsets();

        var token = tokens[startPos];
        return new Node(NodeType.AtrulerqType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkAtrulers(i) {
        var start = i,
            l;

        if (i >= tokensLength) return 0;

        if (l = checkSC(i)) i += l;

        while (l = checkRuleset(i) || checkAtrule(i) || checkSC(i)) {
            i += l;
        }

        tokens[i].atrulers_end = 1;

        if (l = checkSC(i)) i += l;

        return i - start;
    }

    /**
     * @returns {Array} `['atrulers', x]`
     */
    function getAtrulers() {
        var startPos = pos,
            x = getSC();

        while (!tokens[pos].atrulers_end) {
            if (checkSC(pos)) x = x.concat(getSC());
            else if (checkAtrule(pos)) x.push(getAtrule());
            else if (checkRuleset(pos)) x.push(getRuleset());
        }

        x = x.concat(getSC());

        var token = tokens[startPos];
        return new Node(NodeType.AtrulersType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {Array} `['atrules', ['atkeyword', x], y]`
     */
    function getAtrules() {
        var startPos = pos,
            x;

        x = [getAtkeyword()].concat(getTsets());

        var token = tokens[startPos];
        return new Node(NodeType.AtrulesType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a block (e.g. `{...}`).
     * @param {Number} i Token's index number
     * @returns {Number} Length of the block
     */
    function checkBlock(i) {
        return i < tokensLength && tokens[i].block_end ?
            tokens[i].block_end - i + 1 : 0;
    }

    /**
     * Get node with a block
     * @returns {Array} `['block', x]`
     */
    function getBlock() {
        var startPos = pos,
            end = tokens[pos].block_end,
            x = [];

        while (pos < end) {
            if (checkBlockdecl(pos)) x = x.concat(getBlockdecl());
            else throwError();
        }

        var token = tokens[startPos];
        return new Node(NodeType.BlockType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a declaration (property-value pair)
     * @param {Number} i Token's index number
     * @returns {Number} Length of the declaration
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
     * @returns {Array}
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
     * @returns {Number}
     */
    function checkBlockdecl1(i) {
        var start = i,
            l;

        if (l = checkSC(i)) i += l;

        if (l = checkConditionalStatement(i)) tokens[i].bd_kind = 1;
        else if (l = checkInclude(i)) tokens[i].bd_kind = 2;
        else if (l = checkLoop(i)) tokens[i].bd_kind = 3;
        else if (l = checkFilter(i)) tokens[i].bd_kind = 4;
        else if (l = checkDeclaration(i)) tokens[i].bd_kind = 5;
        else if (l = checkAtrule(i)) tokens[i].bd_kind = 6;
        else if (l = checkRuleset(i)) tokens[i].bd_kind = 7;
        else return 0;

        i += l;

        if (i >= tokensLength) return 0;

        while (i < tokensLength) {
            if (l = checkDeclDelim(i)) {
                i += l;
                while (i < tokensLength &&
                    (l = checkS(i)) &&
                    tokens[i].type === 'Newline') i += l;
                break;
            } else if (l = checkS(i)) i += l;
            else if (l = checkCommentSL(i)) i += l;
            else return 0;
        }

        return i - start;
    }

    /**
     * @returns {Array}
     */
    function getBlockdecl1() {
        var sc = getSC(),
            x;

        switch (tokens[pos].bd_kind) {
            case 1:
                x = getConditionalStatement();
                break;
            case 2:
                x = getInclude();
                break;
            case 3:
                x = getLoop();
                break;
            case 4:
                x = getFilter();
                break;
            case 5:
                x = getDeclaration();
                break;
            case 6:
                x = getAtrule();
                break;
            case 7:
                x = getRuleset();
                break;
        }

        x = sc.concat([x]);

        while (pos < tokensLength) {
            if (checkDeclDelim(pos)) {
                x.push(getDeclDelim());
                while (pos < tokensLength &&
                    checkS(pos) &&
                    tokens[pos].type === 'Newline') x.push(getS());
                break;
            } else if (checkS(pos)) x.push(getS());
            else if (checkCommentSL(pos)) x.push(getCommentSL());
            else break;
        }
        return x;
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkBlockdecl2(i) {
        var start = i,
            l;

        if (l = checkSC(i)) i += l;

        if (l = checkConditionalStatement(i)) tokens[i].bd_kind = 1;
        else if (l = checkInclude(i)) tokens[i].bd_kind = 2;
        else if (l = checkLoop(i)) tokens[i].bd_kind = 3;
        else if (l = checkFilter(i)) tokens[i].bd_kind = 4;
        else if (l = checkDeclaration(i)) tokens[i].bd_kind = 5;
        else if (l = checkAtrule(i)) tokens[i].bd_kind = 6;
        else if (l = checkRuleset(i)) tokens[i].bd_kind = 7;
        else return 0;

        i += l;

        return i - start;
    }

    /**
     * @returns {Array}
     */
    function getBlockdecl2() {
        var sc = getSC(),
            x;

        switch (tokens[pos].bd_kind) {
            case 1:
                x = getConditionalStatement();
                break;
            case 2:
                x = getInclude();
                break;
            case 3:
                x = getLoop();
                break;
            case 4:
                x = getFilter();
                break;
            case 5:
                x = getDeclaration();
                break;
            case 6:
                x = getAtrule();
                break;
            case 7:
                x = getRuleset();
                break;
        }

        return sc.concat([x]);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {Array} `[s0, ['declDelim'], s1]` where `s0` and `s1` are
     *      are optional whitespaces.
     */
    function getBlockdecl3() {
        return getSC()
            .concat([getDeclDelim()])
            .concat(getSC());
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkBlockdecl4(i) {
        return checkSC(i);
    }

    /**
     * @returns {Array}
     */
    function getBlockdecl4() {
        return getSC();
    }

    /**
     * Check if token is part of text inside parentheses or square brackets
     *      (e.g. `(1)`)
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkBraces(i) {
        if (i >= tokensLength ||
            (tokens[i].type !== TokenType.LeftParenthesis &&
            tokens[i].type !== TokenType.LeftSquareBracket)) return 0;

        return tokens[i].right - i + 1;
    }

    /**
     * Get node with text inside parentheses or square brackets (e.g. `(1)`)
     * @returns {Array} `['braces', l, r, x*]` where `l` is a left bracket
     *      (e.g. `'('`), `r` is a right bracket (e.g. `')'`) and `x` is
     *      parsed text inside those brackets (if there is any)
     *      (e.g. `['number', '1']`)
     */
    function getBraces() {
        var startPos = pos,
            left = pos,
            right = tokens[pos].right,
            x;

        pos++;

        var tsets = getTsets();

        pos++;

        x = [tokens[left].value, tokens[right].value]
            .concat(tsets);

        var token = tokens[startPos];
        return new Node(NodeType.BracesType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a class selector (e.g. `.abc`)
     * @param {Number} i Token's index number
     * @returns {Number} Length of the class selector
     */
    function checkClass(i) {
        var start = i,
            l;

        if (i >= tokensLength) return 0;

        if (tokens[i].class_l) return tokens[i].class_l;

        if (tokens[i++].type !== TokenType.FullStop) return 0;

        while (i < tokensLength) {
            if (l = checkInterpolation(i) || checkIdent(i)) i += l;
            else break;
        }

        return i - start;
    }

    /**
     * Get node with a class selector
     * @returns {Array} `['class', ['ident', x]]` where x is a class's
     *      identifier (without `.`, e.g. `abc`).
     */
    function getClass() {
        var startPos = pos++,
            x = [];

        while (pos < tokensLength) {
            if (checkInterpolation(pos)) x.push(getInterpolation());
            else if (checkIdent(pos)) x.push(getIdent());
            else break;
        }

        var token = tokens[startPos];
        return new Node(NodeType.ClassType, x, token.ln, token.col);
    }

    /**
     * Check if token is a combinator (`+`, `>` or `~`)
     * @param {Number} i Token's index number
     * @returns {Number} Length of the combinator
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
     * @returns {Array} `['combinator', x]` where `x` is a combinator
     *      converted to string.
     */
    function getCombinator() {
        var startPos = pos,
            x = tokens[pos++].value;

        var token = tokens[startPos];
        return new Node(NodeType.CombinatorType, x, token.ln, token.col);
    }

    /**
     * Check if token is a multiline comment.
     * @param {Number} i Token's index number
     * @returns {Number} `1` if token is a multiline comment, otherwise `0`
     */
    function checkCommentML(i) {
        return i < tokensLength && tokens[i].type === TokenType.CommentML ? 1 : 0;
    }

    /**
     * Get node with a multiline comment
     * @returns {Array} `['commentML', x]` where `x`
     *      is the comment's text (without `/*` and `* /`).
     */
    function getCommentML() {
        var startPos = pos,
            x = tokens[pos].value.substring(2);

        pos++;

        var token = tokens[startPos];
        return new Node(NodeType.CommentMLType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a single-line comment.
     * @param {Number} i Token's index number
     * @returns {Number} `1` if token is a single-line comment, otherwise `0`
     */
    function checkCommentSL(i) {
        return i < tokensLength && tokens[i].type === TokenType.CommentSL ? 1 : 0;
    }

    /**
     * Get node with a single-line comment.
     * @returns {Array} `['commentSL', x]` where `x` is comment's message
     *      (without `//`)
     */
    function getCommentSL() {
        var startPos = pos,
            x = tokens[pos++].value.substring(2);

        var token = tokens[startPos];
        return new Node(NodeType.CommentSLType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a condition
     * (e.g. `@if ...`, `@else if ...` or `@else ...`).
     * @param {Number} i Token's index number
     * @returns {Number} Length of the condition
     */
    function checkCondition(i) {
        var start = i,
            l, _i, s;

        if (i >= tokensLength) return 0;

        if (l = checkAtkeyword(i)) i += l;
        else return 0;

        if (['if', 'else'].indexOf(tokens[start + 1].value) < 0) return 0;

        while (i < tokensLength) {
            if (l = checkBlock(i)) break;

            s = checkSC(i);
            _i = i + s;

            if (l = _checkCondition(_i)) i += l + s;
            else break;
        }

        return i - start;
    }

    function _checkCondition(i) {
        return checkVariable(i) ||
             checkNumber(i) ||
             checkIdent(i) ||
             checkOperator(i) ||
             checkCombinator(i) ||
             checkString(i);
    }

    /**
     * Get node with a condition.
     * @returns {Array} `['condition', x]`
     */
    function getCondition() {
        var startPos = pos,
            x = [getAtkeyword()];

        while (pos < tokensLength) {
            if (checkBlock(pos)) break;

            s = checkSC(pos);
            _pos = pos + s;

            if (!_checkCondition(_pos)) break;

            if (s) x = x.concat(getSC());
            x.push(_getCondition());
        }

        var token = tokens[startPos];
        return new Node(NodeType.ConditionType, x, token.ln, token.col);
    }

    function _getCondition() {
        if (checkVariable(pos)) return getVariable();
        if (checkNumber(pos)) return getNumber();
        if (checkIdent(pos)) return getIdent();
        if (checkOperator(pos)) return getOperator();
        if (checkCombinator(pos)) return getCombinator();
        if (checkString(pos)) return getString();
    }

    /**
     * Check if token is part of a conditional statement
     * (e.g. `@if ... {} @else if ... {} @else ... {}`).
     * @param {Number} i Token's index number
     * @returns {Number} Length of the condition
     */
    function checkConditionalStatement(i) {
        var start = i,
            l;

        if (i >= tokensLength) return 0;

        if (l = checkCondition(i)) i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        if (l = checkBlock(i)) i += l;
        else return 0;

        return i - start;
    }

    /**
     * Get node with a condition.
     * @returns {Array} `['condition', x]`
     */
    function getConditionalStatement() {
        var startPos = pos,
            x = [];

        x.push(getCondition());
        x = x.concat(getSC());
        x.push(getBlock());

        var token = tokens[startPos];
        return new Node(NodeType.ConditionalStatementType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a declaration (property-value pair)
     * @param {Number} i Token's index number
     * @returns {Number} Length of the declaration
     */
    function checkDeclaration(i) {
        return checkDeclaration1(i) || checkDeclaration2(i);
    }

    /**
     * Get node with a declaration
     * @returns {Array} `['declaration', ['property', x], ['propertyDelim'],
     *       ['value', y]]`
     */
    function getDeclaration() {
        return checkDeclaration1(pos) ? getDeclaration1() : getDeclaration2();
    }

    /**
     * Check if token is part of a declaration (property-value pair)
     * @param {Number} i Token's index number
     * @returns {Number} Length of the declaration
     */
    function checkDeclaration1(i) {
        var start = i,
        l;

        if (i >= tokensLength) return 0;

        if (l = checkProperty(i)) i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        if (l = checkPropertyDelim(i)) i++;
        else return 0;

        if (l = checkValue(i)) return i + l - start;

        if (l = checkS(i)) i += l;

        if (l = checkValue(i)) i += l;
        else return 0;

        return i - start;
    }

    /**
     * Get node with a declaration
     * @returns {Array} `['declaration', ['property', x], ['propertyDelim'],
     *       ['value', y]]`
     */
    function getDeclaration1() {
        var startPos = pos,
            x = [];

        x.push(getProperty());
        if (checkS(pos)) x.push(getS());
        x.push(getPropertyDelim());
        if (checkS(pos)) x.push(getS());
        x.push(getValue());

        var token = tokens[startPos];
        return new Node(NodeType.DeclarationType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a declaration (property-value pair)
     * @param {Number} i Token's index number
     * @returns {Number} Length of the declaration
     */
    function checkDeclaration2(i) {
        var start = i,
            l;

        if (i >= tokensLength) return 0;

        if (l = checkPropertyDelim(i)) i++;
        else return 0;

        if (l = checkProperty(i)) i += l;
        else return 0;

        if (l = checkValue(i)) return i + l - start;

        if (l = checkSC(i)) i += l;

        if (l = checkValue(i)) i += l;
        else return 0;

        return i - start;
    }

    /**
     * Get node with a declaration
     * @returns {Array} `['declaration', ['propertyDelim'], ['property', x],
     *       ['value', y]]`
     */
    function getDeclaration2() {
        var startPos = pos,
            x = [];

        x.push(getPropertyDelim());
        x.push(getProperty());
        x = x.concat(getSC());
        x.push(getValue());

        var token = tokens[startPos];
        return new Node(NodeType.DeclarationType, x, token.ln, token.col);
    }

    /**
     * Check if token is a semicolon
     * @param {Number} i Token's index number
     * @returns {Number} `1` if token is a semicolon, otherwise `0`
     */
    function checkDeclDelim(i) {
        if (i >= tokensLength) return 0;

        return (tokens[i].type === TokenType.Newline ||
            tokens[i].type === TokenType.Semicolon) ? 1 : 0;
    }

    /**
     * Get node with a semicolon
     * @returns {Array} `['declDelim']`
     */
    function getDeclDelim() {
        var startPos = pos++;

        var token = tokens[startPos];
        return new Node(NodeType.DeclDelimType, '\n', token.ln, token.col);
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
     * Check if token if part of `!default` word.
     * @param {Number} i Token's index number
     * @returns {Number} Length of the `!default` word
     */
    function checkDefault(i) {
        var start = i,
            l;

        if (i >= tokensLength ||
            tokens[i++].type !== TokenType.ExclamationMark) return 0;

        if (l = checkSC(i)) i += l;

        return tokens[i].value === 'default' ? i - start + 1 : 0;
    }

    /**
     * Get node with a `!default` word
     * @returns {Array} `['default', sc]` where `sc` is optional whitespace
     */
    function getDefault() {
        var startPos = pos,
            x = [],
            sc;

        // Skip `!`:
        pos++;

        sc = getSC();

        // Skip `default`:
        pos++;

        x = x.concat(sc);

        var token = tokens[startPos];
        return new Node(NodeType.DefaultType, x, token.ln, token.col);
    }

    /**
     * Check if token is a comma
     * @param {Number} i Token's index number
     * @returns {Number} `1` if token is a comma, otherwise `0`
     */
    function checkDelim(i) {
        return i < tokensLength && tokens[i].type === TokenType.Comma ? 1 : 0;
    }

    /**
     * Get node with a comma
     * @returns {Array} `['delim']`
     */
    function getDelim() {
        var startPos = pos++;

        var token = tokens[startPos];
        return new Node(NodeType.DelimType, ',', token.ln, token.col);
    }

    /**
     * Check if token is part of a number with dimension unit (e.g. `10px`)
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {Array} `['dimension', ['number', x], ['ident', y]]` where
     *      `x` is a number converted to string (e.g. `'10'`) and `y` is
     *      a dimension unit (e.g. `'px'`).
     */
    function getDimension() {
        var startPos = pos,
            x = [getNumber()],
            token = tokens[pos],
            ident = new Node(NodeType.IdentType, getNmName2(), token.ln, token.col);

        x.push(ident);

        token = tokens[startPos];
        return new Node(NodeType.DimensionType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {Array} `['filter', x, y]`
     */
    function getFilter() {
        var startPos = pos,
            x = [getFilterp()];

        pos++;

        x.push(getFilterv());

        var token = tokens[startPos];
        return new Node(NodeType.FilterType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {Array}
     */
    function getFilterp() {
        var startPos = pos,
            token = tokens[pos],
            ident = new Node(NodeType.IdentType, joinValues2(pos, tokens[pos].filterp_l), token.ln, token.col),
            x;

        pos += tokens[pos].filterp_l;

        x = [ident].concat(getSC());

        return new Node(NodeType.PropertyType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkFilterv(i) {
        var start = i,
            l;

        if (i >= tokensLength) return 0;

        if (l = checkProgid(i)) i += l;
        else return 0;

        while (l = checkProgid(i)) {
            i += l;
        }

        tokens[start].last_progid = i;

        if (checkDeclDelim(i)) return i - start;

        if (i < tokensLength && (l = checkSC(i))) i += l;

        if (i < tokensLength && (l = checkImportant(i))) i += l;

        return i - start;
    }

    /**
     * progid+:x -> [#filterv].concat(x)
     * @returns {Array}
     */
    function getFilterv() {
        var startPos = pos,
            token = tokens[startPos],
            x = [],
            last_progid = tokens[pos].last_progid;

        while (pos < last_progid) {
            x.push(getProgid());
        }

        if (checkDeclDelim(pos))
            return new Node(NodeType.FiltervType, x, token.ln, token.col);

        if (checkSC(pos)) x = x.concat(getSC());

        if (pos < tokensLength && checkImportant(pos)) x.push(getImportant());

        return new Node(NodeType.FiltervType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkFunctionExpression(i) {
        var start = i;

        if (i >= tokensLength || tokens[i++].value !== 'expression' ||
            i >= tokensLength || tokens[i].type !== TokenType.LeftParenthesis) return 0;

        return tokens[i].right - start + 1;
    }

    /**
     * @returns {Array}
     */
    function getFunctionExpression() {
        var startPos = pos,
            x;

        pos++;

        x = joinValues(pos + 1, tokens[pos].right - 1);

        pos = tokens[pos].right + 1;

        var token = tokens[startPos];
        return new Node(NodeType.FunctionExpressionType, [x], token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {Array}
     */
    function getFunction() {
        var startPos = pos,
            ident = getIdent(),
            x = [ident],
            body;

        body = ident.content === 'not' ? getNotArguments() : getArguments();

        x.push(body);

        var token = tokens[startPos];
        return new Node(NodeType.FunctionType, x, token.ln, token.col);
    }

    /**
     * @returns {Array}
     */
    function getArguments() {
        var startPos = pos,
            x = [],
            body;

        pos++;

        while (pos < tokensLength && tokens[pos].type !== TokenType.RightParenthesis) {
            if (checkDeclaration(pos)) x.push(getDeclaration());
            else if (checkArgument(pos)) {
                body = getArgument();
                if (typeof body.content === 'string') x.push(body);
                else x = x.concat(body);
            } else if (checkClass(pos)) x.push(getClass());
            else throwError();
        }

        pos++;

        var token = tokens[startPos];
        return new Node(NodeType.ArgumentsType, x, token.ln, token.col);
    }

    /**
     * @returns {Array}
     */
    function getNotArguments() {
        var startPos = pos,
            x = [];

        pos++;

        while (pos < tokensLength &&
               tokens[pos].type !== TokenType.RightParenthesis) {
            if (checkSimpleSelector(pos)) x.push(getSimpleSelector());
            else throwError();
        }

        pos++;

        var token = tokens[startPos];
        return new Node(NodeType.ArgumentsType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of an identifier
     * @param {Number} i Token's index number
     * @returns {Number} Length of the identifier
     */
    function checkIdent(i) {
        var start = i,
            wasIdent,
            wasInt = false,
            l;

        if (i >= tokensLength) return 0;

        // Check if token is part of an identifier starting with `_`:
        if (tokens[i].type === TokenType.LowLine) return checkIdentLowLine(i);

        if (tokens[i].type === TokenType.HyphenMinus &&
            tokens[i + 1].type === TokenType.DecimalNumber) return 0;

        // If token is a character, `-`, `$` or `*`, skip it & continue:
        if (l = _checkIdent(i)) i += l;
        else return 0;

        // Remember if previous token's type was identifier:
        wasIdent = tokens[i - 1].type === TokenType.Identifier;

        while (i < tokensLength) {
            l = _checkIdent(i);

            if (!l) break;

            wasIdent = true;
            i += l;
        }

        if (!wasIdent && !wasInt && tokens[start].type !== TokenType.Asterisk) return 0;

        tokens[start].ident_last = i - 1;

        return i - start;
    }

    function _checkIdent(i) {
        if (tokens[i].type === TokenType.HyphenMinus ||
            tokens[i].type === TokenType.Identifier ||
            tokens[i].type === TokenType.DollarSign ||
            tokens[i].type === TokenType.LowLine ||
            tokens[i].type === TokenType.DecimalNumber ||
            tokens[i].type === TokenType.Asterisk) return 1;
        return 0;
    }

    /**
     * Check if token is part of an identifier starting with `_`
     * @param {Number} i Token's index number
     * @returns {Number} Length of the identifier
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
     * @returns {Array} `['ident', x]` where `x` is identifier's name
     */
    function getIdent() {
        var startPos = pos,
            x = joinValues(pos, tokens[pos].ident_last);

        pos = tokens[pos].ident_last + 1;

        var token = tokens[startPos];
        return new Node(NodeType.IdentType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of `!important` word
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {Array} `['important', sc]` where `sc` is optional whitespace
     */
    function getImportant() {
        var startPos = pos++,
            x = getSC();

        pos++;

        var token = tokens[startPos];
        return new Node(NodeType.ImportantType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of an included mixin (`@include` or `@extend`
     *      directive).
     * @param {Number} i Token's index number
     * @returns {Number} Length of the included mixin
     */
    function checkInclude(i) {
        var l;

        if (i >= tokensLength) return 0;

        if (l = checkInclude1(i)) tokens[i].include_type = 1;
        else if (l = checkInclude2(i)) tokens[i].include_type = 2;
        else if (l = checkInclude3(i)) tokens[i].include_type = 3;
        else if (l = checkInclude4(i)) tokens[i].include_type = 4;
        else if (l = checkInclude5(i)) tokens[i].include_type = 5;
        else if (l = checkInclude6(i)) tokens[i].include_type = 6;
        else if (l = checkInclude7(i)) tokens[i].include_type = 7;
        else if (l = checkInclude8(i)) tokens[i].include_type = 8;

        return l;
    }

    /**
     * Get node with included mixin
     * @returns {Array} `['include', x]`
     */
    function getInclude() {
        switch (tokens[pos].include_type) {
            case 1: return getInclude1();
            case 2: return getInclude2();
            case 3: return getInclude3();
            case 4: return getInclude4();
            case 5: return getInclude5();
            case 6: return getInclude6();
            case 7: return getInclude7();
            case 8: return getInclude8();
        }
    }

    /**
     * Check if token is part of an included mixin like `@include nani(foo) {...}`
     * @param {Number} i Token's index number
     * @returns {Number} Length of the include
     */
    function checkInclude1(i) {
        var start = i,
        l;

        if (l = checkAtkeyword(i)) i += l;
        else return 0;

        // TODO: Check if extends don't take any arguments
        if (['include', 'extend'].indexOf(tokens[start + 1].value) < 0) return 0;

        if (l = checkSC(i)) i += l;
        else return 0;

        if (l = checkIncludeSelector(i)) i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        if (l = checkArguments(i)) i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        if (l = checkBlock(i)) i += l;
        else return 0;

        return i - start;
    }

    /**
     * Get node with included mixin like `@include nani(foo) {...}`
     * @returns {Array} `['include', ['atkeyword', x], sc, ['selector', y], sc,
     *      ['arguments', z], sc, ['block', q], sc` where `x` is `include` or
     *      `extend`, `y` is mixin's identifier (selector), `z` are arguments
     *      passed to the mixin, `q` is block passed to the mixin and `sc`
     *      are optional whitespaces
     */
    function getInclude1() {
        var startPos = pos,
            x = [];

        x.push(getAtkeyword());

        x = x.concat(getSC());

        x.push(getIncludeSelector());

        x = x.concat(getSC());

        x.push(getArguments());

        x = x.concat(getSC());

        x.push(getBlock());

        var token = tokens[startPos];
        return new Node(NodeType.IncludeType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of an included mixin like `@include nani(foo)`
     * @param {Number} i Token's index number
     * @returns {Number} Length of the include
     */
    function checkInclude2(i) {
        var start = i,
        l;

        if (l = checkAtkeyword(i)) i += l;
        else return 0;

        // TODO: Check if extends don't take any arguments
        if (['include', 'extend'].indexOf(tokens[start + 1].value) < 0) return 0;

        if (l = checkSC(i)) i += l;
        else return 0;

        if (l = checkIncludeSelector(i)) i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        if (l = checkArguments(i)) i += l;
        else return 0;

        return i - start;
    }

    /**
     * Get node with included mixin like `@include nani(foo)`
     * @returns {Array} `['include', ['atkeyword', x], sc, ['selector', y], sc,
     *      ['arguments', z], sc]` where `x` is `include` or `extend`, `y` is
     *      mixin's identifier (selector), `z` are arguments passed to the
     *      mixin and `sc` are optional whitespaces
     */
    function getInclude2() {
        var startPos = pos,
            x = [];

        x.push(getAtkeyword());

        x = x.concat(getSC());

        x.push(getIncludeSelector());

        x = x.concat(getSC());

        x.push(getArguments());

        var token = tokens[startPos];
        return new Node(NodeType.IncludeType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of an included mixin with a content block passed
     *      as an argument (e.g. `@include nani {...}`)
     * @param {Number} i Token's index number
     * @returns {Number} Length of the mixin
     */
    function checkInclude3(i) {
        var start = i,
            l;

        if (l = checkAtkeyword(i)) i += l;
        else return 0;

        if (['include', 'extend'].indexOf(tokens[start + 1].value) < 0) return 0;

        if (l = checkSC(i)) i += l;
        else return 0;

        if (l = checkIncludeSelector(i)) i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        if (l = checkBlock(i)) i += l;
        else return 0;

        return i - start;
    }

    /**
     * Get node with an included mixin with a content block passed
     *      as an argument (e.g. `@include nani {...}`)
     * @returns {Array} `['include', x]`
     */
    function getInclude3() {
        var startPos = pos,
            x = [];

        x.push(getAtkeyword());

        x = x.concat(getSC());

        x.push(getIncludeSelector());

        x = x.concat(getSC());

        x.push(getBlock());

        var token = tokens[startPos];
        return new Node(NodeType.IncludeType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkInclude4(i) {
        var start = i,
            l;

        if (l = checkAtkeyword(i)) i += l;
        else return 0;

        if (['include', 'extend'].indexOf(tokens[start + 1].value) < 0) return 0;

        if (l = checkSC(i)) i += l;
        else return 0;

        if (l = checkIncludeSelector(i)) i += l;
        else return 0;

        return i - start;
    }

    /**
     * @returns {Array} `['include', x]`
     */
    function getInclude4() {
        var startPos = pos,
            x = [];

        x.push(getAtkeyword());

        x = x.concat(getSC());

        x.push(getIncludeSelector());

        var token = tokens[startPos];
        return new Node(NodeType.IncludeType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of an included mixin like `+nani(foo) {...}`
     * @param {Number} i Token's index number
     * @returns {Number} Length of the include
     */
    function checkInclude5(i) {
        var start = i,
        l;

        if (tokens[i].type === TokenType.PlusSign) i++;
        else return 0;

        if (l = checkIncludeSelector(i)) i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        if (l = checkArguments(i)) i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        if (l = checkBlock(i)) i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        return i - start;
    }

    /**
     * Get node with included mixin like `+nani(foo) {...}`
     * @returns {Array} `['include', ['operator', '+'], ['selector', x], sc,
     *      ['arguments', y], sc, ['block', z], sc` where `x` is
     *      mixin's identifier (selector), `y` are arguments passed to the
     *      mixin, `z` is block passed to mixin and `sc` are optional whitespaces
     */
    function getInclude5() {
        var startPos = pos,
            x = [];

        x.push(getOperator());

        x.push(getIncludeSelector());

        x = x.concat(getSC());

        x.push(getArguments());

        x = x.concat(getSC());

        x.push(getBlock());

        x = x.concat(getSC());

        var token = tokens[startPos];
        return new Node(NodeType.IncludeType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of an included mixin like `+nani(foo)`
     * @param {Number} i Token's index number
     * @returns {Number} Length of the include
     */
    function checkInclude6(i) {
        var start = i,
        l;

        if (tokens[i].type === TokenType.PlusSign) i++;
        else return 0;

        if (l = checkIncludeSelector(i)) i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        if (l = checkArguments(i)) i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        return i - start;
    }

    /**
     * Get node with included mixin like `+nani(foo)`
     * @returns {Array} `['include', ['operator', '+'], ['selector', y], sc,
     *      ['arguments', z], sc]` where `y` is
     *      mixin's identifier (selector), `z` are arguments passed to the
     *      mixin and `sc` are optional whitespaces
     */
    function getInclude6() {
        var startPos = pos,
            x = [];

        x.push(getOperator());

        x.push(getIncludeSelector());

        x = x.concat(getSC());

        x.push(getArguments());

        x = x.concat(getSC());

        var token = tokens[startPos];
        return new Node(NodeType.IncludeType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of an included mixin with a content block passed
     *      as an argument (e.g. `+nani {...}`)
     * @param {Number} i Token's index number
     * @returns {Number} Length of the mixin
     */
    function checkInclude7(i) {
        var start = i,
            l;

        if (tokens[i].type === TokenType.PlusSign) i++;
        else return 0;

        if (l = checkIncludeSelector(i)) i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        if (l = checkBlock(i)) i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        return i - start;
    }

    /**
     * Get node with an included mixin with a content block passed
     *      as an argument (e.g. `+nani {...}`)
     * @returns {Array} `['include', x]`
     */
    function getInclude7() {
        var startPos = pos,
            x = [];

        x.push(getOperator());

        x.push(getIncludeSelector());

        x = x.concat(getSC());

        x.push(getBlock());

        x = x.concat(getSC());

        var token = tokens[startPos];
        return new Node(NodeType.IncludeType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkInclude8(i) {
        var start = i,
            l;

        if (tokens[i].type === TokenType.PlusSign) i++;
        else return 0;

        if (l = checkIncludeSelector(i)) i += l;
        else return 0;

        return i - start;
    }

    /**
     * @returns {Array} `['include', x]`
     */
    function getInclude8() {
        var startPos = pos,
            x = [];

        x.push(getOperator());

        x.push(getIncludeSelector());

        var token = tokens[startPos];
        return new Node(NodeType.IncludeType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkIncludeSelector(i) {
        var start = i,
            l;

        while (i < tokensLength) {
            if (l = checkSimpleSelector2(i)) i += l;
            else break;
        }

        return i - start;
    }

    /**
     * @returns {Array}
     */
    function getIncludeSelector() {
        var startPos = pos,
            x = [],
            t;

        while (pos < tokensLength && checkSimpleSelector2(pos)) {
            t = getSimpleSelector2();

            if (typeof t.content === 'string') x.push(t);
            else x = x.concat(t);
        }

        var token = tokens[startPos];
        return new Node(NodeType.SimpleselectorType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of an interpolated variable (e.g. `#{$nani}`).
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkInterpolation(i) {
        var start = i,
            l;

        if (i >= tokensLength) return 0;

        if (tokens[i].type !== TokenType.NumberSign ||
            !tokens[i + 1] ||
            tokens[i + 1].type !== TokenType.LeftCurlyBracket) return 0;

        i += 2;

        if (l = checkVariable(i)) i += l;
        else return 0;

        return tokens[i].type === TokenType.RightCurlyBracket ? i - start + 1 : 0;
    }

    /**
     * Get node with an interpolated variable
     * @returns {Array} `['interpolation', x]`
     */
    function getInterpolation() {
        var startPos = pos,
            x = [];

        // Skip `#{`:
        pos += 2;

        x.push(getVariable());

        // Skip `}`:
        pos++;

        var token = tokens[startPos];
        return new Node(NodeType.InterpolationType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a loop.
     * @param {Number} i Token's index number
     * @returns {Number} Length of the loop
     */
    function checkLoop(i) {
        var start = i,
            l;

        if (i >= tokensLength) return 0;

        if (l = checkAtkeyword(i)) i += l;
        else return 0;

        if (['for', 'each', 'while'].indexOf(tokens[start + 1].value) < 0) return 0;

        while (i < tokensLength) {
            if (l = checkBlock(i)) {
                i += l;
                break;
            } else if (l = checkVariable(i) ||
                       checkNumber(i) ||
                       checkIdent(i) ||
                       checkSC(i) ||
                       checkOperator(i) ||
                       checkCombinator(i) ||
                       checkString(i)) i += l;
            else return 0;
        }

        return i - start;
    }

    /**
     * Get node with a loop.
     * @returns {Array} `['loop', x]`
     */
    function getLoop() {
        var startPos = pos,
            x = [];

        x.push(getAtkeyword());

        while (pos < tokensLength) {
            if (checkBlock(pos)) {
                x.push(getBlock());
                break;
            }
            else if (checkVariable(pos)) x.push(getVariable());
            else if (checkNumber(pos)) x.push(getNumber());
            else if (checkIdent(pos)) x.push(getIdent());
            else if (checkOperator(pos)) x.push(getOperator());
            else if (checkCombinator(pos)) x.push(getCombinator());
            else if (checkSC(pos)) x = x.concat(getSC());
            else if (checkString(pos)) x.push(getString());
        }

        var token = tokens[startPos];
        return new Node(NodeType.LoopType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a mixin
     * @param {Number} i Token's index number
     * @returns {Number} Length of the mixin
     */
    function checkMixin(i) {
        return checkMixin1(i) || checkMixin2(i);
    }

    /**
     * Get node with a mixin
     * @returns {Array} `['mixin', x]`
     */
    function getMixin() {
        return checkMixin1(pos) ? getMixin1() : getMixin2();
    }

    /**
     * Check if token is part of a mixin
     * @param {Number} i Token's index number
     * @returns {Number} Length of the mixin
     */
    function checkMixin1(i) {
        var start = i,
            l;

        if (i >= tokensLength) return 0;

        if ((l = checkAtkeyword(i)) && tokens[i + 1].value === 'mixin') i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        if (l = checkIdent(i)) i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        if (l = checkBlock(i)) i += l;
        else {
            if (l = checkArguments(i)) i += l;

            if (l = checkSC(i)) i += l;

            if (l = checkBlock(i)) i += l;
            else return 0;
        }

        return i - start;
    }

    /**
     * Get node with a mixin
     * @returns {Array} `['mixin', x]`
     */
    function getMixin1() {
        var startPos = pos,
            x = [getAtkeyword()];

        x = x.concat(getSC());

        if (checkIdent(pos)) x.push(getIdent());

        x = x.concat(getSC());

        if (checkBlock(pos)) x.push(getBlock());
        else {
            if (checkArguments(pos)) x.push(getArguments());

            x = x.concat(getSC());

            x.push(getBlock());
        }

        var token = tokens[startPos];
        return new Node(NodeType.MixinType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a mixin
     * @param {Number} i Token's index number
     * @returns {Number} Length of the mixin
     */
    function checkMixin2(i) {
        var start = i,
        l;

        if (i >= tokensLength) return 0;

        if (tokens[i].type === TokenType.EqualsSign) i++;
        else return 0;

        if (l = checkSC(i)) i += l;

        if (l = checkIdent(i)) i += l;
        else return 0;

        if (l = checkSC(i)) i += l;

        if (l = checkBlock(i)) i += l;
        else {
            if (l = checkArguments(i)) i += l;

            if (l = checkSC(i)) i += l;

            if (l = checkBlock(i)) i += l;
            else return 0;
        }

        return i - start;
    }

    /**
    * Get node with a mixin
    * @returns {Array} `['mixin', x]`
    */
    function getMixin2() {
        var startPos = pos,
            x = [getOperator()];

        x = x.concat(getSC());

        if (checkIdent(pos)) x.push(getIdent());

        x = x.concat(getSC());

        if (checkBlock(pos)) x.push(getBlock());
        else {
            if (checkArguments(pos)) x.push(getArguments());

            x = x.concat(getSC());

            x.push(getBlock());
        }

        var token = tokens[startPos];
        return new Node(NodeType.MixinType, x, token.ln, token.col);
    }

    /**
     * Check if token is a namespace sign (`|`)
     * @param {Number} i Token's index number
     * @returns {Number} `1` if token is `|`, `0` if not
     */
    function checkNamespace(i) {
        return i < tokensLength && tokens[i].type === TokenType.VerticalLine ? 1 : 0;
    }

    /**
     * Get node with a namespace sign
     * @returns {Array} `['namespace']`
     */
    function getNamespace() {
        var startPos = pos++;

        var token = tokens[startPos];
        return new Node(NodeType.NamespaceType, '|', token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {String}
     */
    function getNmName() {
        var s = joinValues(pos, tokens[pos].nm_name_last);

        pos = tokens[pos].nm_name_last + 1;

        return s;
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkNmName2(i) {
        if (tokens[i].type === TokenType.Identifier) return 1;
        else if (tokens[i].type !== TokenType.DecimalNumber) return 0;

        i++;

        return i < tokensLength && tokens[i].type === TokenType.Identifier ? 2 : 1;
    }

    /**
     * @returns {String}
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
     * @returns {Number}
     */
    function checkNth(i) {
        if (i >= tokensLength) return 0;

        return checkNth1(i) || checkNth2(i);
    }

    /**
     * Check if token is part of an nth-selector's identifier in the form of
     *      sequence of decimals and n-s (e.g. `3`, `n`, `2n+1`)
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {Array} `['nth', x]` where `x` is identifier's text
     */
    function getNth() {
        var startPos = pos,
            x;

        if (tokens[pos].nth_last) {
            x = joinValues(pos, tokens[pos].nth_last);
            pos = tokens[pos].nth_last + 1;
        } else {
            x = tokens[pos++].value;
        }

        var token = tokens[startPos];
        return new Node(NodeType.NthType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of `even` or `odd` nth-selector's identifier
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkNth2(i) {
        return tokens[i].value === 'even' || tokens[i].value === 'odd' ? 1 : 0;
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {String}
     */
    function getNthf() {
        pos++;

        var s = joinValues(pos, tokens[pos].nthf_last);

        pos = tokens[pos].nthf_last + 1;

        return s;
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
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
            if (l = checkSC(i) ||
                checkUnary(i) ||
                checkInterpolation(i) ||
                checkNth(i)) i += l;
            else return 0;
        }

        return rp - start + 1;
    }

    /**
     * @returns {Array}
     */
    function getNthselector() {
        var startPos = pos,
            token = tokens[pos],
            nthf = new Node(NodeType.IdentType, getNthf(), token.ln, token.col),
            x = [];

        x.push(nthf);

        pos++;

        while (tokens[pos].type !== TokenType.RightParenthesis) {
            if (checkSC(pos)) x = x.concat(getSC());
            else if (checkUnary(pos)) x.push(getUnary());
            else if (checkInterpolation(pos)) x.push(getInterpolation());
            else if (checkNth(pos)) x.push(getNth());
        }

        pos++;

        return new Node(NodeType.NthselectorType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a number
     * @param {Number} i Token's index number
     * @returns {Number} Length of number
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
     * @returns {Array} `['number', x]` where `x` is a number converted
     *      to string.
     */
    function getNumber() {
        var s = '',
            startPos = pos,
            l = tokens[pos].number_l;

        for (var j = 0; j < l; j++) {
            s += tokens[pos + j].value;
        }

        pos += l;

        var token = tokens[startPos];
        return new Node(NodeType.NumberType, s, token.ln, token.col);
    }

    /**
     * Check if token is an operator (`/`, `,`, `:` or `=`).
     * @param {Number} i Token's index number
     * @returns {Number} `1` if token is an operator, otherwise `0`
     */
    function checkOperator(i) {
        if (i >= tokensLength) return 0;

        switch(tokens[i].type) {
            case TokenType.Solidus:
            case TokenType.Comma:
            case TokenType.Colon:
            case TokenType.EqualsSign:
            case TokenType.EqualitySign:
            case TokenType.InequalitySign:
            case TokenType.LessThanSign:
            case TokenType.GreaterThanSign:
            case TokenType.Asterisk:
                return 1;
        }

        return 0;
    }

    /**
     * Get node with an operator
     * @returns {Array} `['operator', x]` where `x` is an operator converted
     *      to string.
     */
    function getOperator() {
        var startPos = pos,
            x = tokens[pos++].value;

        var token = tokens[startPos];
        return new Node(NodeType.OperatorType, x, token.ln, token.col);
    }

    /**
     * Check if token is a parent selector (`&`).
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkParentSelector(i) {
        return i < tokensLength && tokens[i].type === TokenType.Ampersand ? 1 : 0;
    }

    /**
     * Get node with a parent selector
     * @returns {Array} `['parentSelector']`
     */
    function getParentSelector() {
        var startPos = pos++;

        var token = tokens[startPos];
        return new Node(NodeType.ParentSelectorType, '&', token.ln, token.col);
    }

    /**
     * Check if token is part of a number with percent sign (e.g. `10%`)
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {Array} `['percentage', ['number', x]]` where `x` is a number
     *      (without percent sign) converted to string.
     */
    function getPercentage() {
        var startPos = pos,
            x = [getNumber()];

        pos++;

        var token = tokens[startPos];
        return new Node(NodeType.PercentageType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a placeholder selector (e.g. `%abc`).
     * @param {Number} i Token's index number
     * @returns {Number} Length of the selector
     */
    function checkPlaceholder(i) {
        var l;

        if (i >= tokensLength) return 0;

        if (tokens[i].placeholder_l) return tokens[i].placeholder_l;

        if (tokens[i].type === TokenType.PercentSign && (l = checkIdent(i + 1))) {
            tokens[i].placeholder_l = l + 1;
            return l + 1;
        } else return 0;
    }

    /**
     * Get node with a placeholder selector
     * @returns {Array} `['placeholder', ['ident', x]]` where x is a placeholder's
     *      identifier (without `%`, e.g. `abc`).
     */
    function getPlaceholder() {
        var startPos = pos,
            x = [];

        pos++;

        x.push(getIdent());

        var token = tokens[startPos];
        return new Node(NodeType.PlaceholderType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
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

        return i - start;
    }

    /**
     * @returns {Array}
     */
    function getProgid() {
        var startPos = pos,
            progid_end = tokens[pos].progid_end,
            x;

        x = []
            .concat(getSC())
            .concat([_getProgid(progid_end)]);

        var token = tokens[startPos];
        return new Node(NodeType.ProgidType, x, token.ln, token.col);
    }

    /**
     * @param {Number} progid_end
     * @returns {Array}
     */
    function _getProgid(progid_end) {
        var startPos = pos,
            x = joinValues(pos, progid_end);

        pos = progid_end + 1;

        var token = tokens[startPos];
        return new Node(NodeType.RawType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a property
     * @param {Number} i Token's index number
     * @returns {Number} Length of the property
     */
    function checkProperty(i) {
        var start = i,
            l;

        if (i >= tokensLength) return 0;

        if (l = checkVariable(i) || checkIdent(i)) i += l;
        else return 0;

        return i - start;
    }

    /**
     * Get node with a property
     * @returns {Array} `['property', x]`
     */
    function getProperty() {
        var startPos = pos,
            x = [];

        x.push(checkVariable(pos) ? getVariable() : getIdent());

        var token = tokens[startPos];
        return new Node(NodeType.PropertyType, x, token.ln, token.col);
    }

    /**
     * Check if token is a colon
     * @param {Number} i Token's index number
     * @returns {Number} `1` if token is a colon, otherwise `0`
     */
    function checkPropertyDelim(i) {
        return i < tokensLength && tokens[i].type === TokenType.Colon ? 1 : 0;
    }

    /**
     * Get node with a colon
     * @returns {Array} `['propertyDelim']`
     */
    function getPropertyDelim() {
        var startPos = pos++;

        var token = tokens[startPos];
        return new Node(NodeType.PropertyDelimType, ':', token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkPseudo(i) {
        return checkPseudoe(i) ||
            checkPseudoc(i);
    }

    /**
     * @returns {Array}
     */
    function getPseudo() {
        if (checkPseudoe(pos)) return getPseudoe();
        if (checkPseudoc(pos)) return getPseudoc();
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkPseudoe(i) {
        var l;

        if (i >= tokensLength || tokens[i++].type !== TokenType.Colon ||
            i >= tokensLength || tokens[i++].type !== TokenType.Colon) return 0;

        return (l = checkInterpolation(i) || checkIdent(i)) ? l + 2 : 0;
    }

    /**
     * @returns {Array}
     */
    function getPseudoe() {
        var startPos = pos,
            x = [];

        pos += 2;

        x.push(checkInterpolation(pos) ? getInterpolation() : getIdent());

        var token = tokens[startPos];
        return new Node(NodeType.PseudoeType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkPseudoc(i) {
        var l;

        if (i >= tokensLength || tokens[i++].type !== TokenType.Colon) return 0;

        return (l = checkInterpolation(i) || checkFunction(i) || checkIdent(i)) ? l + 1 : 0;
    }

    /**
     * @returns {Array}
     */
    function getPseudoc() {
        var startPos = pos,
            x = [];

        pos ++;

        if (checkInterpolation(pos)) x.push(getInterpolation());
        else if (checkFunction(pos)) x.push(getFunction());
        else x.push(getIdent());

        var token = tokens[startPos];
        return new Node(NodeType.PseudocType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkRuleset(i) {
        var start = i,
            l;

        if (i >= tokensLength) return 0;

        if (tokens[start].ruleset_l) return tokens[start].ruleset_l;

        while (i < tokensLength) {
            if (l = checkBlock(i)) {i += l; break;}
            else if (l = checkSelector(i)) i += l;
            else return 0;
        }

        tokens[start].ruleset_l = i - start;

        return i - start;
    }

    /**
     * @returns {Array}
     */
    function getRuleset() {
        var startPos = pos,
            x = [];

        while (pos < tokensLength) {
            if (checkBlock(pos)) {x.push(getBlock()); break;}
            else if (checkSelector(pos)) x.push(getSelector());
            else break;
        }

        var token = tokens[startPos];
        return new Node(NodeType.RulesetType, x, token.ln, token.col);
    }

    /**
     * Check if token is marked as a space (if it's a space or a tab
     *      or a line break).
     * @param i
     * @returns {Number} Number of spaces in a row starting with the given token.
     */
    function checkS(i) {
        return i < tokensLength && tokens[i].ws ? tokens[i].ws_last - i + 1 : 0;
    }

    /**
     * Get node with spaces
     * @returns {Array} `['s', x]` where `x` is a string containing spaces
     */
    function getS() {
        var startPos = pos,
            x = joinValues(pos, tokens[pos].ws_last);

        pos = tokens[pos].ws_last + 1;

        var token = tokens[startPos];
        return new Node(NodeType.SType, x, token.ln, token.col);
    }

    /**
     * Check if token is a space or a comment.
     * @param {Number} i Token's index number
     * @returns {Number} Number of similar (space or comment) tokens
     *      in a row starting with the given token.
     */
    function checkSC(i) {
        if (!tokens[i]) return 0;

        var l,
            lsc = 0,
            ln = tokens[i].ln;

        while (i < tokensLength) {
            if (tokens[i].ln !== ln) break;

            if (!(l = checkS(i)) &&
                !(l = checkCommentML(i)) &&
                !(l = checkCommentSL(i))) break;

            i += l;
            lsc += l;
        }

        return lsc || 0;
    }

    /**
     * Get node with spaces and comments
     * @returns {Array} Array containing nodes with spaces (if there are any)
     *      and nodes with comments (if there are any):
     *      `[['s', x]*, ['comment', y]*]` where `x` is a string of spaces
     *      and `y` is a comment's text (without `/*` and `* /`).
     */
    function getSC() {
        var sc = [],
            ln;

        if (pos >= tokensLength) return sc;

        ln = tokens[pos].ln;

        while (pos < tokensLength) {
            if (tokens[pos].ln !== ln) break;
            else if (checkS(pos)) sc.push(getS());
            else if (checkCommentML(pos)) sc.push(getCommentML());
            else if (checkCommentSL(pos)) sc.push(getCommentSL());
            else break;
        }

        return sc;
    }

    /**
     * Check if token is part of a selector
     * @param {Number} i Token's index number
     * @returns {Number} Length of the selector
     */
    function checkSelector(i) {
        var start = i,
            l, ln;

        if (i >= tokensLength) return 0;

        ln = tokens[i].ln;

        while (i < tokensLength) {
            if (tokens[i].ln !== ln) break;

            if ((l = checkDeclDelim(i) && checkBlock(i + l)) || checkSC(i)) i += l;

            if (l = checkSimpleSelector(i) || checkDelim(i))  i += l;
            else break;
        }

        tokens[start].selector_end = i - 1;

        return i - start;
    }

    /**
     * @returns {Array}
     */
    function getSelector() {
        var startPos = pos,
            x = [],
            selector_end = tokens[pos].selector_end,
            ln = tokens[pos].ln;

        while (pos <= selector_end) {
            if (tokens[pos].ln !== ln) break;

            if ((l = checkDeclDelim(pos)) && checkBlock(pos + l)) x.push(getDeclDelim());
            else if (checkSC(pos)) x = x.concat(getSC());

            x.push(checkDelim(pos) ? getDelim() : getSimpleSelector());
        }

        var token = tokens[startPos];
        return new Node(NodeType.SelectorType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a hexadecimal number (e.g. `#fff`) inside
     *      a simple selector
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkShash(i) {
        var l;

        if (i >= tokensLength || tokens[i].type !== TokenType.NumberSign) return 0;

        return (l = checkNmName(i + 1)) ? l + 1 : 0;
    }

    /**
     * Get node with a hexadecimal number (e.g. `#fff`) inside a simple
     *      selector
     * @returns {Array} `['shash', x]` where `x` is a hexadecimal number
     *      converted to string (without `#`, e.g. `fff`)
     */
    function getShash() {
        var startPos = pos,
            x = [];

        pos++;

        x.push(getNmName());

        var token = tokens[startPos];
        return new Node(NodeType.ShashType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkSimpleSelector(i) {
        if (i >= tokensLength) return 0;

        var start = i,
            l,
            ln = tokens[i].ln;

        while (i < tokensLength) {
            if (tokens[i].ln !== ln) break;

            if (l = checkSimpleSelector1(i)) i += l;
            else break;
        }

        return (i - start) || 0;
    }

    /**
     * @returns {Array}
     */
    function getSimpleSelector() {
        var startPos = pos,
            x = [],
            t,
            ln = tokens[pos].ln;

        while (pos < tokensLength) {
            if (tokens[pos].ln !== ln ||
                !checkSimpleSelector1(pos)) break;

            t = getSimpleSelector1();

            if (typeof t.content === 'string') x.push(t);
            else x = x.concat(t);
        }

        var token = tokens[startPos];
        return new Node(NodeType.SimpleselectorType, x, token.ln, token.col);
    }

    /**
    * @param {Number} i Token's index number
    * @returns {Number}
    */
    function checkSimpleSelector1(i) {
        var l;

        if (l = checkParentSelector(i)) tokens[i].simpleselector1_child = 1;
        else if (l = checkInterpolation(i)) tokens[i].simpleselector1_child = 2;
        else if (l = checkNthselector(i)) tokens[i].simpleselector1_child = 3;
        else if (l = checkCombinator(i)) tokens[i].simpleselector1_child = 4;
        else if (l = checkAttrib(i)) tokens[i].simpleselector1_child = 5;
        else if (l = checkPseudo(i)) tokens[i].simpleselector1_child = 6;
        else if (l = checkShash(i)) tokens[i].simpleselector1_child = 7;
        else if (l = checkAny(i)) tokens[i].simpleselector1_child = 8;
        else if (l = checkSC(i)) tokens[i].simpleselector1_child = 9;
        else if (l = checkNamespace(i)) tokens[i].simpleselector1_child = 10;
        else if (l = checkDeepSelector(i)) tokens[i].simpleselector1_child = 11;

        return l;
    }

    /**
     * @returns {Array}
     */
    function getSimpleSelector1() {
        var childType = tokens[pos].simpleselector1_child;
        if (childType === 1) return getParentSelector();
        if (childType === 2) return getInterpolation();
        if (childType === 3) return getNthselector();
        if (childType === 4) return getCombinator();
        if (childType === 5) return getAttrib();
        if (childType === 6) return getPseudo();
        if (childType === 7) return getShash();
        if (childType === 8) return getAny();
        if (childType === 9) return getSC();
        if (childType === 10) return getNamespace();
        if (childType === 11) return getDeepSelector();
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkSimpleSelector2(i) {
        return checkParentSelector(i) ||
            checkNthselector(i) ||
            checkAttrib(i) ||
            checkPseudo(i) ||
            checkShash(i) ||
            checkPlaceholder(i) ||
            checkIdent(i) ||
            checkClass(i);
    }

    /**
     * @returns {Array}
     */
    function getSimpleSelector2() {
        if (checkParentSelector(pos)) return getParentSelector();
        else if (checkNthselector(pos)) return getNthselector();
        else if (checkAttrib(pos)) return getAttrib();
        else if (checkPseudo(pos)) return getPseudo();
        else if (checkShash(pos)) return getShash();
        else if (checkPlaceholder(pos)) return getPlaceholder();
        else if (checkIdent(pos)) return getIdent();
        else if (checkClass(pos)) return getClass();
    }

    /**
     * Check if token is part of a string (text wrapped in quotes)
     * @param {Number} i Token's index number
     * @returns {Number} `1` if token is part of a string, `0` if not
     */
    function checkString(i) {
        return i < tokensLength && (tokens[i].type === TokenType.StringSQ || tokens[i].type === TokenType.StringDQ) ? 1 : 0;
    }

    /**
     * Get string's node
     * @returns {Array} `['string', x]` where `x` is a string (including
     *      quotes).
     */
    function getString() {
        var startPos = pos,
            x = tokens[pos++].value;

        var token = tokens[startPos];
        return new Node(NodeType.StringType, x, token.ln, token.col);
    }

    /**
     * Validate stylesheet: it should consist of any number (0 or more) of
     * rulesets (sets of rules with selectors), @-rules, whitespaces or
     * comments.
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkStylesheet(i) {
        var start = i,
            l;

        while (i < tokensLength) {
            if (l = checkSC(i) ||
                checkDeclaration(i) ||
                checkDeclDelim(i) ||
                checkInclude(i) ||
                checkMixin(i) ||
                checkLoop(i) ||
                checkConditionalStatement(i) ||
                checkAtrule(i) ||
                checkRuleset(i)) i += l;
            else throwError(i);
        }

        return i - start;
    }

    /**
     * @returns {Array} `['stylesheet', x]` where `x` is all stylesheet's
     *      nodes.
     */
    function getStylesheet() {
        var startPos = pos,
            x = [];

        while (pos < tokensLength) {
            if (checkSC(pos)) x = x.concat(getSC());
            else if (checkRuleset(pos)) x.push(getRuleset());
            else if (checkInclude(pos)) x.push(getInclude());
            else if (checkMixin(pos)) x.push(getMixin());
            else if (checkLoop(pos)) x.push(getLoop());
            else if (checkConditionalStatement(pos)) x.push(getConditionalStatement());
            else if (checkAtrule(pos)) x.push(getAtrule());
            else if (checkDeclaration(pos)) x.push(getDeclaration());
            else if (checkDeclDelim(pos)) x.push(getDeclDelim());
            else throwError();
        }

        var token = tokens[startPos];
        return new Node(NodeType.StylesheetType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkTset(i) {
        return checkVhash(i) ||
            checkAny(i) ||
            checkSC(i) ||
            checkOperator(i);
    }

    /**
     * @returns {Array}
     */
    function getTset() {
        if (checkVhash(pos)) return getVhash();
        else if (checkAny(pos)) return getAny();
        else if (checkSC(pos)) return getSC();
        else if (checkOperator(pos)) return getOperator();
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkTsets(i) {
        var start = i,
            l;

        if (i >= tokensLength) return 0;

        while (tokens[i - 1].type !== TokenType.Newline &&
              (l = checkTset(i))) {
            i += l;
        }

        return i - start;
    }

    /**
     * @returns {Array}
     */
    function getTsets() {
        var x = [],
            t;

        while (tokens[pos - 1].type !== TokenType.Newline &&
              (t = getTset())) {
            if (typeof t.content === 'string') x.push(t);
            else x = x.concat(t);
        }

        return x;
    }

    /**
     * Check if token is an unary (arithmetical) sign (`+` or `-`)
     * @param {Number} i Token's index number
     * @returns {Number} `1` if token is an unary sign, `0` if not
     */
    function checkUnary(i) {
        return i < tokensLength && (tokens[i].type === TokenType.HyphenMinus || tokens[i].type === TokenType.PlusSign) ? 1 : 0;
    }

    /**
     * Get node with an unary (arithmetical) sign (`+` or `-`)
     * @returns {Array} `['unary', x]` where `x` is an unary sign
     *      converted to string.
     */
    function getUnary() {
        var startPos = pos,
            x = tokens[pos++].value;

        var token = tokens[startPos];
        return new Node(NodeType.UnaryType, x, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkUnknown(i) {
        return i < tokensLength && tokens[i].type === TokenType.CommentSL ? 1 : 0;
    }

    /**
     * @returns {Array}
     */
    function getUnknown() {
        var startPos = pos,
            x = tokens[pos++].value;

        var token = tokens[startPos];
        return new Node(NodeType.UnknownType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of URI (e.g. `url('/css/styles.css')`)
     * @param {Number} i Token's index number
     * @returns {Number} Length of URI
     */
    function checkUri(i) {
        var start = i;

        if (i >= tokensLength || tokens[i++].value !== 'url' ||
            i >= tokensLength || tokens[i].type !== TokenType.LeftParenthesis)
            return 0;

        return tokens[i].right - start + 1;
    }

    /**
     * Get node with URI
     * @returns {Array} `['uri', x]` where `x` is URI's nodes (without `url`
     *      and braces, e.g. `['string', ''/css/styles.css'']`).
     */
    function getUri() {
        var startPos = pos,
            uriExcluding = {},
            uri,
            token,
            l,
            raw;

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
            uri = [].concat(getSC()),
            l = checkExcluding(uriExcluding, pos),
            token = tokens[pos],
            raw = new Node(NodeType.RawType, joinValues(pos, pos + l), token.ln, token.col);

            uri.push(raw);

            pos += l + 1;

            uri = uri.concat(getSC());

            pos++;
        }

        token = tokens[startPos];
        return new Node(NodeType.UriType, uri, token.ln, token.col);
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
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
     * @returns {Number} Length of the value
     */
    function checkValue(i) {
        var start = i,
            l, s, _i;

        while (i < tokensLength) {
            if (checkDeclDelim(i)) break;

            if (l = checkBlock(i)) {
                i += l;
                break;
            }

            s = checkS(i);
            _i = i + s;

            if (l = _checkValue(_i)) i += l + s;
            if (!l || checkBlock(i - l)) break;
        }

        return i - start;
    }

    /**
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function _checkValue(i) {
        return checkVhash(i) ||
            checkOperator(i) ||
            checkImportant(i) ||
            checkDefault(i) ||
            checkAny(i) ||
            checkInterpolation(i);
    }

    /**
     * @returns {Array}
     */
    function getValue() {
        var startPos = pos,
            x = [],
            t, _pos, s;

        while (pos < tokensLength) {
            s = checkS(pos);
            _pos = pos + s;

            if (checkDeclDelim(_pos)) break;

            if (checkBlock(pos)) {
                x.push(getBlock());
                break;
            }

            if (!_checkValue(_pos)) break;

            if (s) x.push(getS());
            x.push(_getValue());

            if (checkBlock(_pos)) break;
        }

        var token = tokens[startPos];
        return new Node(NodeType.ValueType, x, token.ln, token.col);
    }

    /**
     * @returns {Array}
     */
    function _getValue() {
        if (checkVhash(pos)) return getVhash();
        if (checkOperator(pos)) return getOperator();
        if (checkImportant(pos)) return getImportant();
        if (checkDefault(pos)) return getDefault();
        if (checkAny(pos)) return getAny();
        if (checkInterpolation(pos)) return getInterpolation();
    }

    /**
     * Check if token is part of a variable
     * @param {Number} i Token's index number
     * @returns {Number} Length of the variable
     */
    function checkVariable(i) {
        var l;

        if (i >= tokensLength || tokens[i].type !== TokenType.DollarSign) return 0;

        return (l = checkIdent(i + 1)) ? l + 1 : 0;
    }

    /**
     * Get node with a variable
     * @returns {Array} `['variable', ['ident', x]]` where `x` is
     *      a variable name.
     */
    function getVariable() {
        var startPos = pos,
            x = [];

        pos++;

        x.push(getIdent());

        var token = tokens[startPos];
        return new Node(NodeType.VariableType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a variables list (e.g. `$values...`).
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkVariablesList(i) {
        var d = 0, // number of dots
            l;

        if (i >= tokensLength) return 0;

        if (l = checkVariable(i)) i+= l;
        else return 0;

        while (i < tokensLength && tokens[i].type === TokenType.FullStop) {
            d++;
            i++;
        }

        return d === 3 ? l + d : 0;
    }

    /**
     * Get node with a variables list
     * @returns {Array} `['variableslist', ['variable', ['ident', x]]]` where
     *      `x` is a variable name.
     */
    function getVariablesList() {
        var startPos = pos,
            x = [getVariable()];

        pos += 3;

        var token = tokens[startPos];
        return new Node(NodeType.VariablesListType, x, token.ln, token.col);
    }

    /**
     * Check if token is part of a hexadecimal number (e.g. `#fff`) inside
     *      some value
     * @param {Number} i Token's index number
     * @returns {Number}
     */
    function checkVhash(i) {
        var l;

        if (i >= tokensLength || tokens[i].type !== TokenType.NumberSign) return 0;

        return (l = checkNmName2(i + 1)) ? l + 1 : 0;
    }

    /**
     * Get node with a hexadecimal number (e.g. `#fff`) inside some value
     * @returns {Array} `['vhash', x]` where `x` is a hexadecimal number
     *      converted to string (without `#`, e.g. `'fff'`).
     */
    function getVhash() {
        var startPos = pos,
            x;

        pos++;

        x = getNmName2();

        var token = tokens[startPos];
        return new Node(NodeType.VhashType, x, token.ln, token.col);
    }

    return function(_tokens, rule, _needInfo) {
        tokens = _tokens;
        needInfo = _needInfo;
        tokensLength = tokens.length;
        pos = 0;

        return rules[rule]();
   };
})();
