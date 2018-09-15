// Depends on: _.lintTree()

var Comb = require('../lib/core');
var assert = require('assert');

describe('lintString()', function() {
    it('Should lint', function() {
        var comb = new Comb();
        var string = 'a{color:red}';
        var error = {line:1, column: 7, message: 'foo'};
        comb._.handlers = [{
            syntax: ['css'],
            lint: function(node) {
                if (node.content === 'red') return error;
            }
        }];
        assert.deepEqual([error], comb.lintString(string));
    });
});
