module.exports = function stringify(tree) {
    // TODO: Better error message
    if (!tree) throw new Error('We need tree to translate');

    function _t(tree) {
        var type = tree.type;
        if (_unique[type]) return _unique[type](tree);
        if (typeof tree.content === 'string') return tree.content;
        if (Array.isArray(tree.content)) return _composite(tree.content);
        return '';
    }

    function _composite(t, i) {
        if (!t) return '';

        var s = '';
        i = i || 0;
        for (; i < t.length; i++) s += _t(t[i]);
        return s;
    }

    var _unique = {
        'arguments': function(t) {
            return '(' + _composite(t.content) + ')';
        },
        'atkeyword': function(t) {
            return '@' + _composite(t.content);
        },
        'atruler': function(t) {
            return _t(t.content[0]) + _t(t.content[1]) + '{' + _t(t.content[2]) + '}';
        },
        'attribute': function(t) {
            return '[' + _composite(t.content) + ']';
        },
        'block': function(t) {
            return '{' + _composite(t.content) + '}';
        },
        'braces': function(t) {
            return t.content[0] + _composite(t.content.slice(2)) + t.content[1];
        },
        'class': function(t) {
            return '.' + _composite(t.content);
        },
        'color': function(t) {
            return '#' + t.content;
        },
        'default': function(t) {
            return '!' + _composite(t.content) + 'default';
        },
        'filter': function(t) {
            return _t(t.content[0]) + ':' + _t(t.content[1]);
        },
        'functionExpression': function(t) {
            return 'expression(' + t.content + ')';
        },
        'id': function (t) {
            return '#' + t.content;
        },
        'important': function(t) {
            return '!' + _composite(t.content) + 'important';
        },
        'interpolation': function(t) {
            return '#{' + _composite(t.content) + '}';
        },
        'multilineComment': function (t) {
            return '/*' + t.content + '*/';
        },
        'nthSelector': function(t) {
            return ':' + _t(t.content[0]) + '(' + _composite(t.content.slice(1)) + ')';
        },
        'percentage': function(t) {
            return _composite(t.content) + '%';
        },
        'placeholder': function(t) {
            return '%' + _composite(t.content);
        },
        'pseudoClass': function(t) {
            return ':' + _composite(t.content);
        },
        'pseudoElement': function(t) {
            return '::' + _composite(t.content);
        },
        'singlelineComment': function (t) {
            return '/' + '/' + t.content;
        },
        'uri': function(t) {
            return 'url(' + _composite(t.content) + ')';
        },
        'variable': function(t) {
            return '$' + _composite(t.content);
        },
        'variablesList': function(t) {
            return _composite(t.content) + '...';
        }
    };

    return _t(tree);
}
