## API

### gonzales.parse(css, options)

Parse CSS.

Parameters:

* `{String} css`
* `{{syntax: String, rule: String}} options`

Returns:

* `{Object} ast`.

Example:
```js
    var css = 'a {color: tomato}';
    var ast = gonzales.parse(css);
```

Example:
```js
    var less = 'a {$color: tomato}';
    var ast = gonzales.parse(less, {syntax: 'less'});
```

Example:
```js
    var less = '$color: tomato';
    var ast = gonzales.parse(less, {syntax: 'less', rule: 'declaration'});
```

### gonzales.createNode(options)

Creates a new node.

Parameters:

* `{{type: String, content: String|Array}} options`

Returns:

* `{Object} ast`

Example:
```js
    var css = 'a {color: tomato}';
    var ast = gonzales.parse(css);
    var node = gonzales.createNode({ type: 'animal', content: 'panda' });
    ast.content.push(node);
```

### ast.length

### ast.toString()

### ast.toCSS(syntax)

Converts AST to code.

Parameters:

* `{String} syntax`

Returns:

* `{String} css`

Example:
```js
    var css = ast.toCSS('css');
    var less = ast.toCSS('less');
```
### ast.contains(type)

Checks whether there is a child node of given type.

Parameters:

* `{String} type`

Returns:

* `{Boolean}`

Example:
```js
    if (ast.contains('panda'))
        doSomething();
```

### ast.first(type)

Returns the first child node of given type.

Parameters:

* `{String=} type`

Returns:

* `{Node} node`

Example:
```js
    var node = ast.first();
    node.content = 'panda';
```

Example:
```js
    var node = ast.first('commentML');
    node.content = 'panda';
```

### ast.forEach(type, function)

Calls the function for every child node of given type.

Parameters:

* `{String=} type`
* `{Function} function`

Example:
```js
    ast.forEach('commentML', function(node) {
        node.content = 'panda';
    });
```

### ast.get(index)

### ast.insert(index, node)

### ast.is(type)

Checks whether the node is of given type.

Parameters:

* `{String} type`

Returns:

* `{Boolean}`

Example:
```js
    if (ast.is('s'))
        ast.content = '';
```

### ast.last(type)

Returns the last child node of given type.

Parameters:

* `{String=} type`

Returns:

* `{Node} node`

Example:
```js
    var node = ast.last()
    node.content = 'panda';
```

Example:
```js
    var node = ast.last('commentML');
    node.content = 'panda';
```

### ast.map(function)

Calls the function for every node in a tree. Modifies the tree!

Parameters:

* `{Function} function`

Example:
```js
    ast.map(function(node) {
        if (node.type === 'commentML') node.content = 'panda';
    });
```


## Test

To run tests:

    npm test

This command will build library files from sources and run tests on all files
in syntax directories.

Every test has 3 files: source stylesheet, expected AST and expected string
compiled back from AST to css.

If some tests fail, you can find information in test logs:

- `log/test.log` contains all information from stdout;
- `log/expected.txt` contains only expected text;
- `log/result.txt` contains only result text.

The last two are made for your convenience: you can use any diff app to see
the defference between them.

If you want to test one specific string or get a general idea of how Gonzales
works, you can use `test/ast.js` file.    
Simply change the first two strings (`css` and `syntax` vars) and run:

    node test/single-test.js

## Report

If you find a bug or want to add a feature, welcome to [Issues](https://github.com/tonyganch/gonzales-pe/issues).

If you are shy but have a question, feel free to [drop me a
line](mailto:tonyganch+gonzales@gmail.com).
