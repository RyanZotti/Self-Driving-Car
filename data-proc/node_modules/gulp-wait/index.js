'use strict';

var map = require('map-stream'),
  _log = console.log;

module.exports = function (settings) {

  if (typeof settings !== 'object') {
    settings = {
      duration: settings
    };
  }

  if (!settings.verbose) {
    _log = function () {
      return;
    };
  }

  settings.duration = settings.duration || 1000;

  return map(function (file, cb) {

    if (typeof settings.before === 'function') {
      _log('Wait: Calling before()');
      settings.before();
    }

    var timeout = setTimeout(function () {
      timeout = null;
      _log('Wait: Waited', settings.duration);
      if (typeof settings.after === 'function') {
        _log('Wait: Calling after()');
        settings.after();
      }
      cb(null, file);
    }, settings.duration);

  });

};