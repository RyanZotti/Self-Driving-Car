#!/usr/bin/env node

/**
 * Generate `.json` test files.
 * Usage: `./bin/generate-tests.js <syntax name> [<syntax name>]`.
 * Example: `./bin/generate-tests.js scss less`.
 */

var gonzales = require('..'),
    fs = require('fs'),
    path = require('path'),
    syntaxList = process.argv.slice(2);

syntaxList.forEach(function (s) {
    var syntaxDir = 'test/' + s;
    var extension = '.' + s;

    fs.readdirSync(syntaxDir).forEach(function(testDir) {
        fs.readdirSync(path.join(syntaxDir, testDir)).forEach(function(file) {
            if (path.extname(file) !== extension) return;

            try {
                generateTest(path.join(syntaxDir, testDir, file));
            } catch (e) {
                console.log('*', path.join(syntaxDir, testDir, file));
            }
        });
    });
});

function generateTest(filePath) {
    var testDir = path.dirname(filePath);
    var rule = path.basename(testDir);
    var syntax = path.basename(path.dirname(testDir));
    var fileName = path.basename(filePath, '.' + syntax);

    var inputPath = path.join(testDir, fileName + '.' + syntax);
    var outputPath = path.join(testDir, fileName + '.json');

    var string = fs.readFileSync(inputPath, 'utf-8').trim();
    var ast = gonzales.parse(string, {syntax: syntax, rule: rule});

    fs.writeFileSync(outputPath, ast.toString());
}

