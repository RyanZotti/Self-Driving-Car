Gonzales changelog
==================

xx.xx.201x, Version 3.0.0
-------------------------

AST:
    - Rename `interpolatedVariable` to `interpolation`
    - Rename `functionBody` to `arguments`
    - New node type `conditionalStatement`
    - Remove unused node types

Parsing rules:
    - Interpolations are ok as arguments, inside nth selector and within identifiers
    - Functions are ok as arguments
    - Spaces are optional after declDelim
    - Check for unary operator in arguments
    - Parse operators inside arguments (#16)
    - Remove spaces from the end of includes
    - Every argument can be escaped string
    - Braces around arguments are ok
    - Equality and inequality signs are ok as operators

API:
    - srcToAST({src: 'string', syntax: 'css', needInfo: true, rule: 'stylesheet'})
    - astToSrc()
    - astToString()

Tests:
    - Add more tests
    - Place test files inside rule directory
    - Use 'min' reporter instead of 'spec'
    - Add Travis config
    - Divide log and test scripts

29.12.2013, Version 2.0.2
-------------------------

- Sass includes can have both arguments list and content block,
  i.e. `@include nani() { color: tomato }` is valid syntax.

18.11.2013, Version 2.0.1
-------------------------
- Bring back lost whitespaces and comments

11.11.2013, Version 2.0.0
-------------------------

- Support preprocessors: Sass (both SCSS and indented syntax), LESS.
- New node types:
    - `arguments` (less and sass only)
    - `commentML`
    - `commentSL` (less and sass only)
    - `condition` (sass only)
    - `default` (sass only)
    - `escapedString` (less only)
    - `include` (less and sass only)
    - `loop` (sass only)
    - `mixin` (less and sass only)
    - `parentselector` (less and sass only)
    - `placeholder` (sass only)
    - `propertyDelim`
    - `variable` (less and sass only)
    - `varialeList` (less and sass only)
- Rename methods:
    - `srcToCSSP` -> `cssToAST`
    - `csspToSrc` -> `astToCSS`
    - `csspToTree` -> `astToTree`
- Pass all arguments as one object:
    - `gonzales.cssToAST({css: a, syntax: b, rule: c, needInfo: d})`
    - `gonzales.astToCSS({ast: ast, syntax: syntax})`
- Remove built files from VCS
- Move test command from `make` to `npm`
- Build files before running tests
- Divide tests into groups according to syntax
- Add script to test one specific css string
- Add token's index number to info object

11.02.2013, Version 1.0.7
-------------------------

- Identifiers like `_0` are identifiers now.
- Throw error instead of console.error: https://github.com/css/csso/issues/109

25.11.2012, Version 1.0.6
-------------------------

- Typo fix (global variable leak): https://github.com/css/csso/pull/110
- Attribute selectors extended by `|`.
- `not(..)` pseudo-class special support: https://github.com/css/csso/issues/111

28.10.2012, Version 1.0.5
-------------------------

- Better error line numbering: https://github.com/css/gonzales/issues/2

11.10.2012, Version 1.0.4
-------------------------

- CSSO issue (@page inside @media error): https://github.com/css/csso/issues/90

10.10.2012, Version 1.0.3
-------------------------

- Both .t-1 and .t-01 should be idents: https://github.com/css/gonzales/issues/1

08.10.2012, Version 1.0.2
-------------------------

- CSSO issue (filter + important breaks csso v1.3.1): https://github.com/css/csso/issues/87

08.10.2012, Version 1.0.1
-------------------------

- CSSO issue ("filter" IE property breaks CSSO v1.3.0): https://github.com/css/csso/issues/86

03.10.2012, Version 1.0.0
-------------------------

- First revision.
