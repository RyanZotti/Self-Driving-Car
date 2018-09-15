'use strict';

var getBlocks = require('./lib/getBlocks'),
  transformReferences = require('./lib/transformReferences'),
  compactContent = require('./lib/compactContent');

module.exports = function (content, options) {
  var blocks = getBlocks(content),
    opts = options || {},
    transformedContent = transformReferences(blocks, content, opts),
    replaced = compactContent(blocks, opts);

  return [ transformedContent, replaced ];
};
