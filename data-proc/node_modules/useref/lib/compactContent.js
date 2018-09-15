'use strict';

var parse = require('./parseBuildBlock'),
  resources = require('./resources'),
  sectionsJoinChar = resources.sectionsJoinChar,
  regComment = resources.regComment;

function removeComments(lines) {
  return lines.join('\n').replace(regComment, '').split('\n');
}

module.exports = function (blocks, options) {

  var result = {},
    parseSourcePath = options.parseSourcePath || function (tag) {
      return (tag.match(/(href|src)=(?:["']\W+\s*(?:\w+)\()?["']([^'"]+)['"]/) || [])[2];
    };

  Object.keys(blocks).forEach(function (dest) {
    // Lines are the included scripts w/o the use blocks
    var lines = blocks[dest].slice(1, -1),
      parts = dest.split(sectionsJoinChar),
      type = parts[0],

      // output is the useref block file
      output = parts[1],
      build = parse(blocks[dest][0]),
      assets;

    // remove html comment blocks
    lines = removeComments(lines);

    // parse out the list of assets to handle, and update the config accordingly
    assets = lines.map(function (tag) {
      if (typeof(parseSourcePath) !== 'function') {
        throw new Error('options.parseSourcePath must be a function');
      }

      // call function to parse the asset path
      return parseSourcePath(tag, type);
    }).reduce(function (a, b) {
      return b ? a.concat(b) : a;
    }, []);

    result[type] = result[type] || {};

    result[type][output] = {
      assets: assets
    };

    if (build.alternateSearchPaths) {
      // Alternate search path
      result[type][output].searchPaths = build.alternateSearchPaths;
    }
  });

  return result;
};
