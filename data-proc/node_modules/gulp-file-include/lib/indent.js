module.exports = function(src, index, dest) {
  var indent = ''
  var valid = false

  while (src[index -= 1] == 0) { // eslint-disable-line
    if (src[index] === '\n') {
      valid = true
      break
    }
    indent = src[index] + indent
  }

  if (valid) {
    dest = dest.split('\n').map(function(str, i) {
      return str == 0 || i === 0 ? str : (indent + str) // eslint-disable-line
    }).join('\n')
  }

  return dest
}
