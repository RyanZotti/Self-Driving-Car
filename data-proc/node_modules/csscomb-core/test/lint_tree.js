// Depends on: getSyntax(), gonzales

var Comb = require('../lib/core');
var assert = require('assert');
var gonzales = require('gonzales-pe');

describe('lintTree()', function() {
    it('Skip handlers that do not support given syntax', function() {
        var comb = new Comb();
        var ast = {};
        comb.syntax = 'less';
        comb._.handlers = [{
            syntax: ['css']
        }];
        assert.deepEqual([], comb._.lintTree(ast));
    });

    it('Skip handlers that have no `lint` method', function() {
        var comb = new Comb();
        var ast = {};
        comb.syntax = 'css';
        comb._.handlers = [{
            syntax: ['css']
        }];
        assert.deepEqual([], comb._.lintTree(ast));
    });

    it('Should lint, one error', function() {
        var comb = new Comb();
        var ast = originalAST = gonzales.parse('a{color:red}');
        var error = {line:1, column: 7, message: 'foo'};
        comb.syntax = 'css';
        comb._.handlers = [{
            syntax: ['css'],
            lint: function(node) {
                if (node.content === 'red') return error;
            }
        }];
        assert.deepEqual([error], comb._.lintTree(ast));
        // Should not modify ast:
        assert.deepEqual(originalAST, ast);
    });

    it('Should lint, multiple errors', function() {
        var comb = new Comb();
        var ast = originalAST = gonzales.parse('a{color:red}');
        var error = {line:1, column: 7, message: 'foo'};
        comb.syntax = 'css';
        comb._.handlers = [{
            syntax: ['css'],
            lint: function(node) {
                if (node.content === 'red') return [error, error];
            }
        }];
        assert.deepEqual([error, error], comb._.lintTree(ast));
        // Should not modify ast:
        assert.deepEqual(originalAST, ast);
    });
});
