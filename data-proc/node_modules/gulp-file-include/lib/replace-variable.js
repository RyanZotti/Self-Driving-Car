'use strict'

const flatten = require('flatnest').flatten

module.exports = function(content, data, opts) {
  var prefix = opts.prefix + '[ ]*'
  var suffix = opts.suffix ? '[ ]*' + opts.suffix : ''
  data = flatten(data)
  // sort keys by longest keys to iterate in that order
  var keys = Object.keys(data).sort()
  var i = keys.length - 1
  var key

  for (; ~i; i -= 1) {
    key = keys[i]
    content = content.replace(new RegExp(prefix + key + suffix, 'g'), data[key])
  }

  return content
}
