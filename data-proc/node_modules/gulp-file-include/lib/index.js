'use strict'

const replaceOperator = require('./replace-operator')
const replaceFunction = require('./replace-function')
const replaceVariable = require('./replace-variable')
const concat = require('concat-stream')
const setIndent = require('./indent')
const through = require('through2')
const Vinyl = require('vinyl')
const PluginError = require('plugin-error')
const extend = require('extend')
const path = require('path')
const fs = require('fs')

module.exports = function(opts) {
  if (typeof opts === 'string') {
    opts = {prefix: opts}
  }

  opts = extend({}, {
    basepath: '@file',
    prefix: '@@',
    suffix: '',
    context: {},
    filters: false,
    indent: false
  }, opts)

  if (opts.basepath !== '@file') {
    opts.basepath = opts.basepath === '@root' ? process.cwd() : path.resolve(opts.basepath)
  }

  var customWebRoot = !!opts.context.webRoot

  function fileInclude(file, enc, cb) {
    if (!customWebRoot) {
      // built-in webRoot variable, example usage: <link rel=stylesheet href=@@webRoot/style.css>
      opts.context.webRoot =
        path.relative(path.dirname(file.path), file.base).replace(/\\/g, '/') || '.'
    }

    if (file.isNull()) {
      cb(null, file)
    } else if (file.isStream()) {
      file.contents.pipe(concat(function(data) {
        try {
          data = include(file, String(data))
          cb(null, data)
        } catch (e) {
          cb(new PluginError('gulp-file-include', e.message))
        }
      }))
    } else if (file.isBuffer()) {
      try {
        file = include(file, String(file.contents))
        cb(null, file)
      } catch (e) {
        cb(new PluginError('gulp-file-include', e.message))
      }
    }
  }

  return through.obj(fileInclude)

  /**
   * utils
   */
  function stripCommentedIncludes(content, opts) {
    // remove single line html comments that use the format: <!-- @@include() -->
    var regex = new RegExp('<!--(.*)' + opts.prefix + '[ ]*include([\\s\\S]*?)[ ]*' + opts.suffix + '-->', 'g')
    return content.replace(regex, '')
  }

  function include(file, text, data) {
    var filebase = opts.basepath === '@file' ? path.dirname(file.path) : opts.basepath
    var currentFilename = path.resolve(file.base, file.path)

    data = extend(true, {}, opts.context, data || {})
    data.content = text

    text = stripCommentedIncludes(text, opts)
    text = replaceOperator(text, {
      prefix: opts.prefix,
      suffix: opts.suffix,
      name: 'if',
      handler: conditionalHandler
    })
    text = replaceOperator(text, {
      prefix: opts.prefix,
      suffix: opts.suffix,
      name: 'for',
      handler: forHandler
    })
    text = replaceVariable(text, data, opts)
    text = replaceFunction(text, {
      prefix: opts.prefix,
      suffix: opts.suffix,
      name: 'include',
      handler: includeHandler
    })
    text = replaceFunction(text, {
      prefix: opts.prefix,
      suffix: opts.suffix,
      name: 'loop',
      handler: loopHandler
    })

    function conditionalHandler(inst) {
      try {
        var condition = new Function('var context = this; with (context) { return ' + inst.args + '; }').call(data) // eslint-disable-line
      } catch (error) {
        throw new Error(error.message + ': ' + inst.args)
      }

      return condition ? inst.body : ''
    }

    function forHandler(inst) {
      var forLoop = 'for' + inst.args + ' { result+=`' + inst.body + '`; }'
      var condition = 'var context = this; with (context) { var result=""; ' + forLoop + ' return result; }'
      try {
        var result = new Function(condition).call(data) // eslint-disable-line
      } catch (error) {
        throw new Error(error.message + ': ' + forLoop)
      }

      return result
    }

    function includeHandler(inst) {
      var args = /[^)"']*["']([^"']*)["'](,\s*({[\s\S]*})){0,1}\s*/.exec(inst.args)

      if (args) {
        var includePath = path.resolve(filebase, args[1])
        // for checking if we are not including the current file again
        if (currentFilename.toLowerCase() === includePath.toLowerCase()) {
          throw new Error('recursion detected in file: ' + currentFilename)
        }

        var includeContent = fs.readFileSync(includePath, 'utf-8')

        if (opts.indent) {
          includeContent = setIndent(inst.before, inst.before.length, includeContent)
        }

        // need to double each `$` to escape it in the `replace` function
        // includeContent = includeContent.replace(/\$/gi, '$$$$');

        // apply filters on include content
        if (typeof opts.filters === 'object') {
          includeContent = applyFilters(includeContent, args.input)
        }

        var recFile = new Vinyl({
          cwd: process.cwd(),
          base: file.base,
          path: includePath,
          contents: Buffer.from(includeContent)
        })

        recFile = include(recFile, includeContent, args[3] ? JSON.parse(args[3]) : {})

        return String(recFile.contents)
      }
    }

    function loopHandler(inst) {
      var args = /[^)"']*["']([^"']*)["'](,\s*([\s\S]*())){0,1}\s*/.exec(inst.args)
      var arr = []

      if (args) {
        // loop array in the json file
        if (args[3].match(/^('|")[^']|[^"]('|")$/)) {
          // clean filename var and define path
          var jsonfile = file.base + args[3].replace(/^('|")/, '').replace(/('|")$/, '')
          // check if json file exists
          if (fs.existsSync(jsonfile)) {
            arr = require(jsonfile)
          } else {
            return console.error('JSON file not exists:', jsonfile)
          }
        } else {
          // loop array in the function
          try {
            arr = JSON.parse(args[3])
          } catch (err) {
            return console.error(err, args[3])
          }
        }

        if (arr) {
          var includePath = path.resolve(filebase, args[1])
          // for checking if we are not including the current file again
          if (currentFilename.toLowerCase() === includePath.toLowerCase()) {
            throw new Error('recursion detected in file: ' + currentFilename)
          }

          var includeContent = fs.readFileSync(includePath, 'utf-8')

          if (opts.indent) {
            includeContent = setIndent(inst.before, inst.before.length, includeContent)
          }

          // apply filters on include content
          if (typeof opts.filters === 'object') {
            includeContent = applyFilters(includeContent, args.input)
          }

          var recFile = new Vinyl({
            cwd: process.cwd(),
            base: file.base,
            path: includePath,
            contents: Buffer.from(includeContent)
          })

          var contents = ''

          for (var i in arr) {
            if (arr.hasOwnProperty(i)) {
              var context = arr[i]
              recFile = include(recFile, includeContent, args[3] ? context : {})
              // why handler dont reconize underscore?
              // if (typeof context == 'object' && typeof context['_key'] == 'undefined') {
              //   context['_key'] = i;
              // }
              contents += String(recFile.contents)
            }
          }
        }
        return contents
      }
    }

    file.contents = Buffer.from(text)

    return file
  }

  function applyFilters(includeContent, match) {
    if (!match.match(/\)+$/)) {
      // nothing to filter return unchanged
      return includeContent
    }

    // now get the ordered list of filters
    var filterlist = match.split('(').slice(0, -1)
    filterlist = filterlist.map(function(str) {
      return opts.filters[str.trim()]
    })

    // compose them together into one function
    var filter = filterlist.reduce(compose)

    // check match for filter options object
    var options = match.match('{([^}]*)}')

    // and apply the composed function to the stringified content
    if (options) {
      options = JSON.parse(options[0])
      return filter(String(includeContent), options)
    } else {
      return filter(String(includeContent))
    }
  }
}

function compose(f, g) {
  return function(x) {
    return f(g(x))
  }
}
