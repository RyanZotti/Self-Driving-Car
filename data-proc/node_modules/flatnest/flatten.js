module.exports = flatten

function flatten(obj) {
  var flattened = {}

  var circlular = []
  var circLoc = []

  function _route(prefix, value) {
    var i, len, type, keys, circularCheck, loc

    if (value == null) {
      if (prefix === "") {
        return
      }
      flattened[prefix] = null
      return
    }
    type = typeof value
    if (typeof value == "object") {
      circularCheck = circlular.indexOf(value)
      if (circularCheck >= 0) {
        loc = circLoc[circularCheck] || "this"
        flattened[prefix] = "[Circular (" + loc + ")]"
        return
      }
      circlular.push(value)
      circLoc.push(prefix)

      if (Array.isArray(value)) {
        len = value.length
        if (len == 0) _route(prefix + "[]", null)
        for (i = 0; i < len; i++) {
          _route(prefix + "[" + i + "]", value[i])
        }
        return
      }
      keys = Object.keys(value)
      len = keys.length
      if (prefix) prefix = prefix + "."
      if (len == 0) _route(prefix, null)
      for (i = 0; i < len; i++) {
        _route(prefix + keys[i], value[keys[i]])
      }
      return
    }
    flattened[prefix] = value
  }

  _route("", obj)

  return flattened
}
