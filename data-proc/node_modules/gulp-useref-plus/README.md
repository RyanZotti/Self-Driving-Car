# gulp-useref-plus

## Install

Install with [npm](https://npmjs.org/package/gulp-useref-plus)

```
npm install --save-dev gulp-useref-plus
```


## Usage

The following example will parse the build blocks in the HTML, replace them and pass those files through. Assets inside the build blocks will be concatenated and passed through in a stream as well.

```js
var gulp = require('gulp'),
    useref = require('gulp-useref-plus');

gulp.task('default', function () {
    return gulp.src('app/*.html')
        .pipe(useref())
        .pipe(gulp.dest('dist'));
});
```

With options:

```js
var gulp = require('gulp'),
    useref = require('gulp-useref-plus');

gulp.task('default', function () {
    return gulp.src('app/*.html')
        .pipe(useref({ searchPath: '.tmp' }))
        .pipe(gulp.dest('dist'));
});
```

If you want to minify your assets or perform some other modification, you can use [gulp-if](https://github.com/robrich/gulp-if) to conditionally handle specific types of assets.

```js
var gulp = require('gulp'),
    useref = require('gulp-useref-plus'),
    gulpif = require('gulp-if'),
    uglify = require('gulp-uglify'),
    minifyCss = require('gulp-minify-css');

gulp.task('html', function () {
    return gulp.src('app/*.html')
        .pipe(useref())
        .pipe(gulpif('*.js', uglify()))
        .pipe(gulpif('*.css', minifyCss()))
        .pipe(gulp.dest('dist'));
});
```

Blocks are expressed as:

```html
<!-- build:<type>(alternate search path) <path> <parameters> -->
... HTML Markup, list of script / link tags.
<!-- endbuild -->
```

- **type**: either `js`, `css` or `remove`; `remove` will remove the build block entirely without generating a file
- **alternate search path**: (optional) By default the input files are relative to the treated file. Alternate search path allows one to change that
- **path**: the file path of the optimized file, the target output
- **parameters**: extra parameters that should be added to the tag

An example of this in completed form can be seen below:

```html
<html>
<head>
    <!-- build:css css/combined.css -->
    <link href="css/one.css" rel="stylesheet">
    <link href="css/two.css" rel="stylesheet">
    <!-- endbuild -->
</head>
<body>
    <!-- build:js scripts/combined.js -->
    <script type="text/javascript" src="scripts/one.js"></script>
    <script type="text/javascript" src="scripts/two.js"></script>
    <!-- endbuild -->
</body>
</html>
```

The resulting HTML would be:

```html
<html>
<head>
    <link rel="stylesheet" href="css/combined.css"/>
</head>
<body>
    <script src="scripts/combined.js"></script>
</body>
</html>
```

See [useref](https://github.com/jonkemp/useref) for more information.

## API

### useref(options [, transformStream1 [, transformStream2 [, ... ]]])

Returns a stream with the asset replaced resulting HTML files as well as the concatenated asset files from the build blocks inside the HTML. Supports all options from [useref](https://github.com/jonkemp/useref).

### Transform Streams

Type: `Stream`  
Default: `none`

Transform assets before concat. For example, to integrate source maps:

```js
var gulp = require('gulp'),
    sourcemaps = require('gulp-sourcemaps'),
    useref = require('gulp-useref-plus'),
    lazypipe = require('lazypipe');

gulp.task('default', function () {
    return gulp.src('index.html')
        .pipe(useref({}, lazypipe().pipe(sourcemaps.init, { loadMaps: true })()))
        .pipe(sourcemaps.write('maps'))
        .pipe(gulp.dest('dist'));
});
```

### Options

#### options.searchPath

Type: `String` or `Array`  
Default: `none`  

Specify the location to search for asset files, relative to the current working directory. Can be a string or array of strings.

#### options.base

Type: `String`  
Default: `process.cwd()`  

Specify the output folder relative to the cwd.

#### options.noAssets

Type: `Boolean`  
Default: `false`  

Skip assets and only process the HTML files.

#### options.noconcat

Type: `Boolean`  
Default: `false`  

Skip concatenation and add all assets to the stream instead.

#### options.additionalStreams

Type: `Array<Stream>`  
Default: `none`

Use additional streams as sources of assets. Useful for combining gulp-useref-plus with preprocessing tools. For example, to use with TypeScript:

```javascript
var ts = require('gulp-typescript');

// create stream of virtual files
var tsStream = gulp.src('src/**/*.ts')
        .pipe(ts());

gulp.task('default', function () {
    // use gulp-useref-plus normally
    return gulp.src('src/index.html')
        .pipe(useref({ additionalStreams: [tsStream] }))
        .pipe(gulp.dest('dist'));
});
```

#### options.transformPath

Type: `Function`  
Default: `none`

Add a transformPath function in case the path needs to be modified before search happens.

```js
var gulp = require('gulp'),
    useref = require('gulp-useref-plus');

gulp.task('default', function () {
    return gulp.src('app/*.html')
        .pipe(useref({
            transformPath: function(filePath) {
                return filePath.replace('/rootpath','')
            }
        }))
        .pipe(gulp.dest('dist'));
});
```

## Notes

* [ClosureCompiler.js](https://github.com/dcodeIO/ClosureCompiler.js) doesn't support Buffers, which means if you want to use [gulp-closure-compiler](https://github.com/sindresorhus/gulp-closure-compiler) you'll have to first write out the `combined.js` to disk. See [this](https://github.com/dcodeIO/ClosureCompiler.js/issues/11) for more information.
