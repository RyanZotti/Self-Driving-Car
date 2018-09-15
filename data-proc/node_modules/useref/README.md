# useref [![Build Status](https://travis-ci.org/jonkemp/useref.svg?branch=master)](https://travis-ci.org/jonkemp/useref) [![Coverage Status](https://coveralls.io/repos/jonkemp/useref/badge.svg?branch=master&service=github)](https://coveralls.io/github/jonkemp/useref?branch=master)

[![NPM](https://nodei.co/npm/useref.png?downloads=true)](https://nodei.co/npm/useref/)

> Parse build blocks in HTML files to replace references

Extracted from the grunt plugin [grunt-useref](https://github.com/pajtai/grunt-useref).

## Installation

```
npm install useref
```

## Usage

```js
var useref = require('useref');
var result = useref(inputHtml);
// result = [ replacedHtml, { type: { path: { 'assets': [ replacedFiles] }}} ]
```


Blocks are expressed as:

```html
<!-- build:<type>(alternate search path) <path> <parameters> -->
... HTML Markup, list of script / link tags.
<!-- endbuild -->
```

- **type**: either `js`, `css` or `remove`
- **alternate search path**: (optional) By default the input files are relative to the treated file. Alternate search path allows one to change that
- **path**: the file path of the optimized file, the target output
- **parameters**: extra parameters that should be added to the tag. By default `rel="stylesheet"` attribute is added to css link tag, your can overwrite it by passing your own rel parameter, e.g. `rel="preload"`

An example of this in completed form can be seen below:

```html
<html>
<head>
  <!-- build:css css/combined.css -->
  <link href="css/one.css" rel="stylesheet">
  <link href="css/two.css" rel="stylesheet">
  <!-- endbuild -->
</head>
<body>
  <!-- build:js scripts/combined.js -->
  <script type="text/javascript" src="scripts/one.js"></script>
  <script type="text/javascript" src="scripts/two.js"></script>
  <!-- endbuild -->

  <!-- build:js scripts/async.js async data-foo="bar" -->
  <script type="text/javascript" src="scripts/three.js"></script>
  <script type="text/javascript" src="scripts/four.js"></script>
  <!-- endbuild -->
</body>
</html>
```

The module would be used with the above sample HTML as follows:

```js
var result = useref(sampleHtml);

// [
//   resultHtml,
//   {
//     css: {
//       'css/combined.css': {
//         'assets': [ 'css/one.css', 'css/two.css' ]
//       }
//     },
//     js: {
//       'scripts/combined.js': {
//         'assets': [ 'scripts/one.js', 'scripts/two.js' ]
//       },
//       'scripts/async.js': {
//          'assets': [ 'scripts/three.js', 'scripts/four.js' ]
//        }
//     }
//   }
// ]
```


The resulting HTML would be:

```html
<html>
<head>
  <link rel="stylesheet" href="css/combined.css"/>
</head>
<body>
  <script src="scripts/combined.js"></script>
  <script src="scripts/async.js" async data-foo="bar" ></script>
</body>
</html>
```

## IE Conditional Comments

Internet Explorer Conditional Comments are preserved. The code below:

```html
<!-- build:js scripts/combined.js   -->
<!--[if lt IE 9]>
<script type="text/javascript" src="scripts/this.js"></script>
<script type="text/javascript" src="scripts/that.js"></script>
<![endif]-->
<!-- endbuild -->
```

Results in:

```html
<!--[if lt IE 9]>
<script src="scripts/combined.js"></script>
<![endif]-->
```

### Custom blocks

Sometimes you need a bit more. If you would like to do custom processing, this is possible with a custom block, as demonstrated below.

```html
<!-- build:import components -->
<link rel="import" href="/bower_components/some/path"></link>
<!-- endbuild -->
```

With

```js
var useref = require('useref');
var result = useref(inputHtml, {
  // each property corresponds to any blocks with the same name, e.g. "build:import"
  import: function (content, target, options, alternateSearchPath) {
    // do something with `content` and return the desired HTML to replace the block content
    return content.replace('bower_components', target);
  }
});
```

Becomes

```html
<link rel="import" href="/components/some/path"></link>
```

The handler function gets the following arguments:

- *content* (String): The content of the custom use block
- *target* (String): The "path" value of the use block definition
- *options* (String): The extra attributes from the use block definition, the developer can parse as JSON or do whatever they want with it
- *alternateSearchPath* (String): The alternate search path that can be used to maintain a coherent interface with standard handlers

Include a handler for each custom block type.

### Symfony Twig and Laravel 5 Blade assets

Works with the [symfony2 assetic](http://symfony.com/doc/current/cookbook/assetic/asset_management.html) and [laravel asset](https://laravel.com/docs/5.1/helpers#method-asset) and [elixir](https://laravel.com/docs/5.2/elixir#versioning-and-cache-busting) links in twig or blade or html or php.

```html
<!-- build:js scripts/combined.js -->
<script src="{{ asset('symfony/js/script.js') }}"></script>
<script src="{{ elixir('laravel/js/script.js') }}"></script>
<!-- endbuild -->
```

### Options

#### options.noconcat

Type: `Boolean`  
Default: `false`

Strips out build comments but leaves the rest of the block intact without replacing any tags.

```html
<!-- build:js scripts/combined.js   -->
<script type="text/javascript" src="scripts/this.js"></script>
<script type="text/javascript" src="scripts/that.js"></script>
<!-- endbuild -->
```

Results in:

```html
<script type="text/javascript" src="scripts/this.js"></script>
<script type="text/javascript" src="scripts/that.js"></script>
```

#### options.parseSourcePath

Type: `Function`
Return: The path to the source file

Function to parse the source path out of a script or style element.

The function gets the following arguments:
- *tag* (String): The html script or style tag
- *type*: (String): The type e.g. `js`, `css`

#### options.transformTargetPath

Type: `Function`
Return: The transformed path to the target file

Function to transform the target file path.

The function gets the following arguments:

- *target* (String): The path to the target file
- *type*: (String): The type e.g. `js`, `css`

## Contributing

See the [CONTRIBUTING Guidelines](https://github.com/jonkemp/useref/blob/master/CONTRIBUTING.md)

## License

MIT © [Jonathan Kemp](http://jonkemp.com)
