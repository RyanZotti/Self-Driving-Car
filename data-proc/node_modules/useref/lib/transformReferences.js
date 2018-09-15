'use strict';

var resources = require('./resources'),
  refManager = require('./refManager');

module.exports = function (blocks, content, options) {
  var replaced = content,
    refm = Object.create(refManager),

    // Determine the linefeed from the content
    linefeed = /\r\n/g.test(content) ? '\r\n' : '\n';

  // handle blocks
  Object.keys(blocks).forEach(function (key) {
    var block = blocks[key].join(linefeed),
      lines = block.split(linefeed),
      indent = (lines[0].match(/^\s*/) || [])[0],
      ccmatches = block.match(resources.regcc),
      blockContent = lines.slice(1, -1).join(linefeed),
      ref = refm.getRef(block, blockContent, options);

    if (ref !== null) {
      ref = indent + ref;

      // Reserve IE conditional comment if exist
      if (ccmatches) {
        ref = indent + ccmatches[1] + linefeed + ref + linefeed + indent + ccmatches[2];
      }

      if (options.noconcat) {
        replaced = replaced.replace(block, blockContent);
      } else {
        replaced = replaced.replace(block, ref);
      }
    }
  });

  return replaced;
};
