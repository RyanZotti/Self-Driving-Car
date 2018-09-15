module.exports = seek

var nestedRe = /(\.|\[)/
var scrub = /]/g

function seek(obj, path) {
  path = path.replace(scrub, "")
  var pathBits = path.split(nestedRe)
  var len = pathBits.length
  var layer = obj
  for (var i = 0; i < len; i += 2) {
    if (layer == null) return undefined
    var key = pathBits[i]
    layer = layer[key]
  }
  return layer
}