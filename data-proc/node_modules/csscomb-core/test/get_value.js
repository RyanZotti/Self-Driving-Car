var Comb = require('../lib/core');
var assert = require('assert');

describe('_.getSyntax()', function() {
    it('Ok', function() {
        var comb = new Comb();
        comb._.configuredOptions = {nani: 'foo'};
        assert.equal('foo', comb.getValue('nani'));
    });
});

