# CSScomb Core

CSScomb Core is a framework for writing postprocessors.  
It provides you with a nice set of features:

1. Parser with support of preprocessors
1. API to create and use options
1. API to process files and directories


## Usage

```js
var Comb = require('csscomb-core');
// Constructor accepts a list of options to use and list of acceptable syntaxes.
var comb = new Comb(options, 'css');
```

For a simple example of usage take a look [at a template project](https://github.com/csscomb/core-template).  
Feel free to fork it and modify.

## List of public methods

There are a number of methods that become available once you create an instance.

### comb.use(option)

Use a plugin.

- Params: *{Object}*  Option's plugin
- Return: *{CombCore}*  Instance's object

### comb.configure(config)

Load configuration from JSON.  
Activate and configure needed options.

- Params: *{Object}*  Config
- Return: *{CombCore}*  Instance's object

### comb.getOptionsOrder()

Get list of available options in exact order they will be processed.  
Can be used for testing purpose.

- Return: *{Array}*  List of options' names

### comb.getValue(optionName)

Get option's value.  
Can be used inside plugin's `process` method.

- Params: *{String}*  Option's name
- Return: Value set by user for this option

### comb.getSyntax()

Get name of syntax that is currently being used.  
Can be used inside plugin's `process` method.

- Return: *{String}*  Syntax name

### comb.processPath(path)

Process a file or a directory.

- Params: *{String}*  Path to file or directory</td>
- Return: *{Promise}*

### comb.processDirectory(path)

Process all files in a directory.

- Params: *{String}*  Path to directory
- Return: *{Promise}*

### comb.processFile(path)

Process a single file.

- Params: *{String}*  Path to file
- Return: *{Promise}*

### comb.processString(string, options)

Process a string.

- Params:  
  *{String}*  Code to process  
  *{{context: String, filename: String, syntax: String}}* Options (optional)
  where *context* is
  Gonzales PE rule, *filename* is a file's name that is used to display errors and
  *syntax* is syntax name with `css` being a default value.  
- Return: *{String}*  Processed string

## Writing a plugin

A plugin is a JavaScript object that has methods to set value and process AST
nodes.  
Take a look at [Flip Comb](https://github.com/csscomb/core-template/blob/master/lib/options/flip-comments.js) for an example.  
There are some fields you should take care of.

### name

Option's name as it should be used in config.

- Required: yes
- Acceptable value: *{String}*
- Example: `"flip-comments"`

### syntax

List of syntaxes the option supports.  
This depends on parser possibilities.  
Currently the following work fine: `css`, `less`, `sass` and `scss`.

- Required: yes
- Acceptable value: *{Array}*
- Example: `['css']`

### accepts

In order to tell CSScomb Core which values are acceptable, plugin should have
either `accepts` or `setValue` field.  
`accepts` should be used to provide patterns, while `setValue` is good for
modifying value before using it.

You can use one or several of the following:  
– `boolean: [true]`  
– `boolean: [false]`  
– `boolean: [true, false]`  
– `string: /regexp/`  
– `number: true`

- Required: no, but if this field is missed, `setValue` must be set
- Acceptable value: *{Object}*
- Example: `{ boolean: [true] }`

### setValue

Function to modify option's value before using it.  
This field overrides `accepts` field if it's set in the plugin too.

- Required: no, but if this field is missed, `accepts` must be set
- Acceptable value: *{Function}*
- Example: ` function(value) { return value * 4; }`

### runBefore

Run the plugin before another option.  

- Required: no
- Acceptable value: *{String}* Another option's name
- Example: `"block-indent"`

### process

Modify AST nodes.

- Required: yes
- Acceptable value: *{Function}*
- Example: <pre><code>function(nodeType, nodeContent) {
        if (nodeType === 'commentML') node[0] = ' (╯°□°）╯︵ ┻━┻ ';
}</code></pre>
