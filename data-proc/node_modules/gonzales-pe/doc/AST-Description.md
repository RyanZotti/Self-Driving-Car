### 1. Gonzales AST — Abstract Syntax Tree

If you don't know what AST is, first read [article at Wikipedia] (http://en.wikipedia.org/wiki/Abstract_syntax_tree).

In general Gonzales AST looks like this:

    ['stylesheet',
      ['atrules', ..],
      ['s', ' '],
      ['commentML', 'sample'],
      ['ruleset',
        ['selector', ..]],
        ['block', ..]]

#### Known issues

*operator* / *unary* — rather artificial division, in addition *unary* is
misnamed. Utilities working with AST may need to handle both types of nodes
instead of one.

*raw* — currently *raw* contains unparsed `progid` IE. In the future it makes
sense to parse that parts in full AST.

### 2. Node structure

Node is a JavaScript array of the following type:

    ['token type', <- required
     <content>]    <- optional

Content can be other nodes or CSS source.

In case `needInfo` parameter was `true`, the node includes info object.    
It contains token's index number and token's line number:

    [{ ln: ln, tn: tn }, <- info object
     'token type',       <- required
     <content>]          <- optional

### 3. Node types

In alphabetical order.

#### arguments

Mixin's arguments.    
Valid only for scss syntax.    
Can be any number of:
- *string*,
- *ident*,
- *vhash*,
- *variable*,
- *number*,
- *declaration*,

wraped with braces, mixed with spaces and separated with commas.

```
(10)

↓

['arguments',
  ['number', '10']]
```

#### atkeyword

@-rule identifier.

```
@font-face

↓

['atkeyword',
  ['ident', 'font-face']]
```

#### atruleb

Block @-rule.

Consists of:
- *atkeyword* (@-rule identifier),
- rule, and
- *block*.

```
@test x y {p:v}

↓

['atruleb',
  ['atkeyword',
    ['ident', 'test']],
  ['s', ' '],
  ['ident', 'x'],
  ['s', ' '],
  ['ident', 'y'],
  ['s', ' '],
  ['block',
    ['declaration',
      ['property',
        ['ident', 'p']],
      ['propertyDelim'],
      ['value',
        ['ident', 'v']]]]]
```

#### atruler, atrulerq, atrulers

@-rule with a ruleset.

Consists of:
- *atkeyword* (@-rule identifier),
- rule, and
- styles set.

```
@media x y {s{p:v}}

↓

['atruler',
  ['atkeyword',
    ['ident', 'media']],
  ['atrulerq',
    ['s', ' '],
    ['ident', 'x'],
    ['s', ' '],
    ['ident', 'y'],
    ['s', ' ']],
  ['atrulers',
    ['ruleset',
      ['selector',
        ['simpleselector',
          ['ident', 's']]],
      ['block',
        ['declaration',
          ['property',
            ['ident', 'p']],
          ['propertyDelim'],
          ['value',
            ['ident', 'v']]]]]]]
```

#### atrules

Single-line @-rule.

Consists of:
- *atkeyword* (@-rule identifier), and
- rule.

```
@import url('/css/styles.css')

↓

['atrules',
  ['atkeyword',
    ['ident', 'import']],
  ['s', ' '],
  ['uri',
    ['string', ''/css/styles.css'']]]
```

#### attrib

Attribute selector.

```
[a='b']

↓

['attrib',
  ['ident', 'a'],
  ['attrselector', '='],
  ['string', ''b'']]
```

#### attrselector

Attribute selector operator: `=`, `~=`, `^=`, `$=`, `*=`, `|=`.

```
[a='b']

↓

['attrib',
  ['ident', 'a'],
  ['attrselector', '='],
  ['string', ''b'']]
```

#### block

Part of the style in braces: `{...}`.    
For `*.sass` files — code that will be compiled to a block.

```
{ color: red }

↓

['block',
  ['s', ' '],
  ['declaration',
    ['property',
      ['ident', 'color']],
    ['propertyDelim'],
    ['value',
      ['s', ' '],
      ['ident', 'red'],
      ['s', ' ']]]]
```

#### braces

Braces and their content.

```
()
(1)

↓

['braces', '(', ')']
['braces', '(', ')',
  ['number', '1']]
```

#### class

Class.

```
.abc

↓

['class',
  ['ident', 'abc']]
```

#### combinator

Combinator: `+`, `>`, `~`.

```
x+y { .. }

↓

['simpleselector',
  ['ident', 'x'],
  ['combinator', '+'],
  ['ident', 'y']]
```

#### commentML

Multi-line comment.

