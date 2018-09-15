// Depends on: _.setValue()

var Comb = require('../lib/core');
var assert = require('assert');

describe('_.addHandler()', function() {
    it('Option has `setValue` method', function() {
        var comb = new Comb();
        comb._.handlers = [];
        comb._.configuredOptions = {};
        var option = {
            name: 'nani',
            setValue: function(value) { return value.toUpperCase(); }
        };
        comb._.addHandler(option, 'foo');
        assert.deepEqual([option], comb._.handlers);
        assert.equal('FOO', comb._.configuredOptions.nani);
    });

    it('Option has no `setValue` method', function() {
        var comb = new Comb();
        comb._.handlers = [];
        comb._.configuredOptions = {};
        var option = {
            accepts: {string: /^foo$/},
            name: 'nani'
        };
        comb._.addHandler(option, 'foo');
        assert.deepEqual([option], comb._.handlers);
        assert.equal('foo', comb._.configuredOptions.nani);
    });
});
