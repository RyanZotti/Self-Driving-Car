'use strict';

var resources = require('./resources');

module.exports = function (block) {
  var parts = block.match(resources.regbuild);

  return {
    type: parts[1],
    alternateSearchPaths: parts[2],
    target: parts[3] && parts[3].trim(),
    attbs: parts[4] && parts[4].trim()
  };
};
