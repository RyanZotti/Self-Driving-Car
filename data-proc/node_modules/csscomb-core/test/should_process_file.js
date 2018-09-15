var Comb = require('../lib/core');
var assert = require('assert');

describe('_.shouldProcessFile()', function() {
    it('No options', function() {
        var comb = new Comb();
        assert.throws(function() {
            comb._.shouldProcessFile();
        });
    });

    it('Supported syntax', function() {
        var comb = new Comb();
        comb._.supportedSyntaxes = ['css'];
        comb._.exclude = [];
        var should = comb._.shouldProcessFile('nani.css');
        assert.equal(true, should);
    });

    it('Not supported syntax', function() {
        var comb = new Comb();
        comb._.supportedSyntaxes = ['css'];
        comb._.exclude = [];
        var should = comb._.shouldProcessFile('nani.js');
        assert.equal(false, should);
    });
});