```
/* test */

↓

['commentML', ' test ']
```

#### commentSL

Single-line comment.
Valid for less, scss and sass.

```
// comment

↓

['commentSL', ' comment']
```

#### condition

Condition.
Valid for less, scss and sass.

```
@if nani == panda

↓

['condition',
  ['atkeyword',
    ['ident', 'if']],
  ['s', ' '],
  ['ident', 'nani'],
  ['s', ' '],
  ['operator', '='],
  ['operator', '='],
  ['s', ' '],
  ['ident', 'panda']]
```

#### declaration

Property/value pair.

Consists of:
- *property*,
- *propertyDelim* and
- *value*

mixed with spaces and comments.

```
color: red

↓

['declaration',
  ['property',
    ['ident', 'color']],
  ['propertyDelim'],
  ['value',
    ['s', ' '],
    ['ident', 'red']]]
```

#### declDelim

Declaration delimiter in block: `\n` for sass, `;` for other syntaxes.

```
x {a: b; c: d}

↓

['block',
  ['declaration',
    ['property',
      ['ident', 'a']],
    ['propertyDelim'],
    ['value',
      ['s', ' '],
      ['ident', 'b']]],
  ['declDelim'],
  ['s', ' '],
  ['declaration',
    ['property',
      ['ident', 'c']],
    ['propertyDelim'],
    ['value',
      ['s', ' '],
      ['ident', 'd']]]]
```

#### default

`!default` keyword.
Valid only for scss and syntax.

```
a: b !default

↓

['declaration',
  ['property',
    ['ident', 'a']],
  ['propertyDelim'],
  ['value',
    ['s', ' '],
    ['ident', 'b'],
    ['s', ' '],
    ['default']]]
```

#### delim

Simple selector delimiter in selector: `,`.

```
x,y{ .. }

↓

['selector',
  ['simpleselector',
    ['ident', 'x']],
  ['delim'],
  ['simpleselector',
    ['ident', 'y']]]
```

#### dimension

Number with dimension unit.

```
10px

↓

['dimension',
  ['number', '10'],
  ['ident', 'px']]
```

#### escapedString

Escaped string.    
Valid only for less.

```
~"ms:alwaysHasItsOwnSyntax.For.@{what}()"

↓

['escapedString', '"ms:alwaysHasItsOwnSyntax.For.@{what}()"']]
```

#### filter, filterv, progid

Node to store IE `filter`.

Consists of:
- *property* (property name),
- *filterv* (contents), and
- *progid* (`progid` itself).

```
filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(src='a.png',sizingMethod='scale')

↓

['filter',
  ['property',
    ['ident', 'filter']],
  ['propertyDelim'],
  ['filterv',
    ['progid',
      ['raw', 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src='a.png',sizingMethod='scale')']]]]
```

#### function, functionBody

Function.

Consists of:
- *ident* (function name), and
- *functionBody* (function body).

```
color: rgb(255,0,0)

↓

['declaration',
  ['property',
    ['ident', 'color']],
  ['propertyDelim'],
  ['value',
    ['s', ' '],
    ['function',
      ['ident', 'rgb'],
      ['functionBody',
        ['number', '255'],
        ['operator', ','],
        ['number', '0'],
        ['operator', ','],
        ['number', '0']]]]]
```

#### functionExpression

Node to store `expression`.

```
left:expression(document.body.offsetWidth+1)

↓

['declaration',
  ['property',
    ['ident', 'left']],
  ['propertyDelim'],
  ['value',
    ['functionExpression', 'document.body.offsetWidth+1']]]
```

#### ident

Identifiers or names.

In *atkeyword*:

```
@import ..;

↓

['atkeyword',
  ['ident', 'import']]
```

In *class*:
```
.abc

↓

['class',
  ['ident', 'abc']]
```

In *dimension*:
```
10px

↓

['dimension',
  ['number', '10'],
  ['ident', 'px']]
```

#### important

`!important` keyword.

```
a: b !important

↓

['declaration',
  ['property',
    ['ident', 'a']],
  ['propertyDelim'],
  ['value',
    ['s', ' '],
    ['ident', 'b'],
    ['s', ' '],
    ['important']]]
```

#### include

Included mixin.

For scss and sass:

```
@include nani

↓

['include',
  ['atkeyword',
    ['ident', 'include']],
  ['s', ' '],
  ['simpleselector',
    ['ident', 'nani']]]
```

For less:

```
.nani(2px)

↓

['include',
  ['class',
    ['ident', 'nani']],
  ['arguments',
    ['dimension',
      ['number', '2'],
      ['ident', 'px']]]]
```

