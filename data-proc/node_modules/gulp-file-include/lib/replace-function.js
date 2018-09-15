'use strict'

const balanced = require('balanced-match')

module.exports = function(content, opts) {
  var result = ''
  var reStart = new RegExp(opts.prefix + '[ ]*' + opts.name + '\\(')
  var reEnd = new RegExp('^[ ]*' + opts.suffix)
  var matchStart
  var matchArg
  var matchEnd
  var safeStart
  var before
  var replacement

  while (matchStart = reStart.exec(content)) { // eslint-disable-line
    safeStart = matchStart.index + matchStart[0].length - 1

    matchArg = balanced('(', ')', content.slice(safeStart))

    if (matchArg && matchArg.start === 0) {
      if (opts.suffix) {
        matchEnd = reEnd.exec(matchArg.post)
      }

      matchEnd = matchEnd ? matchEnd.index + matchEnd[0].length : 0

      if (!opts.suffix || matchEnd) {
        before = content.slice(0, matchStart.index)
        replacement = opts.handler({
          before: before,
          args: matchArg.body
        })

        if (replacement !== undefined) {
          result += before + replacement.toString()
          content = content.slice(safeStart + matchArg.end + 1 + matchEnd)
          continue
        }
      }
    }

    result += content.slice(0, safeStart)
    content = content.slice(safeStart)
  }

  result += content

  return result
}
