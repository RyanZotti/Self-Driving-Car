var Comb = require('../lib/core');
var assert = require('assert');

describe('_.getSyntax()', function() {
    it('Ok', function() {
        var comb = new Comb();
        comb.syntax = 'css';
        assert.equal('css', comb.getSyntax());
    });
});
