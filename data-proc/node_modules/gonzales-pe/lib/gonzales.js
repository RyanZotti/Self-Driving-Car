var Node = require('./node');
var parse = require('./parse');

module.exports = {
    createNode: function(options) {
        return new Node(options.type, options.content);
    },
    parse: parse
}