#### interpolatedVariable

Valid only for less.

```
@{nani}

↓

['interpolatedVariable',
  ['ident', 'nani']]
```

#### interpolation

Interpolated expression

Valid only for scss and sass.

```
#{$nani}

↓

['interpolation',
  ['variable',
    ['ident', 'nani']]]
```


#### loop

Valid only for scss and sass.

```
@while 1 > 2 {a{p:v}}

↓

['loop',
  ['atkeyword',
    ['ident', 'while']],
  ['s', ' '],
  ['number', '1'],
  ['s', ' '],
  ['operator', '>'],
  ['s', ' '],
  ['number', '2'],
  ['s', ' '],
  ['block',
    ['ruleset',
      ['selector',
        ['simpleselector',
          ['ident', 'a']]],
      ['block',
        ['declaration',
          ['property',
            ['ident', 'p']],
          ['propertyDelim'],
          ['value',
            ['ident', 'v']]]]]]]
```

#### mixin

For scss and sass:

```
@mixin nani {color:tomato}

↓

['mixin',
  ['atkeyword',
    ['ident', 'mixin']],
  ['s', ' '],
  ['ident', 'nani'],
  ['s', ' '],
  ['block',
    ['declaration',
      ['property',
        ['ident', 'color']],
      ['propertyDelim'],
      ['value',
        ['ident', 'tomato']]]]]
```

For less:

```
.nani (@color) {color:@color}

↓

['mixin',
  ['class',
    ['ident', 'nani']],
  ['s', ' '],
  ['arguments',
    ['variable',
      ['ident', 'color']]],
  ['s', ' '],
  ['block',
    ['declaration',
      ['property',
        ['ident', 'color']],
      ['propertyDelim'],
      ['value',
        ['variable',
          ['ident', 'color']]]]]]
```

#### namespace

Namespace sign in *simpleselector*.

```
*|E { .. }

↓

['simpleselector',
  ['ident', '*'],
  ['namespace'],
  ['ident', 'E']]
```

#### nth

Numbers and identifiers in *nthselector*.

```
:nth-child(2n+1)

↓

['nthselector',
  ['ident', 'nth-child'],
  ['nth', '2n'],
  ['unary', '+'],
  ['nth', '1']]
```

#### nthselector

`:nth-` pseudo-classes.

It consists of a pseudo-class *ident* and content.

```
:nth-last-child(+3n-2)

↓

['nthselector',
  ['ident', 'nth-last-child'],
  ['unary', '+'],
  ['nth', '3n'],
  ['unary', '-'],
  ['nth', '2']]
```

#### number

Number.

```
10
12.34

↓

['number', '10']
['number', '12.34']
```

#### operator

Operator: `/`, `,`, `:`, `=`.

```
test(x,y)

↓

['function',
  ['ident', 'test'],
  ['functionBody',
    ['ident', 'x'],
    ['operator', ','],
    ['ident', 'y']]]
```

#### parentselector

Valid only for less, scss and sass.

```
&.nani

↓

['parentselector'],
['class',
  ['ident', 'nani']]
```

#### percentage

Number with percent sign.

```
10%

↓

['percentage',
  ['number', '10']]
```

#### placeholder

Placeholder.    
Valid only for scss and sass.

```
%button

↓

['placeholder',
  ['ident', 'button']]
```

#### property

CSS property.

```
top:0
$color: tomato

↓

['declaration',
  ['property',
    ['ident', 'top']],
  ['propertyDelim'],
  ['value',
    ['number', '0']]]


['declaration',
  ['property',
    ['variable', 'color']],
  ['propertyDelim'],
  ['value',
    ['ident', 'tomato']]]
```

#### propertyDelim

Delimiter `:` between property and value.

```
color: tomato

↓

['declaration',
  ['property',
    ['ident', 'color']],
  ['propertyDelim'],
  ['value',
    ['s', ' '],
    ['ident', 'tomato']]]
```

Sass allows you to put `:` before property:

```
:color tomato

↓

['declaration',
  ['propertyDelim'],
  ['property',
    ['ident', 'color'],
    ['s', ' ']],
  ['value',
    ['ident', 'tomato']]]
```

#### pseudoc

Pseudo-class.

```
test:visited

↓

['simpleselector',
  ['ident', 'test'],
  ['pseudoc',
    ['ident', 'visited']]]
```

#### pseudoe

Pseudo-element.

```
p::first-line

↓

['simpleselector',
  ['ident', 'p'],
  ['pseudoe',
    ['ident', 'first-line']]]
```

#### raw

