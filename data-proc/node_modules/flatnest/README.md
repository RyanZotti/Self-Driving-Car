flatnest
=====

[![NPM](https://nodei.co/npm/flatnest.png)](https://nodei.co/npm/flatnest/)

Flatten/Nest Javascript objects.

```javascript

var fn = require("flatnest")

var obj = {
  cat: "meow",
  dog: [{name: "spot"}, {name: "rover"}],
  bird: {type: "parrot", age: 22.3, stats: {weight: 10, height: 15}}
}

var flat = fn.flatten(obj)

/*
{ cat: 'meow',
  'dog[0].name': 'spot',
  'dog[1].name': 'rover',
  'bird.type': 'parrot',
  'bird.age': 22.3,
  'bird.stats.weight': 10,
  'bird.stats.height': 15 }
 */


var nested = fn.nest(flat)

/*
{ cat: 'meow',
  dog: [ { name: 'spot' }, { name: 'rover' } ],
  bird:
   { type: 'parrot',
     age: 22.3,
     stats: { weight: 10, height: 15 } } }
 */

// An internal `seek` function is also exposed:

fn.seek(obj, "bird.stats.height") // 15


```

API
===

`flatten(object)`
---

Flatten an object to a javascript object with only key: value pairs where values are not complex data types. (e.g. they can be numbers, strings, booleans, but not Objects or Arrays)

Keys are named with paths to where the keys where when nested.

`nest(flatObject)`
---

Re-form a flattend object into the nested version. It parses the key paths set during flattening and should end up with the original version. This is not always true depending on what data was present and the original key names chosen.

`seek(object, path)`
---

Use the flattened key syntax (e.g. `aa.bb[0].cc`) to look into a nested object.

NOTES
===

It attempts to do the right thing in a few cases, such as circular references, and will probably not do what you want if you're using `.` or `[]` already in your key names (why would you do that!?!)

Circular example:
```javascript
var fn = require("flatnest")

var obj = {
  aa: "cat",
}
obj.bb = obj

console.log(obj)

// { aa: 'cat', bb: [Circular] }

// Will insert a string value of [Circular (ref)] pointing to the location this ref was first seen while flattening.
var flat = fn.flatten(obj)

console.log(flat)

// { aa: 'cat', bb: '[Circular (this)]' }

var nested = fn.nest(obj)

// { aa: 'cat', bb: { aa: 'cat', bb: [Circular] } }

console.log(nested)
```

LICENSE
=======

MIT
