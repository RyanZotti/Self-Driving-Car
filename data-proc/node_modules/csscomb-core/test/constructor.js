var Comb = require('../lib/core');
var assert = require('assert');

describe('constructor', function() {
    it('Passing no options to constructor', function() {
        var comb = new Comb();
        assert.equal(null, comb._.handlers);
        assert.deepEqual([], comb._.optionsOrder);
    });

    it('Passing an empty array of options to constructor', function() {
        var comb = new Comb([]);
        assert.equal(null, comb._.handlers);
        assert.deepEqual([], comb._.optionsOrder);
    });

    it('Passing no options to constructor', function() {
        var comb = new Comb();
        assert.equal(null, comb._.handlers);
    });

});
