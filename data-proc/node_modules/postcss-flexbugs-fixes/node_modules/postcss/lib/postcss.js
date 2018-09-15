'use strict';

exports.__esModule = true;

var _declaration = require('./declaration');

var _declaration2 = _interopRequireDefault(_declaration);

var _processor = require('./processor');

var _processor2 = _interopRequireDefault(_processor);

var _stringify = require('./stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _comment = require('./comment');

var _comment2 = _interopRequireDefault(_comment);

var _atRule = require('./at-rule');

var _atRule2 = _interopRequireDefault(_atRule);

var _vendor = require('./vendor');

var _vendor2 = _interopRequireDefault(_vendor);

var _parse = require('./parse');

var _parse2 = _interopRequireDefault(_parse);

var _list = require('./list');

var _list2 = _interopRequireDefault(_list);

var _rule = require('./rule');

var _rule2 = _interopRequireDefault(_rule);

var _root = require('./root');

var _root2 = _interopRequireDefault(_root);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a new {@link Processor} instance that will apply `plugins`
 * as CSS processors.
 *
 * @param {Array.<Plugin|pluginFunction>|Processor} plugins PostCSS plugins.
 *        See {@link Processor#use} for plugin format.
 *
 * @return {Processor} Processor to process multiple CSS.
 *
 * @example
 * import postcss from 'postcss'
 *
 * postcss(plugins).process(css, { from, to }).then(result => {
 *   console.log(result.css)
 * })
 *
 * @namespace postcss
 */
function postcss() {
  for (var _len = arguments.length, plugins = Array(_len), _key = 0; _key < _len; _key++) {
    plugins[_key] = arguments[_key];
  }

  if (plugins.length === 1 && Array.isArray(plugins[0])) {
    plugins = plugins[0];
  }
  return new _processor2.default(plugins);
}

/**
 * Creates a PostCSS plugin with a standard API.
 *
 * The newly-wrapped function will provide both the name and PostCSS
 * version of the plugin.
 *
 * ```js
 * const processor = postcss([replace])
 * processor.plugins[0].postcssPlugin  //=> 'postcss-replace'
 * processor.plugins[0].postcssVersion //=> '6.0.0'
 * ```
 *
 * The plugin function receives 2 arguments: {@link Root}
 * and {@link Result} instance. The function should mutate the provided
 * `Root` node. Alternatively, you can create a new `Root` node
 * and override the `result.root` property.
 *
 * ```js
 * const cleaner = postcss.plugin('postcss-cleaner', () => {
 *   return (root, result) => {
 *     result.root = postcss.root()
 *   }
 * })
 * ```
 *
 * As a convenience, plugins also expose a `process` method so that you can use
 * them as standalone tools.
 *
 * ```js
 * cleaner.process(css, processOpts, pluginOpts)
 * // This is equivalent to:
 * postcss([ cleaner(pluginOpts) ]).process(css, processOpts)
 * ```
 *
 * Asynchronous plugins should return a `Promise` instance.
 *
 * ```js
 * postcss.plugin('postcss-import', () => {
 *   return (root, result) => {
 *     return new Promise( (resolve, reject) => {
 *       fs.readFile('base.css', (base) => {
 *         root.prepend(base)
 *         resolve()
 *       })
 *     })
 *   }
 * })
 * ```
 *
 * Add warnings using the {@link Node#warn} method.
 * Send data to other plugins using the {@link Result#messages} array.
 *
 * ```js
 * postcss.plugin('postcss-caniuse-test', () => {
 *   return (root, result) => {
 *     root.walkDecls(decl => {
 *       if (!caniuse.support(decl.prop)) {
 *         decl.warn(result, 'Some browsers do not support ' + decl.prop)
 *       }
 *     })
 *   }
 * })
 * ```
 *
 * @param {string} name          PostCSS plugin name. Same as in `name`
 *                               property in `package.json`. It will be saved
 *                               in `plugin.postcssPlugin` property.
 * @param {function} initializer Will receive plugin options
 *                               and should return {@link pluginFunction}
 *
 * @return {Plugin} PostCSS plugin.
 */
postcss.plugin = function plugin(name, initializer) {
  function creator() {
    var transformer = initializer.apply(undefined, arguments);
    transformer.postcssPlugin = name;
    transformer.postcssVersion = new _processor2.default().version;
    return transformer;
  }

  var cache = void 0;
  Object.defineProperty(creator, 'postcss', {
    get: function get() {
      if (!cache) cache = creator();
      return cache;
    }
  });

  creator.process = function (css, processOpts, pluginOpts) {
    return postcss([creator(pluginOpts)]).process(css, processOpts);
  };

  return creator;
};

/**
 * Default function to convert a node tree into a CSS string.
 *
 * @param {Node} node       Start node for stringifing. Usually {@link Root}.
 * @param {builder} builder Function to concatenate CSS from node’s parts
 *                          or generate string and source map.
 *
 * @return {void}
 *
 * @function
 */
postcss.stringify = _stringify2.default;

/**
 * Parses source css and returns a new {@link Root} node,
 * which contains the source CSS nodes.
 *
 * @param {string|toString} css   String with input CSS or any object
 *                                with toString() method, like a Buffer
 * @param {processOptions} [opts] Options with only `from` and `map` keys.
 *
 * @return {Root} PostCSS AST.
 *
 * @example
 * // Simple CSS concatenation with source map support
 * const root1 = postcss.parse(css1, { from: file1 })
 * const root2 = postcss.parse(css2, { from: file2 })
 * root1.append(root2).toResult().css
 *
 * @function
 */
postcss.parse = _parse2.default;

/**
 * Contains the {@link vendor} module.
 *
 * @type {vendor}
 *
 * @example
 * postcss.vendor.unprefixed('-moz-tab') //=> ['tab']
 */
postcss.vendor = _vendor2.default;

/**
 * Contains the {@link list} module.
 *
 * @member {list}
 *
 * @example
 * postcss.list.space('5px calc(10% + 5px)') //=> ['5px', 'calc(10% + 5px)']
 */
postcss.list = _list2.default;

/**
 * Creates a new {@link Comment} node.
 *
 * @param {object} [defaults] Properties for the new node.
 *
 * @return {Comment} New comment node
 *
 * @example
 * postcss.comment({ text: 'test' })
 */
postcss.comment = function (defaults) {
  return new _comment2.default(defaults);
};

/**
 * Creates a new {@link AtRule} node.
 *
 * @param {object} [defaults] Properties for the new node.
 *
 * @return {AtRule} new at-rule node
 *
 * @example
 * postcss.atRule({ name: 'charset' }).toString() //=> "@charset"
 */
postcss.atRule = function (defaults) {
  return new _atRule2.default(defaults);
};

/**
 * Creates a new {@link Declaration} node.
 *
 * @param {object} [defaults] Properties for the new node.
 *
 * @return {Declaration} new declaration node
 *
 * @example
 * postcss.decl({ prop: 'color', value: 'red' }).toString() //=> "color: red"
 */
postcss.decl = function (defaults) {
  return new _declaration2.default(defaults);
};

/**
 * Creates a new {@link Rule} node.
 *
 * @param {object} [defaults] Properties for the new node.
 *
 * @return {Rule} new rule node
 *
 * @example
 * postcss.rule({ selector: 'a' }).toString() //=> "a {\n}"
 */
postcss.rule = function (defaults) {
  return new _rule2.default(defaults);
};

/**
 * Creates a new {@link Root} node.
 *
 * @param {object} [defaults] Properties for the new node.
 *
 * @return {Root} new root node.
 *
 * @example
 * postcss.root({ after: '\n' }).toString() //=> "\n"
 */
postcss.root = function (defaults) {
  return new _root2.default(defaults);
};

exports.default = postcss;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBvc3Rjc3MuZXM2Il0sIm5hbWVzIjpbInBvc3Rjc3MiLCJwbHVnaW5zIiwibGVuZ3RoIiwiQXJyYXkiLCJpc0FycmF5IiwiUHJvY2Vzc29yIiwicGx1Z2luIiwibmFtZSIsImluaXRpYWxpemVyIiwiY3JlYXRvciIsInRyYW5zZm9ybWVyIiwicG9zdGNzc1BsdWdpbiIsInBvc3Rjc3NWZXJzaW9uIiwidmVyc2lvbiIsImNhY2hlIiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJnZXQiLCJwcm9jZXNzIiwiY3NzIiwicHJvY2Vzc09wdHMiLCJwbHVnaW5PcHRzIiwic3RyaW5naWZ5IiwicGFyc2UiLCJ2ZW5kb3IiLCJsaXN0IiwiY29tbWVudCIsIkNvbW1lbnQiLCJkZWZhdWx0cyIsImF0UnVsZSIsIkF0UnVsZSIsImRlY2wiLCJEZWNsYXJhdGlvbiIsInJ1bGUiLCJSdWxlIiwicm9vdCIsIlJvb3QiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7O0FBRUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQSxTQUFTQSxPQUFULEdBQThCO0FBQUEsb0NBQVRDLE9BQVM7QUFBVEEsV0FBUztBQUFBOztBQUM1QixNQUFJQSxRQUFRQyxNQUFSLEtBQW1CLENBQW5CLElBQXdCQyxNQUFNQyxPQUFOLENBQWNILFFBQVEsQ0FBUixDQUFkLENBQTVCLEVBQXVEO0FBQ3JEQSxjQUFVQSxRQUFRLENBQVIsQ0FBVjtBQUNEO0FBQ0QsU0FBTyxJQUFJSSxtQkFBSixDQUFjSixPQUFkLENBQVA7QUFDRDs7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBd0VBRCxRQUFRTSxNQUFSLEdBQWlCLFNBQVNBLE1BQVQsQ0FBaUJDLElBQWpCLEVBQXVCQyxXQUF2QixFQUFvQztBQUNuRCxXQUFTQyxPQUFULEdBQTJCO0FBQ3pCLFFBQUlDLGNBQWNGLHVDQUFsQjtBQUNBRSxnQkFBWUMsYUFBWixHQUE0QkosSUFBNUI7QUFDQUcsZ0JBQVlFLGNBQVosR0FBOEIsSUFBSVAsbUJBQUosRUFBRCxDQUFrQlEsT0FBL0M7QUFDQSxXQUFPSCxXQUFQO0FBQ0Q7O0FBRUQsTUFBSUksY0FBSjtBQUNBQyxTQUFPQyxjQUFQLENBQXNCUCxPQUF0QixFQUErQixTQUEvQixFQUEwQztBQUN4Q1EsT0FEd0MsaUJBQ2pDO0FBQ0wsVUFBSSxDQUFDSCxLQUFMLEVBQVlBLFFBQVFMLFNBQVI7QUFDWixhQUFPSyxLQUFQO0FBQ0Q7QUFKdUMsR0FBMUM7O0FBT0FMLFVBQVFTLE9BQVIsR0FBa0IsVUFBVUMsR0FBVixFQUFlQyxXQUFmLEVBQTRCQyxVQUE1QixFQUF3QztBQUN4RCxXQUFPckIsUUFBUSxDQUFDUyxRQUFRWSxVQUFSLENBQUQsQ0FBUixFQUErQkgsT0FBL0IsQ0FBdUNDLEdBQXZDLEVBQTRDQyxXQUE1QyxDQUFQO0FBQ0QsR0FGRDs7QUFJQSxTQUFPWCxPQUFQO0FBQ0QsQ0FyQkQ7O0FBdUJBOzs7Ozs7Ozs7OztBQVdBVCxRQUFRc0IsU0FBUixHQUFvQkEsbUJBQXBCOztBQUVBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkF0QixRQUFRdUIsS0FBUixHQUFnQkEsZUFBaEI7O0FBRUE7Ozs7Ozs7O0FBUUF2QixRQUFRd0IsTUFBUixHQUFpQkEsZ0JBQWpCOztBQUVBOzs7Ozs7OztBQVFBeEIsUUFBUXlCLElBQVIsR0FBZUEsY0FBZjs7QUFFQTs7Ozs7Ozs7OztBQVVBekIsUUFBUTBCLE9BQVIsR0FBa0I7QUFBQSxTQUFZLElBQUlDLGlCQUFKLENBQVlDLFFBQVosQ0FBWjtBQUFBLENBQWxCOztBQUVBOzs7Ozs7Ozs7O0FBVUE1QixRQUFRNkIsTUFBUixHQUFpQjtBQUFBLFNBQVksSUFBSUMsZ0JBQUosQ0FBV0YsUUFBWCxDQUFaO0FBQUEsQ0FBakI7O0FBRUE7Ozs7Ozs7Ozs7QUFVQTVCLFFBQVErQixJQUFSLEdBQWU7QUFBQSxTQUFZLElBQUlDLHFCQUFKLENBQWdCSixRQUFoQixDQUFaO0FBQUEsQ0FBZjs7QUFFQTs7Ozs7Ozs7OztBQVVBNUIsUUFBUWlDLElBQVIsR0FBZTtBQUFBLFNBQVksSUFBSUMsY0FBSixDQUFTTixRQUFULENBQVo7QUFBQSxDQUFmOztBQUVBOzs7Ozs7Ozs7O0FBVUE1QixRQUFRbUMsSUFBUixHQUFlO0FBQUEsU0FBWSxJQUFJQyxjQUFKLENBQVNSLFFBQVQsQ0FBWjtBQUFBLENBQWY7O2tCQUVlNUIsTyIsImZpbGUiOiJwb3N0Y3NzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IERlY2xhcmF0aW9uIGZyb20gJy4vZGVjbGFyYXRpb24nXG5pbXBvcnQgUHJvY2Vzc29yIGZyb20gJy4vcHJvY2Vzc29yJ1xuaW1wb3J0IHN0cmluZ2lmeSBmcm9tICcuL3N0cmluZ2lmeSdcbmltcG9ydCBDb21tZW50IGZyb20gJy4vY29tbWVudCdcbmltcG9ydCBBdFJ1bGUgZnJvbSAnLi9hdC1ydWxlJ1xuaW1wb3J0IHZlbmRvciBmcm9tICcuL3ZlbmRvcidcbmltcG9ydCBwYXJzZSBmcm9tICcuL3BhcnNlJ1xuaW1wb3J0IGxpc3QgZnJvbSAnLi9saXN0J1xuaW1wb3J0IFJ1bGUgZnJvbSAnLi9ydWxlJ1xuaW1wb3J0IFJvb3QgZnJvbSAnLi9yb290J1xuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyB7QGxpbmsgUHJvY2Vzc29yfSBpbnN0YW5jZSB0aGF0IHdpbGwgYXBwbHkgYHBsdWdpbnNgXG4gKiBhcyBDU1MgcHJvY2Vzc29ycy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5LjxQbHVnaW58cGx1Z2luRnVuY3Rpb24+fFByb2Nlc3Nvcn0gcGx1Z2lucyBQb3N0Q1NTIHBsdWdpbnMuXG4gKiAgICAgICAgU2VlIHtAbGluayBQcm9jZXNzb3IjdXNlfSBmb3IgcGx1Z2luIGZvcm1hdC5cbiAqXG4gKiBAcmV0dXJuIHtQcm9jZXNzb3J9IFByb2Nlc3NvciB0byBwcm9jZXNzIG11bHRpcGxlIENTUy5cbiAqXG4gKiBAZXhhbXBsZVxuICogaW1wb3J0IHBvc3Rjc3MgZnJvbSAncG9zdGNzcydcbiAqXG4gKiBwb3N0Y3NzKHBsdWdpbnMpLnByb2Nlc3MoY3NzLCB7IGZyb20sIHRvIH0pLnRoZW4ocmVzdWx0ID0+IHtcbiAqICAgY29uc29sZS5sb2cocmVzdWx0LmNzcylcbiAqIH0pXG4gKlxuICogQG5hbWVzcGFjZSBwb3N0Y3NzXG4gKi9cbmZ1bmN0aW9uIHBvc3Rjc3MgKC4uLnBsdWdpbnMpIHtcbiAgaWYgKHBsdWdpbnMubGVuZ3RoID09PSAxICYmIEFycmF5LmlzQXJyYXkocGx1Z2luc1swXSkpIHtcbiAgICBwbHVnaW5zID0gcGx1Z2luc1swXVxuICB9XG4gIHJldHVybiBuZXcgUHJvY2Vzc29yKHBsdWdpbnMpXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIFBvc3RDU1MgcGx1Z2luIHdpdGggYSBzdGFuZGFyZCBBUEkuXG4gKlxuICogVGhlIG5ld2x5LXdyYXBwZWQgZnVuY3Rpb24gd2lsbCBwcm92aWRlIGJvdGggdGhlIG5hbWUgYW5kIFBvc3RDU1NcbiAqIHZlcnNpb24gb2YgdGhlIHBsdWdpbi5cbiAqXG4gKiBgYGBqc1xuICogY29uc3QgcHJvY2Vzc29yID0gcG9zdGNzcyhbcmVwbGFjZV0pXG4gKiBwcm9jZXNzb3IucGx1Z2luc1swXS5wb3N0Y3NzUGx1Z2luICAvLz0+ICdwb3N0Y3NzLXJlcGxhY2UnXG4gKiBwcm9jZXNzb3IucGx1Z2luc1swXS5wb3N0Y3NzVmVyc2lvbiAvLz0+ICc2LjAuMCdcbiAqIGBgYFxuICpcbiAqIFRoZSBwbHVnaW4gZnVuY3Rpb24gcmVjZWl2ZXMgMiBhcmd1bWVudHM6IHtAbGluayBSb290fVxuICogYW5kIHtAbGluayBSZXN1bHR9IGluc3RhbmNlLiBUaGUgZnVuY3Rpb24gc2hvdWxkIG11dGF0ZSB0aGUgcHJvdmlkZWRcbiAqIGBSb290YCBub2RlLiBBbHRlcm5hdGl2ZWx5LCB5b3UgY2FuIGNyZWF0ZSBhIG5ldyBgUm9vdGAgbm9kZVxuICogYW5kIG92ZXJyaWRlIHRoZSBgcmVzdWx0LnJvb3RgIHByb3BlcnR5LlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBjbGVhbmVyID0gcG9zdGNzcy5wbHVnaW4oJ3Bvc3Rjc3MtY2xlYW5lcicsICgpID0+IHtcbiAqICAgcmV0dXJuIChyb290LCByZXN1bHQpID0+IHtcbiAqICAgICByZXN1bHQucm9vdCA9IHBvc3Rjc3Mucm9vdCgpXG4gKiAgIH1cbiAqIH0pXG4gKiBgYGBcbiAqXG4gKiBBcyBhIGNvbnZlbmllbmNlLCBwbHVnaW5zIGFsc28gZXhwb3NlIGEgYHByb2Nlc3NgIG1ldGhvZCBzbyB0aGF0IHlvdSBjYW4gdXNlXG4gKiB0aGVtIGFzIHN0YW5kYWxvbmUgdG9vbHMuXG4gKlxuICogYGBganNcbiAqIGNsZWFuZXIucHJvY2Vzcyhjc3MsIHByb2Nlc3NPcHRzLCBwbHVnaW5PcHRzKVxuICogLy8gVGhpcyBpcyBlcXVpdmFsZW50IHRvOlxuICogcG9zdGNzcyhbIGNsZWFuZXIocGx1Z2luT3B0cykgXSkucHJvY2Vzcyhjc3MsIHByb2Nlc3NPcHRzKVxuICogYGBgXG4gKlxuICogQXN5bmNocm9ub3VzIHBsdWdpbnMgc2hvdWxkIHJldHVybiBhIGBQcm9taXNlYCBpbnN0YW5jZS5cbiAqXG4gKiBgYGBqc1xuICogcG9zdGNzcy5wbHVnaW4oJ3Bvc3Rjc3MtaW1wb3J0JywgKCkgPT4ge1xuICogICByZXR1cm4gKHJvb3QsIHJlc3VsdCkgPT4ge1xuICogICAgIHJldHVybiBuZXcgUHJvbWlzZSggKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICogICAgICAgZnMucmVhZEZpbGUoJ2Jhc2UuY3NzJywgKGJhc2UpID0+IHtcbiAqICAgICAgICAgcm9vdC5wcmVwZW5kKGJhc2UpXG4gKiAgICAgICAgIHJlc29sdmUoKVxuICogICAgICAgfSlcbiAqICAgICB9KVxuICogICB9XG4gKiB9KVxuICogYGBgXG4gKlxuICogQWRkIHdhcm5pbmdzIHVzaW5nIHRoZSB7QGxpbmsgTm9kZSN3YXJufSBtZXRob2QuXG4gKiBTZW5kIGRhdGEgdG8gb3RoZXIgcGx1Z2lucyB1c2luZyB0aGUge0BsaW5rIFJlc3VsdCNtZXNzYWdlc30gYXJyYXkuXG4gKlxuICogYGBganNcbiAqIHBvc3Rjc3MucGx1Z2luKCdwb3N0Y3NzLWNhbml1c2UtdGVzdCcsICgpID0+IHtcbiAqICAgcmV0dXJuIChyb290LCByZXN1bHQpID0+IHtcbiAqICAgICByb290LndhbGtEZWNscyhkZWNsID0+IHtcbiAqICAgICAgIGlmICghY2FuaXVzZS5zdXBwb3J0KGRlY2wucHJvcCkpIHtcbiAqICAgICAgICAgZGVjbC53YXJuKHJlc3VsdCwgJ1NvbWUgYnJvd3NlcnMgZG8gbm90IHN1cHBvcnQgJyArIGRlY2wucHJvcClcbiAqICAgICAgIH1cbiAqICAgICB9KVxuICogICB9XG4gKiB9KVxuICogYGBgXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgICAgICAgICAgUG9zdENTUyBwbHVnaW4gbmFtZS4gU2FtZSBhcyBpbiBgbmFtZWBcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5IGluIGBwYWNrYWdlLmpzb25gLiBJdCB3aWxsIGJlIHNhdmVkXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbiBgcGx1Z2luLnBvc3Rjc3NQbHVnaW5gIHByb3BlcnR5LlxuICogQHBhcmFtIHtmdW5jdGlvbn0gaW5pdGlhbGl6ZXIgV2lsbCByZWNlaXZlIHBsdWdpbiBvcHRpb25zXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmQgc2hvdWxkIHJldHVybiB7QGxpbmsgcGx1Z2luRnVuY3Rpb259XG4gKlxuICogQHJldHVybiB7UGx1Z2lufSBQb3N0Q1NTIHBsdWdpbi5cbiAqL1xucG9zdGNzcy5wbHVnaW4gPSBmdW5jdGlvbiBwbHVnaW4gKG5hbWUsIGluaXRpYWxpemVyKSB7XG4gIGZ1bmN0aW9uIGNyZWF0b3IgKC4uLmFyZ3MpIHtcbiAgICBsZXQgdHJhbnNmb3JtZXIgPSBpbml0aWFsaXplciguLi5hcmdzKVxuICAgIHRyYW5zZm9ybWVyLnBvc3Rjc3NQbHVnaW4gPSBuYW1lXG4gICAgdHJhbnNmb3JtZXIucG9zdGNzc1ZlcnNpb24gPSAobmV3IFByb2Nlc3NvcigpKS52ZXJzaW9uXG4gICAgcmV0dXJuIHRyYW5zZm9ybWVyXG4gIH1cblxuICBsZXQgY2FjaGVcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNyZWF0b3IsICdwb3N0Y3NzJywge1xuICAgIGdldCAoKSB7XG4gICAgICBpZiAoIWNhY2hlKSBjYWNoZSA9IGNyZWF0b3IoKVxuICAgICAgcmV0dXJuIGNhY2hlXG4gICAgfVxuICB9KVxuXG4gIGNyZWF0b3IucHJvY2VzcyA9IGZ1bmN0aW9uIChjc3MsIHByb2Nlc3NPcHRzLCBwbHVnaW5PcHRzKSB7XG4gICAgcmV0dXJuIHBvc3Rjc3MoW2NyZWF0b3IocGx1Z2luT3B0cyldKS5wcm9jZXNzKGNzcywgcHJvY2Vzc09wdHMpXG4gIH1cblxuICByZXR1cm4gY3JlYXRvclxufVxuXG4vKipcbiAqIERlZmF1bHQgZnVuY3Rpb24gdG8gY29udmVydCBhIG5vZGUgdHJlZSBpbnRvIGEgQ1NTIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgICAgICAgU3RhcnQgbm9kZSBmb3Igc3RyaW5naWZpbmcuIFVzdWFsbHkge0BsaW5rIFJvb3R9LlxuICogQHBhcmFtIHtidWlsZGVyfSBidWlsZGVyIEZ1bmN0aW9uIHRvIGNvbmNhdGVuYXRlIENTUyBmcm9tIG5vZGXigJlzIHBhcnRzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgb3IgZ2VuZXJhdGUgc3RyaW5nIGFuZCBzb3VyY2UgbWFwLlxuICpcbiAqIEByZXR1cm4ge3ZvaWR9XG4gKlxuICogQGZ1bmN0aW9uXG4gKi9cbnBvc3Rjc3Muc3RyaW5naWZ5ID0gc3RyaW5naWZ5XG5cbi8qKlxuICogUGFyc2VzIHNvdXJjZSBjc3MgYW5kIHJldHVybnMgYSBuZXcge0BsaW5rIFJvb3R9IG5vZGUsXG4gKiB3aGljaCBjb250YWlucyB0aGUgc291cmNlIENTUyBub2Rlcy5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ3x0b1N0cmluZ30gY3NzICAgU3RyaW5nIHdpdGggaW5wdXQgQ1NTIG9yIGFueSBvYmplY3RcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aXRoIHRvU3RyaW5nKCkgbWV0aG9kLCBsaWtlIGEgQnVmZmVyXG4gKiBAcGFyYW0ge3Byb2Nlc3NPcHRpb25zfSBbb3B0c10gT3B0aW9ucyB3aXRoIG9ubHkgYGZyb21gIGFuZCBgbWFwYCBrZXlzLlxuICpcbiAqIEByZXR1cm4ge1Jvb3R9IFBvc3RDU1MgQVNULlxuICpcbiAqIEBleGFtcGxlXG4gKiAvLyBTaW1wbGUgQ1NTIGNvbmNhdGVuYXRpb24gd2l0aCBzb3VyY2UgbWFwIHN1cHBvcnRcbiAqIGNvbnN0IHJvb3QxID0gcG9zdGNzcy5wYXJzZShjc3MxLCB7IGZyb206IGZpbGUxIH0pXG4gKiBjb25zdCByb290MiA9IHBvc3Rjc3MucGFyc2UoY3NzMiwgeyBmcm9tOiBmaWxlMiB9KVxuICogcm9vdDEuYXBwZW5kKHJvb3QyKS50b1Jlc3VsdCgpLmNzc1xuICpcbiAqIEBmdW5jdGlvblxuICovXG5wb3N0Y3NzLnBhcnNlID0gcGFyc2VcblxuLyoqXG4gKiBDb250YWlucyB0aGUge0BsaW5rIHZlbmRvcn0gbW9kdWxlLlxuICpcbiAqIEB0eXBlIHt2ZW5kb3J9XG4gKlxuICogQGV4YW1wbGVcbiAqIHBvc3Rjc3MudmVuZG9yLnVucHJlZml4ZWQoJy1tb3otdGFiJykgLy89PiBbJ3RhYiddXG4gKi9cbnBvc3Rjc3MudmVuZG9yID0gdmVuZG9yXG5cbi8qKlxuICogQ29udGFpbnMgdGhlIHtAbGluayBsaXN0fSBtb2R1bGUuXG4gKlxuICogQG1lbWJlciB7bGlzdH1cbiAqXG4gKiBAZXhhbXBsZVxuICogcG9zdGNzcy5saXN0LnNwYWNlKCc1cHggY2FsYygxMCUgKyA1cHgpJykgLy89PiBbJzVweCcsICdjYWxjKDEwJSArIDVweCknXVxuICovXG5wb3N0Y3NzLmxpc3QgPSBsaXN0XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyB7QGxpbmsgQ29tbWVudH0gbm9kZS5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gW2RlZmF1bHRzXSBQcm9wZXJ0aWVzIGZvciB0aGUgbmV3IG5vZGUuXG4gKlxuICogQHJldHVybiB7Q29tbWVudH0gTmV3IGNvbW1lbnQgbm9kZVxuICpcbiAqIEBleGFtcGxlXG4gKiBwb3N0Y3NzLmNvbW1lbnQoeyB0ZXh0OiAndGVzdCcgfSlcbiAqL1xucG9zdGNzcy5jb21tZW50ID0gZGVmYXVsdHMgPT4gbmV3IENvbW1lbnQoZGVmYXVsdHMpXG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyB7QGxpbmsgQXRSdWxlfSBub2RlLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBbZGVmYXVsdHNdIFByb3BlcnRpZXMgZm9yIHRoZSBuZXcgbm9kZS5cbiAqXG4gKiBAcmV0dXJuIHtBdFJ1bGV9IG5ldyBhdC1ydWxlIG5vZGVcbiAqXG4gKiBAZXhhbXBsZVxuICogcG9zdGNzcy5hdFJ1bGUoeyBuYW1lOiAnY2hhcnNldCcgfSkudG9TdHJpbmcoKSAvLz0+IFwiQGNoYXJzZXRcIlxuICovXG5wb3N0Y3NzLmF0UnVsZSA9IGRlZmF1bHRzID0+IG5ldyBBdFJ1bGUoZGVmYXVsdHMpXG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyB7QGxpbmsgRGVjbGFyYXRpb259IG5vZGUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IFtkZWZhdWx0c10gUHJvcGVydGllcyBmb3IgdGhlIG5ldyBub2RlLlxuICpcbiAqIEByZXR1cm4ge0RlY2xhcmF0aW9ufSBuZXcgZGVjbGFyYXRpb24gbm9kZVxuICpcbiAqIEBleGFtcGxlXG4gKiBwb3N0Y3NzLmRlY2woeyBwcm9wOiAnY29sb3InLCB2YWx1ZTogJ3JlZCcgfSkudG9TdHJpbmcoKSAvLz0+IFwiY29sb3I6IHJlZFwiXG4gKi9cbnBvc3Rjc3MuZGVjbCA9IGRlZmF1bHRzID0+IG5ldyBEZWNsYXJhdGlvbihkZWZhdWx0cylcblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IHtAbGluayBSdWxlfSBub2RlLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBbZGVmYXVsdHNdIFByb3BlcnRpZXMgZm9yIHRoZSBuZXcgbm9kZS5cbiAqXG4gKiBAcmV0dXJuIHtSdWxlfSBuZXcgcnVsZSBub2RlXG4gKlxuICogQGV4YW1wbGVcbiAqIHBvc3Rjc3MucnVsZSh7IHNlbGVjdG9yOiAnYScgfSkudG9TdHJpbmcoKSAvLz0+IFwiYSB7XFxufVwiXG4gKi9cbnBvc3Rjc3MucnVsZSA9IGRlZmF1bHRzID0+IG5ldyBSdWxlKGRlZmF1bHRzKVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcge0BsaW5rIFJvb3R9IG5vZGUuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IFtkZWZhdWx0c10gUHJvcGVydGllcyBmb3IgdGhlIG5ldyBub2RlLlxuICpcbiAqIEByZXR1cm4ge1Jvb3R9IG5ldyByb290IG5vZGUuXG4gKlxuICogQGV4YW1wbGVcbiAqIHBvc3Rjc3Mucm9vdCh7IGFmdGVyOiAnXFxuJyB9KS50b1N0cmluZygpIC8vPT4gXCJcXG5cIlxuICovXG5wb3N0Y3NzLnJvb3QgPSBkZWZhdWx0cyA9PiBuZXcgUm9vdChkZWZhdWx0cylcblxuZXhwb3J0IGRlZmF1bHQgcG9zdGNzc1xuIl19
