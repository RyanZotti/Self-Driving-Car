# gulp-npm-dist

Gulp plugin for listing package.json dependencies and copy dist files of them to specific folder

## Get started

### Install

```
npm install gulp-npm-dist --save-dev
```

### Usage

```javascript
//package.json example
{
  "name": "app",
  "version": "1.0.0",
  "dependencies": {
    "bootstrap": "^3.3.7",
    "bootstrap-3-typeahead": "^4.0.2",
    "bootstrap-select": "^1.12.1",
    "jquery": "^3.1.1",
    "jquery-lazyload": "^1.9.7",
    "shufflejs": "^4.0.2"
  },
  "devDependencies": {
    "gulp": "^3.9.1",
    "gulp-rename": "^1.2.2",
    "gulp-less": "^3.1.0",
    "gulp-npm-dist": "^0.1.2",
    "pump": "^1.0.1"
  }
}
```

```javascript
var gulp = require('gulp');
var npmDist = require('gulp-npm-dist');

// Copy dependencies to ./public/libs/
gulp.task('copy:libs', function() {
  gulp.src(npmDist(), {base:'./node_modules'})
    .pipe(gulp.dest('./public/libs'));
});
```

Usage with gulp-rename
```javascript
var gulp = require('gulp');
var npmDist = require('gulp-npm-dist');
var rename = require('gulp-rename');

gulp.task('copy:libs', function() {
    gulp.src(npmDist(), {base:'./node_modules/'})
        .pipe(rename(function(path) {
            path.dirname = path.dirname.replace(/\/dist/, '').replace(/\\dist/, '');
        }))
        .pipe(gulp.dest('./public/libs'));
});
```
will create this structure:

![gulp-npm-dist build structure](https://monosnap.com/file/3b6wW9hymbcToHB0Uko1NLPBNgYRQh.png)


### Options

#### `copyUnminified`
Type: `boolean`

Default: `false`


#### `excludes`
Type: `array`

Default: 
```
[
  '*.map',
  'src/**/*',
  'examples/**/*',
  'example/**/*',
  'demo/**/*',
  'spec/**/*',
  'docs/**/*',
  'tests/**/*',
  'test/**/*',
  'Gruntfile.js',
  'gulpfile.js',
  'package.json',
  'package-lock.json',
  'bower.json',
  'composer.json',
  'yarn.lock',
  'webpack.config.js',
  'README',
  'LICENSE',
  'CHANGELOG',
  '*.yml',
  '*.md',
  '*.coffee',
  '*.ts',
  '*.scss',
  '*.less'
]
```

#### `replaceDefaultExcludes`
Type: `boolean`

Default: `false` (append your excludes to the default set)


#### Usage with options

```javascript
gulp.task('copy:libs', function () {
    gulp.src(npmDist({ 
        copyUnminified: true, 
        excludes: ['/**/*.txt'] 
    }), { base: './node_modules' })
        .pipe(gulp.dest('./public/libs'));
});
```
