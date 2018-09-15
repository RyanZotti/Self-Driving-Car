# String Natural Compare

Compare alphanumeric strings the same way a human would, using a natural order algorithm

[![NPM Version](https://img.shields.io/npm/v/string-natural-compare.svg)](https://www.npmjs.com/package/string-natural-compare)
[![Build Status](https://travis-ci.org/nwoltman/string-natural-compare.svg?branch=master)](https://travis-ci.org/nwoltman/string-natural-compare)
[![Coverage Status](https://coveralls.io/repos/nwoltman/string-natural-compare/badge.svg?branch=master)](https://coveralls.io/r/nwoltman/string-natural-compare?branch=master)
[![devDependencies Status](https://david-dm.org/nwoltman/string-natural-compare/dev-status.svg)](https://david-dm.org/nwoltman/string-natural-compare?type=dev)

```
Standard sorting:   Natural order sorting:
    img1.png            img1.png
    img10.png           img2.png
    img12.png           img10.png
    img2.png            img12.png
```

This module provides two functions:

+ `naturalCompare`
+ `naturalCompare.caseInsensitive` (alias: `naturalCompare.i`)

These functions return a number indicating whether one string should come before, after, or is the same as another string.
They can be easily used with the native [`.sort()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) array method.

### Fast and Robust

This module uses a performant and robust algorithm to compare alphanumeric strings. It can compare strings containing any size of number and is heavily tested with a custom [benchmark suite](https://github.com/nwoltman/string-natural-compare/tree/master/benchmark) to make sure that it is as fast as possible, even when a [custom alphabet](#custom-alphabet) has been configured.


## Installation

```sh
npm install string-natural-compare --save
```


## Usage

```js
var naturalCompare = require('string-natural-compare');

// Simple case-sensitive sorting
var a = ['z1.doc', 'z10.doc', 'z17.doc', 'z2.doc', 'z23.doc', 'z3.doc'];
a.sort(naturalCompare);
// -> ['z1.doc', 'z2.doc', 'z3.doc', 'z10.doc', 'z17.doc', 'z23.doc']


// Simple case-insensitive sorting
var a = ['B', 'C', 'a', 'd'];
a.sort(naturalCompare.caseInsensitive); // alias: a.sort(naturalCompare.i);
// -> ['a', 'B', 'C', 'd']

// Note:
['a', 'A'].sort(naturalCompare.caseInsensitive); // -> ['a', 'A']
['A', 'a'].sort(naturalCompare.caseInsensitive); // -> ['A', 'a']


// Compare strings containing large numbers
naturalCompare(
  '1165874568735487968325787328996865',
  '265812277985321589735871687040841'
);
// -> 1 (a number > 0)


// In most cases we want to sort an array of objects
var a = [
  {street: '350 5th Ave', room: 'A-1021'},
  {street: '350 5th Ave', room: 'A-21046-b'}
];

// Sort by street (case-insensitive), then by room (case-sensitive)
a.sort(function(a, b) {
  return (
    naturalCompare.caseInsensitive(a.street, b.street) ||
    naturalCompare(a.room, b.room)
  );
});


// When text transformation is needed or when doing a case-insensitive sort on a
// large array, it is best for performance to pre-compute the transformed text
// and store it in that object. This way, the text transformation will not be
// needed for every comparison when sorting.
var a = [
  {make: 'Audi', model: 'R8'},
  {make: 'Porsche', model: '911 Turbo S'}
];

// Sort by make, then by model (both case-insensitive)
a.forEach(function(car) {
  car.sortKey = (car.make + ' ' + car.model).toLowerCase();
});
a.sort(function(a, b) {
  return naturalCompare(a.sortKey, b.sortKey);
});
```

### Custom Alphabet

It is possible to configure a custom alphabet to achieve a desired character ordering.

```js
// Estonian alphabet
naturalCompare.alphabet = 'ABDEFGHIJKLMNOPRSŠZŽTUVÕÄÖÜXYabdefghijklmnoprsšzžtuvõäöüxy';
['t', 'z', 'x', 'õ'].sort(naturalCompare);
// -> ['z', 't', 'õ', 'x']

// Russian alphabet
naturalCompare.alphabet = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя';
['Ё', 'А', 'б', 'Б'].sort(naturalCompare);
// -> ['А', 'Б', 'Ё', 'б']
```

**Note:** Putting numbers in the custom alphabet can cause undefined behaviour.
