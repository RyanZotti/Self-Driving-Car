'use strict';

var nano        = require('cssnano'),
    bufferFrom  = require('buffer-from'),
    assign      = require('object-assign'),
    PluginError = require('plugin-error'),
    Transform   = require('stream').Transform,
    applySourceMap = require('vinyl-sourcemaps-apply'),

    PLUGIN_NAME = 'gulp-cssnano';

module.exports = function (opts) {
    opts = opts || {};
    var stream = new Transform({objectMode: true});

    stream._transform = function (file, encoding, cb) {
        if (file.isNull()) {
            return cb(null, file);
        }
        if (file.isStream()) {
            var error = 'Streaming not supported';
            return cb(new PluginError(PLUGIN_NAME, error));
        } else if (file.isBuffer()) {
            return nano.process(String(file.contents), assign(opts, {
                map: (file.sourceMap) ? {annotation: false} : false,
                from: file.relative,
                to: file.relative
            })).then(function (result) {
                if (result.map && file.sourceMap) {
                    applySourceMap(file, String(result.map));
                }
                file.contents = bufferFrom(result.css);
                this.push(file);
                cb();
            }.bind(this))
            .catch(function (error) {
                  var errorOptions = {fileName: file.path};
                  if (error.name === 'CssSyntaxError') {
                     error = error.message + error.showSourceCode();
                     errorOptions.showStack = false;
                  }
                 // Prevent stream’s unhandled exception from
                 // being suppressed by Promise
                 setImmediate(function () {
                     cb(new PluginError(PLUGIN_NAME, error));
                 });
            });
        }
    };

    return stream;
};
