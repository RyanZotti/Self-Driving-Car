#!/usr/bin/env node

/**
 * ./bin/gonzales.js filename
 * ./bin/gonzales.js filename -s
 */
var gonzales = require('..'),
    fs = require('fs'),
    path = require('path'),
    filename = process.argv[2],
    silent = process.argv[3] === '-s';

if (!filename) {
  console.log('Please supply a filename. Usage "gonzales file"');
  process.exit();
}

var syntax = path.extname(filename).substring(1);
var css = fs.readFileSync(filename, 'utf-8');

try {
    var ast = gonzales.parse(css, {syntax: syntax});
    if (!silent) console.log(ast.toString());
} catch (e) {
    if (!silent) throw e;
}
