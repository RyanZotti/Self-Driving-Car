/**
 * @param {string} type
 * @param {array|string} content
 * @param {number} line
 * @param {number} column
 * @constructor
 */
function Node(type, content, line, column) {
    this.type = type;
    this.content = content;
    this.start = {
        line: line,
        column: column
    };
}

Node.prototype = {
    type: null,

    content: null,

    start: null,

    /**
     * @param {String} type Node type
     * @return {Boolean} Whether there is a child node of given type
     */
    contains: function(type) {
        return this.content.some(function(node) {
            return node.type === type;
        });
    },

    /**
     * @param {String} type
     * @return {Node} First child node
     */
    first: function(type) {
        if (!type || !Array.isArray(this.content)) return this.content[0];

        var i = 0;
        var l = this.content.length;

        for (; i < l; i++) {
            if (this.content[i].type === type) return this.content[i];
        }
    },

    /**
     * @param {String} type Node type
     * @param {Function} callback Function to call for every found node
     */
    forEach: function(type, callback) {
        if (!Array.isArray(this.content)) return;

        if (typeof type !== 'string') callback = type, type = null;

        var i = 0;
        var l = this.content.length;

        for (; i < l; i++) {
            if (!type || this.content[i] && this.content[i].type === type)
                callback(this.content[i], i);
        }
    },

    /**
     * @param {Number} index
     * @return {Node}
     */
    get: function(index) {
        return Array.isArray(this.content) && this.content[index];
    },

    /**
     * @param {Number} index
     * @param {Node} node
     */
    insert: function(index, node) {
        Array.isArray(this.content) && this.content.splice(index, 0, node);
    },

    /**
     * @param {String} type
     * @return {Boolean} Whether the node is of given type
     */
    is: function(type) {
        return this.type === type;
    },

    /**
     * @param {String} type
     * @return {Node} Last child node
     */
    last: function(type) {
        var i = this.content.length - 1;

        if (!type || !Array.isArray(this.content))
            return this.content[i];


        for (;;i--) {
            if (this.content[i].type === type) return this.content[i];
        }
    },

    /**
     * @param {Function} callback
     */
    map: function(callback) {
        callback(this);

        if (!Array.isArray(this.content)) return;

        this.content.forEach(function(node) {
            if (node instanceof Node)
                node.map(callback);
        });
    },

    /**
     * @param {Number} index
     */
    remove: function(index) {
        Array.isArray(this.content) && this.content.splice(index, 1);
    },

    get length() {
        return this.content.length;
    },

    toString: function() {
        return JSON.stringify(this, false, 2);
    },

    //TODO(tonyganch): Save syntax name while creating a node.
    toCSS: function(syntax) {
        if (!syntax) return console.error('Empty syntax name.');

        try {
            stringify = require('./' + syntax + '/stringify');
        } catch (e) {
            var message = 'Syntax "' + syntax + '" is not supported yet, sorry';
            return console.error(message);
        }

        return stringify(this);
    }
};

module.exports = Node;
