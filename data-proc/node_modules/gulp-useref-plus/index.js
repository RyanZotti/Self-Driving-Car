'use strict';
var gutil = require('gulp-util'),
    through = require('through2'),
    useref = require('useref'),
    crypto = require('crypto');

module.exports = function (options) {
    var opts = options || {},
        path = require('path'),
        concat = require('gulp-concat'),
        gulpif = require('gulp-if'),
        es = require('event-stream'),
        types = opts.types || [ 'css', 'js', 'combjs', 'combcss' ],
        glob = require('glob'),
        isRelativeUrl = require('is-relative-url'),
        vfs = require('vinyl-fs'),
        transforms = Array.prototype.slice.call(arguments, 1),
        unprocessed = 0,
        end = false,
        additionalFiles = [],
        waitForAssets;

    opts.combjs = function(block, target, attbs) {
      var ref = '';
      var result;
      var name = [];

      var regscript = /<script(?:\s+?|.+?\s+?)src\s*?=\s*?"(.+?)".*?>/gmi;

      while ((result = regscript.exec(block)) !== null) {
        name.push(result[1]);
      }

      if (name.length) {
        name = name.sort();
        if (opts.debug) {
          ref = '\n<!-- files:\n' + name.join('\n') + '\n-->\n';
        }
        var newfilename = (opts.filenamePrefix ? opts.filenamePrefix : '') + getShortString(name.join(',')) + '.js';
        if (attbs) {
          ref += '<script src="' + target + (/\/$/.test(target) ? '' : '/') + newfilename + '" ' + attbs + '></script>';
        } else {
          ref += '<script src="' + target + (/\/$/.test(target) ? '' : '/') + newfilename + '"></script>';
        }
      }

      return ref;
    };

    opts.combcss = function(block, target, attbs) {
      var ref = '';
      var result;
      var name = [];

      var regcss = /<link(?:\s+?|.+?\s+?)href\s*?=\s*?"(.+?)".*?>/gmi;

      while ((result = regcss.exec(block)) !== null) {
        name.push(result[1]);
      }

      // Check to see if there are any css references at all.
      if (name.length) {
        name = name.sort();
        if (opts.debug) {
          ref = '\n<!-- files:\n' + name.join('\n') + '\n-->\n';
        }
        var newfilename = (opts.filenamePrefix ? opts.filenamePrefix : '') + getShortString(name.join(',')) + '.css';
        if (attbs) {
          ref += '<link rel="stylesheet" href="' + target + (/\/$/.test(target) ? '' : '/') + newfilename + '" ' + attbs + '>';
        } else {
          ref += '<link rel="stylesheet" href="' + target + (/\/$/.test(target) ? '' : '/') + newfilename + '">';
        }
      }

      return ref;
  };


    var getShortString = function(input) {
        var base32 = [
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',
            'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p',
            'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
            'y', 'z', '0', '1', '2', '3', '4', '5'
        ];

        var subHex, int, out, val;

        var hex = crypto.createHash('md5').update(input).digest('hex');
        var hexLen = hex.length;
        var subHexLen = hexLen / 8;
        var output = [];

        for (var i = 0; i < subHexLen; ++i) {
            subHex = hex.substr(i * 8, 8);
            int = 0x3FFFFFFF & (1 * ('0x' + subHex));
            out = '';

            for (var j = 0; j < 8; ++j) {
                val = 0x0000001F & int;
                out += base32[val];
                int = int >> 5;
            }

            output.push(out);
        }

        return output[0];
    };

    // If any external streams were included, add matched files to src
    if (opts.additionalStreams) {
        if (!Array.isArray(opts.additionalStreams)) {
            opts.additionalStreams = [ opts.additionalStreams ];
        }

        opts.additionalStreams = opts.additionalStreams.map(function (stream) {
            // filters stream to select needed files
            return stream
                .pipe(es.through(function (file) {
                    additionalFiles.push(file);
                }));
        });
    }

    if (opts.additionalStreams) {
        // If we have additional streams, wait for them to run before continuing
        waitForAssets = es.merge(opts.additionalStreams).pipe(through.obj());
    } else {
        // Else, create a fake stream
        waitForAssets = through.obj();
        waitForAssets.emit('finish');
    }

    return through.obj(function (file, enc, cb) {
        var self = this;

        waitForAssets.pipe(es.wait(function () {
            var output,
                html,
                assets,

                // Cache the file base path relative to the cwd
                // Use later when it could be dropped
                _basePath = path.dirname(file.path);

            if (file.isNull()) {
                cb(null, file);
                return;
            }

            if (file.isStream()) {
                cb(new gutil.PluginError('gulp-useref-plus', 'Streaming not supported'));
                return;
            }

            output = useref(file.contents.toString(), opts);
            html = output[0];

            try {
                file.contents = new Buffer(html);
                self.push(file);
            } catch (err) {
                self.emit('error', new gutil.PluginError('gulp-useref-plus', err));
            }

            if (opts.noAssets) {
                cb();
                return;
            }

            assets = output[1];

            types.forEach(function (type) {
                var files = assets[type];

                if (!files) {
                    return;
                }

                Object.keys(files).forEach(function (name) {
                    var src,
                        globs,
                        searchPaths,
                        filepaths = files[name].assets,
                        sortIndex = {},
                        i = 0,
                        sortedFiles = [],
                        unsortedFiles = [];

                    if (!filepaths.length) {
                        return;
                    }

                    unprocessed++;

                    if (files[name].searchPaths || opts.searchPath) {
                        if (opts.searchPath && Array.isArray(opts.searchPath)) {
                            opts.searchPath = '{' + opts.searchPath.join(',') + '}';
                        }
                        searchPaths = path.resolve(file.cwd, files[name].searchPaths || opts.searchPath);
                    }

                    // Get relative file paths and join with search paths to send to vinyl-fs
                    globs = filepaths
                        .filter(isRelativeUrl)
                        .map(function (filepath) {
                            filepath = filepath.replace(/^\/+/g, '');

                            var pattern = (searchPaths || _basePath) + path.sep + filepath,
                                matches = glob.sync(pattern, { nosort: true });

                            if (!matches.length) {
                                matches.push(pattern);
                            }
                            if (opts.transformPath) {
                                matches[0] = opts.transformPath(matches[0]);
                            }

                            return matches[0];
                        });

                    src = vfs.src(globs, {
                        base: _basePath,
                        nosort: true
                    });

                    src.on('error', function (err) {
                        self.emit('error', new Error(err));
                    });

                    // add files from external streams
                    additionalFiles.forEach(function (addFile) {
                        src.push(addFile);
                    });

                    // if we added additional files, reorder the stream
                    if (additionalFiles.length > 0) {
                        // Create a sort index so we don't iterate over the globs for every file
                        globs.forEach(function (filename) {
                            sortIndex[filename] = i++;
                        });

                        src = src.pipe(through.obj(function (srcFile, encoding, callback) {
                            var index = sortIndex[srcFile.path];

                            if (index === undefined) {
                                unsortedFiles.push(srcFile);
                            } else {
                                sortedFiles[index] = srcFile;
                            }
                            callback();
                        }, function (callback) {
                            sortedFiles.forEach(function (sorted) {
                                if (sorted !== undefined) {
                                    this.push(sorted);
                                }
                            }, this);

                            unsortedFiles.forEach(function (unsorted) {
                                this.push(unsorted);
                            }, this);
                            callback();
                        }));
                    }

                    // If any external transforms were included, pipe all files to them first
                    transforms.forEach(function (fn) {
                        src = src.pipe(fn(name));
                    });

                    if (type == 'combjs' || type == 'combcss') {
                        filepaths = filepaths.sort();

                        name = name.replace(/\d+$/g, '');
                        name += (/\/$/.test(name) ? '' : '/') + (opts.filenamePrefix ? opts.filenamePrefix : '') + getShortString(filepaths.join(','));

                        if (type == 'combjs') {
                            name += '.js';
                        }
                        else {
                            name += '.css';
                        }
                    }

                    // Add assets to the stream
                    // If noconcat option is false, concat the files first.
                    src
                        .pipe(gulpif(!opts.noconcat, concat(name)))
                        .pipe(through.obj(function (newFile, encoding, callback) {
                            // specify an output path relative to the cwd
                            if (opts.base) {
                                newFile.path = path.join(opts.base, name);
                            }

                            // add file to the asset stream
                            self.push(newFile);
                            callback();
                        }))
                        .on('finish', function () {
                            if (--unprocessed === 0 && end) {
                                // end the asset stream
                                self.emit('end');
                            }
                        });

                });
            });

            cb();
        }));
    }, function () {
        end = true;
        if (unprocessed === 0) {
            this.emit('end');
        }
    });
};