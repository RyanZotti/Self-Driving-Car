gulp-wait
=========

A gulp task that inserts a delay before calling the next function in a chain.

## Example

The following example will watch for changes to templates and delay the livereload server refresh until after the nodemon script is expected to have restarted.

```javascript
// Gulpfile.js
var gulp = require('gulp')
  , r = require('tiny-lr')
  , refresh = require('gulp-livereload')
  , nodemon = require('gulp-nodemon')
  , wait = require('../gulp-wait')
  , server = lr();

gulp.task('dev', function () {

  gulp.src('./index.js')
    .pipe(nodemon());

  server.listen(35729, function (err) {

  	if (err) return console.log(err);

  	gulp.watch('./app/views/**/*.html', function (e) {
      gulp.src(e.path)
        .pipe(wait(1500))
        .pipe(refresh(server));
    });

  });

})

```

Yes, ideally there would be an event from nodemon to trigger the livereload.