Unparsed parts of the style. Refers to a specific browser specific extensions,
usually IE `filter`.

```
progid:DXImageTransform.Microsoft.AlphaImageLoader(src='a.png',sizingMethod='scale')

↓

['progid',
  ['raw', 'progid:DXImageTransform.Microsoft.AlphaImageLoader(src='a.png',sizingMethod='scale')']]]]
```

#### ruleset

A set of rules with selectors.

Consists of:
- *selector* (selector), and
- *block* (a set of rules).

```
x, y {p:v}

↓

['ruleset',
  ['selector',
    ['simpleselector',
      ['ident', 'x']],
    ['delim'],
    ['simpleselector',
      ['s', ' '],
      ['ident', 'y'],
      ['s', ' ']]],
  ['block',
    ['declaration',
      ['property',
        ['ident', 'p']],
      ['propertyDelim'],
      ['value',
        ['ident', 'v']]]]]
```

#### s

Whitespace: space, `\t`, `\n`, `\r`.

```
/*a*/  /*b*/

↓

['commentML', 'a'],
['s', '  '],
['commentML', 'b']
```

#### selector

Node to store *simpleselector* groups.

```
x, y, [a=b] { .. }

↓

['selector',
  ['simpleselector',
    ['ident', 'x']],
  ['delim'],
  ['simpleselector',
    ['s', ' '],
    ['ident', 'y']],
  ['delim'],
  ['simpleselector',
    ['s', ' '],
    ['attrib',
      ['ident', 'a'],
      ['attrselector', '='],
      ['ident', 'b']],
    ['s', ' ']]]
```

#### shash

Hexadecimal number in *simpleselector*.

```
.. #FFF .. { .. }

↓

['shash', 'FFF']
```

#### simpleselector

Sets of selectors between a commas.

```
x, y+z { .. }

↓

['selector',
  ['simpleselector',
    ['ident', 'x']],
  ['delim'],
  ['simpleselector',
    ['s', ' '],
    ['ident', 'y'],
    ['combinator', '+'],
    ['ident', 'z'],
    ['s', ' ']]]
```

#### string

String wraped with single or double quotes.

```
'test'
"test"

↓

['string', ''test'']
['string', '"test"']
```

#### stylesheet

Style. The root node of AST.

Can consist of:

- rulesets (sets of rules with selectors),
- @-rules,
- whitespaces,
- single-line comments,
- multi-line comments.

```
@import "x.png"; /*sample*/ x{p:v}

↓

['stylesheet',
  ['atrules',
    ['atkeyword',
      ['ident', 'import']],
    ['s', ' '],
    ['string', '"x.png"']],
  ['s', ' '],
  ['commentML', 'sample'],
  ['s', ' '],
  ['ruleset',
    ['selector',
      ['simpleselector',
        ['ident', 'x']]],
    ['block',
      ['declaration',
        ['property',
          ['ident', 'p']],
        ['propertyDelim'],
        ['value',
          ['ident', 'v']]]]]]
```

#### unary

Unary (or arithmetical) sign: `+`, `-`.

```
nth-last-child(3n+0)

↓

['nthselector',
  ['ident', 'nth-last-child'],
  ['nth', '3n'],
  ['unary', '+'],
  ['nth', '0']]
```

#### unknown

Node to store invalid (or unknown) parts of the style, that parser can extract and continue on.

```
// invalid

↓

['stylesheet',
  ['unknown', '// invalid']]
```

#### uri

URI.

```
@import url('/css/styles.css')

↓

['atrules',
  ['atkeyword',
    ['ident', 'import']],
  ['s', ' '],
  ['uri',
    ['string', ''/css/styles.css'']]]
```

#### value

Value of a property.

```
color: tomato

↓

['declaration',
  ['property',
    ['ident', 'color']],
  ['propertyDelim'],
  ['value',
    ['s', ' '],
    ['ident', 'tomato']]]
```

#### variable

Valid for less, scss and sass.

Sass:

```
$color

↓

['variable',
  ['ident', 'color']]
```

LESS:
```
@color
@@foo

↓

['variable',
  ['ident', 'color']]

['variable',
  ['variable',
    ['ident', 'foo']]]
```

#### variableslist

Valid for less, scss and sass.

Sass:
```
$arguments...

↓

['variableslist',
  ['variable',
    ['ident', 'arguments']]]
```

LESS:
```
@rest...

↓

['variableslist',
  ['variable',
    ['ident', 'rest']]]
```

#### vhash

Hexadecimal number in *value*.

```
.. { ..: #FFF }

↓

['vhash', 'FFF']
```
