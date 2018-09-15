var Comb = require('../lib/core');
var assert = require('assert');
var minimatch = require('minimatch');

describe('_.shouldProcess()', function() {
    it('No options', function() {
        var comb = new Comb();
        assert.throws(function() {
            comb._.shouldProcess();
        });
    });

    it('Empty list of excludes', function() {
        var comb = new Comb();
        comb._.exclude = [];
        var should = comb._.shouldProcess('/Users/tg/nani');
        assert.equal(true, should);
    });

    it('Not excluded', function() {
        var comb = new Comb();
        comb._.exclude = [minimatch.Minimatch('/tmp/*')];
        var should = comb._.shouldProcess('/Users/tg/nani');
        assert.equal(true, should);
    });

    it('Not excluded, 2', function() {
        var comb = new Comb();
        comb._.exclude = [minimatch.Minimatch('/tmp/*')];
        var should = comb._.shouldProcess('/tmp/foo/nani');
        assert.equal(true, should);
    });

    it('Excluded', function() {
        var comb = new Comb();
        comb._.exclude = [minimatch.Minimatch('/tmp/*')];
        var should = comb._.shouldProcess('/tmp/nani');
        assert.equal(false, should);
    });

    it('Excluded, 2', function() {
        var comb = new Comb();
        comb._.exclude = [minimatch.Minimatch('/tmp/**/*')];
        var should = comb._.shouldProcess('/tmp/foo/nani');
        assert.equal(false, should);
    });

    it('Excluded, 3, with slash at the end', function() {
        var comb = new Comb();
        comb._.exclude = [minimatch.Minimatch('/tmp/nani')];
        var should = comb._.shouldProcess('/tmp/nani/');
        assert.equal(false, should);
    });
});
