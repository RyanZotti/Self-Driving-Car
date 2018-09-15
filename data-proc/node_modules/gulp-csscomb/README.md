# [gulp](http://gulpjs.com)-csscomb &nbsp; [![Build Status](http://img.shields.io/travis/koistya/gulp-csscomb/master.svg?style=flat)](http://travis-ci.org/koistya/gulp-csscomb) [![Dependency Status](https://david-dm.org/koistya/gulp-csscomb.svg?style=flat)](https://david-dm.org/koistya/gulp-csscomb) [![Tips](http://img.shields.io/gratipay/koistya.svg?style=flat)](https://gratipay.com/koistya)

[<img src="https://rawgit.com/koistya/gulp-csscomb/master/csscomb.jpg" width="80" height="80" align="right">](http://csscomb.com)

> Format CSS coding style with [CSScomb](http://csscomb.com).

*If you have any difficulties with the output of this plugin, please use the
[CSScomb tracker](https://github.com/csscomb/csscomb.js/issues).*

---

<p align="center"><b>🔥 Want to strengthen your core JavaScript skills and master ES6?</b><br>I would personally recommend this awesome <a href="https://es6.io/friend/konstantin">ES6 course</a> by Wes Bos.</p>

---


## Installation

```sh
npm install gulp-csscomb --save-dev
```

## Example 1

```js
var gulp = require('gulp');
var csscomb = require('gulp-csscomb');

gulp.task('styles', function() {
  return gulp.src('src/styles/main.css')
    .pipe(csscomb())
    .pipe(gulp.dest('./build/css'));
});
```

## Example 2

```js
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

gulp.task('styles', function() {
  return gulp.src('src/styles/bootstrap.less')
    .pipe($.less({strictMath: true}))
    .pipe($.autoprefixer([
      'Android 2.3',
      'Android >= 4',
      'Chrome >= 20',
      'Firefox >= 24', // Firefox 24 is the latest ESR
      'Explorer >= 8',
      'iOS >= 6',
      'Opera >= 12',
      'Safari >= 6']))
    .pipe($.csscomb())
    .pipe(gulp.dest('./build/css'));
});
```

If there is `.csscomb.json` file present in the same folder as the source file(s),
or in the project root folder, `gulp-csscomb` will read config settings from it
instead of default config.

You can also specify a pre-defined configuration. Ex.: `csscomb('zen')`

## License

The MIT License (MIT) © Konstantin Tarkus ([@koistya](https://twitter.com/koistya))
