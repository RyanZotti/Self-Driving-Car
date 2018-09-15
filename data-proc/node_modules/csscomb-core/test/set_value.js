var Comb = require('../lib/core');
var assert = require('assert');

describe('_.setValue()', function() {
    it('No options', function() {
        var comb = new Comb();
        assert.throws(function() {
            comb._.setValue();
        });
    });

    it('Empty options', function() {
        var comb = new Comb();
        assert.throws(function() {
            comb._.setValue({});
        });
    });

    it('Value of unacceptable type', function() {
        var comb = new Comb();
        assert.throws(function() {
            comb._.setValue({boolean: [true]}, 'nani');
        });
    });

    it('Not-Ok boolean', function() {
        var comb = new Comb();
        assert.throws(function() {
            comb._.setValue({boolean: [true]}, false);
        });
    });

    it('Ok boolean', function() {
        var comb = new Comb();
        var value = comb._.setValue({boolean: [true]}, true);
        assert.equal(true, value);
    });

    it('Not-Ok number', function() {
        var comb = new Comb();
        assert.throws(function() {
            comb._.setValue({number: true}, 3.6);
        });
    });

    it('Ok number', function() {
        var comb = new Comb();
        var value = comb._.setValue({number: true}, 3);
        assert.equal('   ', value);
    });

    it('Not-Ok string', function() {
        var comb = new Comb();
        assert.throws(function() {
            comb._.setValue({string: /^nani$/}, 'foo');
        });
    });

    it('Ok string', function() {
        var comb = new Comb();
        var value = comb._.setValue({string: /^nani$/}, 'nani');
        assert.equal('nani', value);
    });

    it('setValue method not implemented', function() {
        var comb = new Comb();
        assert.throws(function() {
            comb._.setValue({object: true}, {});
        });
    });

});

