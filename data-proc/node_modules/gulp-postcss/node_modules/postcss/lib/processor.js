'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _lazyResult = require('./lazy-result');

var _lazyResult2 = _interopRequireDefault(_lazyResult);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Contains plugins to process CSS. Create one `Processor` instance,
 * initialize its plugins, and then use that instance on numerous CSS files.
 *
 * @example
 * const processor = postcss([autoprefixer, precss])
 * processor.process(css1).then(result => console.log(result.css))
 * processor.process(css2).then(result => console.log(result.css))
 */
var Processor = function () {
  /**
   * @param {Array.<Plugin|pluginFunction>|Processor} plugins PostCSS plugins.
   *        See {@link Processor#use} for plugin format.
   */
  function Processor() {
    var plugins = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

    _classCallCheck(this, Processor);

    /**
     * Current PostCSS version.
     *
     * @type {string}
     *
     * @example
     * if (result.processor.version.split('.')[0] !== '6') {
     *   throw new Error('This plugin works only with PostCSS 6')
     * }
     */
    this.version = '7.0.2';
    /**
     * Plugins added to this processor.
     *
     * @type {pluginFunction[]}
     *
     * @example
     * const processor = postcss([autoprefixer, precss])
     * processor.plugins.length //=> 2
     */
    this.plugins = this.normalize(plugins);
  }

  /**
   * Adds a plugin to be used as a CSS processor.
   *
   * PostCSS plugin can be in 4 formats:
   * * A plugin created by {@link postcss.plugin} method.
   * * A function. PostCSS will pass the function a @{link Root}
   *   as the first argument and current {@link Result} instance
   *   as the second.
   * * An object with a `postcss` method. PostCSS will use that method
   *   as described in #2.
   * * Another {@link Processor} instance. PostCSS will copy plugins
   *   from that instance into this one.
   *
   * Plugins can also be added by passing them as arguments when creating
   * a `postcss` instance (see [`postcss(plugins)`]).
   *
   * Asynchronous plugins should return a `Promise` instance.
   *
   * @param {Plugin|pluginFunction|Processor} plugin PostCSS plugin
   *                                                 or {@link Processor}
   *                                                 with plugins.
   *
   * @example
   * const processor = postcss()
   *   .use(autoprefixer)
   *   .use(precss)
   *
   * @return {Processes} Current processor to make methods chain.
   */


  Processor.prototype.use = function use(plugin) {
    this.plugins = this.plugins.concat(this.normalize([plugin]));
    return this;
  };

  /**
   * Parses source CSS and returns a {@link LazyResult} Promise proxy.
   * Because some plugins can be asynchronous it doesn’t make
   * any transformations. Transformations will be applied
   * in the {@link LazyResult} methods.
   *
   * @param {string|toString|Result} css String with input CSS or any object
   *                                     with a `toString()` method,
   *                                     like a Buffer. Optionally, send
   *                                     a {@link Result} instance
   *                                     and the processor will take
   *                                     the {@link Root} from it.
   * @param {processOptions} [opts]      Options.
   *
   * @return {LazyResult} Promise proxy.
   *
   * @example
   * processor.process(css, { from: 'a.css', to: 'a.out.css' })
   *   .then(result => {
   *      console.log(result.css)
   *   })
   */


  Processor.prototype.process = function (_process) {
    function process(_x) {
      return _process.apply(this, arguments);
    }

    process.toString = function () {
      return _process.toString();
    };

    return process;
  }(function (css) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if (this.plugins.length === 0 && opts.parser === opts.stringifier) {
      if (process.env.NODE_ENV !== 'production') {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('You did not set any plugins, parser, or stringifier. ' + 'Right now PostCSS do nothing. Pick plugins for your case ' + 'on https://www.postcss.parts/ and use them in postcss.config.js.');
        }
      }
    }
    return new _lazyResult2.default(this, css, opts);
  });

  Processor.prototype.normalize = function normalize(plugins) {
    var normalized = [];
    for (var _iterator = plugins, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref = _i.value;
      }

      var i = _ref;

      if (i.postcss) i = i.postcss;

      if ((typeof i === 'undefined' ? 'undefined' : _typeof(i)) === 'object' && Array.isArray(i.plugins)) {
        normalized = normalized.concat(i.plugins);
      } else if (typeof i === 'function') {
        normalized.push(i);
      } else if ((typeof i === 'undefined' ? 'undefined' : _typeof(i)) === 'object' && (i.parse || i.stringify)) {
        if (process.env.NODE_ENV !== 'production') {
          throw new Error('PostCSS syntaxes cannot be used as plugins. Instead, please use ' + 'one of the syntax/parser/stringifier options as outlined ' + 'in your PostCSS runner documentation.');
        }
      } else {
        throw new Error(i + ' is not a PostCSS plugin');
      }
    }
    return normalized;
  };

  return Processor;
}();

exports.default = Processor;

/**
 * @callback builder
 * @param {string} part          Part of generated CSS connected to this node.
 * @param {Node}   node          AST node.
 * @param {"start"|"end"} [type] Node’s part type.
 */

/**
 * @callback parser
 *
 * @param {string|toString} css   String with input CSS or any object
 *                                with toString() method, like a Buffer.
 * @param {processOptions} [opts] Options with only `from` and `map` keys.
 *
 * @return {Root} PostCSS AST
 */

/**
 * @callback stringifier
 *
 * @param {Node} node       Start node for stringifing. Usually {@link Root}.
 * @param {builder} builder Function to concatenate CSS from node’s parts
 *                          or generate string and source map.
 *
 * @return {void}
 */

/**
 * @typedef {object} syntax
 * @property {parser} parse          Function to generate AST by string.
 * @property {stringifier} stringify Function to generate string by AST.
 */

/**
 * @typedef {object} toString
 * @property {function} toString
 */

/**
 * @callback pluginFunction
 * @param {Root} root     Parsed input CSS.
 * @param {Result} result Result to set warnings or check other plugins.
 */

/**
 * @typedef {object} Plugin
 * @property {function} postcss PostCSS plugin function.
 */

/**
 * @typedef {object} processOptions
 * @property {string} from             The path of the CSS source file.
 *                                     You should always set `from`,
 *                                     because it is used in source map
 *                                     generation and syntax error messages.
 * @property {string} to               The path where you’ll put the output
 *                                     CSS file. You should always set `to`
 *                                     to generate correct source maps.
 * @property {parser} parser           Function to generate AST by string.
 * @property {stringifier} stringifier Class to generate string by AST.
 * @property {syntax} syntax           Object with `parse` and `stringify`.
 * @property {object} map              Source map options.
 * @property {boolean} map.inline                    Does source map should
 *                                                   be embedded in the output
 *                                                   CSS as a base64-encoded
 *                                                   comment.
 * @property {string|object|false|function} map.prev Source map content
 *                                                   from a previous
 *                                                   processing step
 *                                                   (for example, Sass).
 *                                                   PostCSS will try to find
 *                                                   previous map automatically,
 *                                                   so you could disable it by
 *                                                   `false` value.
 * @property {boolean} map.sourcesContent            Does PostCSS should set
 *                                                   the origin content to map.
 * @property {string|false} map.annotation           Does PostCSS should set
 *                                                   annotation comment to map.
 * @property {string} map.from                       Override `from` in map’s
 *                                                   sources`.
 */

module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInByb2Nlc3Nvci5lczYiXSwibmFtZXMiOlsiUHJvY2Vzc29yIiwicGx1Z2lucyIsInZlcnNpb24iLCJub3JtYWxpemUiLCJ1c2UiLCJwbHVnaW4iLCJjb25jYXQiLCJwcm9jZXNzIiwiY3NzIiwib3B0cyIsImxlbmd0aCIsInBhcnNlciIsInN0cmluZ2lmaWVyIiwiZW52IiwiTk9ERV9FTlYiLCJjb25zb2xlIiwid2FybiIsIkxhenlSZXN1bHQiLCJub3JtYWxpemVkIiwiaSIsInBvc3Rjc3MiLCJBcnJheSIsImlzQXJyYXkiLCJwdXNoIiwicGFyc2UiLCJzdHJpbmdpZnkiLCJFcnJvciJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7Ozs7O0FBRUE7Ozs7Ozs7OztJQVNNQSxTO0FBQ0o7Ozs7QUFJQSx1QkFBMkI7QUFBQSxRQUFkQyxPQUFjLHVFQUFKLEVBQUk7O0FBQUE7O0FBQ3pCOzs7Ozs7Ozs7O0FBVUEsU0FBS0MsT0FBTCxHQUFlLE9BQWY7QUFDQTs7Ozs7Ozs7O0FBU0EsU0FBS0QsT0FBTCxHQUFlLEtBQUtFLFNBQUwsQ0FBZUYsT0FBZixDQUFmO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7c0JBNkJBRyxHLGdCQUFLQyxNLEVBQVE7QUFDWCxTQUFLSixPQUFMLEdBQWUsS0FBS0EsT0FBTCxDQUFhSyxNQUFiLENBQW9CLEtBQUtILFNBQUwsQ0FBZSxDQUFDRSxNQUFELENBQWYsQ0FBcEIsQ0FBZjtBQUNBLFdBQU8sSUFBUDtBQUNELEc7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztzQkFzQkFFLE87Ozs7Ozs7Ozs7Y0FBU0MsRyxFQUFpQjtBQUFBLFFBQVpDLElBQVksdUVBQUwsRUFBSzs7QUFDeEIsUUFBSSxLQUFLUixPQUFMLENBQWFTLE1BQWIsS0FBd0IsQ0FBeEIsSUFBNkJELEtBQUtFLE1BQUwsS0FBZ0JGLEtBQUtHLFdBQXRELEVBQW1FO0FBQ2pFLFVBQUlMLFFBQVFNLEdBQVIsQ0FBWUMsUUFBWixLQUF5QixZQUE3QixFQUEyQztBQUN6QyxZQUFJLE9BQU9DLE9BQVAsS0FBbUIsV0FBbkIsSUFBa0NBLFFBQVFDLElBQTlDLEVBQW9EO0FBQ2xERCxrQkFBUUMsSUFBUixDQUNFLDBEQUNBLDJEQURBLEdBRUEsa0VBSEY7QUFLRDtBQUNGO0FBQ0Y7QUFDRCxXQUFPLElBQUlDLG9CQUFKLENBQWUsSUFBZixFQUFxQlQsR0FBckIsRUFBMEJDLElBQTFCLENBQVA7QUFDRCxHOztzQkFFRE4sUyxzQkFBV0YsTyxFQUFTO0FBQ2xCLFFBQUlpQixhQUFhLEVBQWpCO0FBQ0EseUJBQWNqQixPQUFkLGtIQUF1QjtBQUFBOztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBQUEsVUFBZGtCLENBQWM7O0FBQ3JCLFVBQUlBLEVBQUVDLE9BQU4sRUFBZUQsSUFBSUEsRUFBRUMsT0FBTjs7QUFFZixVQUFJLFFBQU9ELENBQVAseUNBQU9BLENBQVAsT0FBYSxRQUFiLElBQXlCRSxNQUFNQyxPQUFOLENBQWNILEVBQUVsQixPQUFoQixDQUE3QixFQUF1RDtBQUNyRGlCLHFCQUFhQSxXQUFXWixNQUFYLENBQWtCYSxFQUFFbEIsT0FBcEIsQ0FBYjtBQUNELE9BRkQsTUFFTyxJQUFJLE9BQU9rQixDQUFQLEtBQWEsVUFBakIsRUFBNkI7QUFDbENELG1CQUFXSyxJQUFYLENBQWdCSixDQUFoQjtBQUNELE9BRk0sTUFFQSxJQUFJLFFBQU9BLENBQVAseUNBQU9BLENBQVAsT0FBYSxRQUFiLEtBQTBCQSxFQUFFSyxLQUFGLElBQVdMLEVBQUVNLFNBQXZDLENBQUosRUFBdUQ7QUFDNUQsWUFBSWxCLFFBQVFNLEdBQVIsQ0FBWUMsUUFBWixLQUF5QixZQUE3QixFQUEyQztBQUN6QyxnQkFBTSxJQUFJWSxLQUFKLENBQ0oscUVBQ0EsMkRBREEsR0FFQSx1Q0FISSxDQUFOO0FBS0Q7QUFDRixPQVJNLE1BUUE7QUFDTCxjQUFNLElBQUlBLEtBQUosQ0FBVVAsSUFBSSwwQkFBZCxDQUFOO0FBQ0Q7QUFDRjtBQUNELFdBQU9ELFVBQVA7QUFDRCxHOzs7OztrQkFHWWxCLFM7O0FBRWY7Ozs7Ozs7QUFPQTs7Ozs7Ozs7OztBQVVBOzs7Ozs7Ozs7O0FBVUE7Ozs7OztBQU1BOzs7OztBQUtBOzs7Ozs7QUFNQTs7Ozs7QUFLQSIsImZpbGUiOiJwcm9jZXNzb3IuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgTGF6eVJlc3VsdCBmcm9tICcuL2xhenktcmVzdWx0J1xuXG4vKipcbiAqIENvbnRhaW5zIHBsdWdpbnMgdG8gcHJvY2VzcyBDU1MuIENyZWF0ZSBvbmUgYFByb2Nlc3NvcmAgaW5zdGFuY2UsXG4gKiBpbml0aWFsaXplIGl0cyBwbHVnaW5zLCBhbmQgdGhlbiB1c2UgdGhhdCBpbnN0YW5jZSBvbiBudW1lcm91cyBDU1MgZmlsZXMuXG4gKlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IHByb2Nlc3NvciA9IHBvc3Rjc3MoW2F1dG9wcmVmaXhlciwgcHJlY3NzXSlcbiAqIHByb2Nlc3Nvci5wcm9jZXNzKGNzczEpLnRoZW4ocmVzdWx0ID0+IGNvbnNvbGUubG9nKHJlc3VsdC5jc3MpKVxuICogcHJvY2Vzc29yLnByb2Nlc3MoY3NzMikudGhlbihyZXN1bHQgPT4gY29uc29sZS5sb2cocmVzdWx0LmNzcykpXG4gKi9cbmNsYXNzIFByb2Nlc3NvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge0FycmF5LjxQbHVnaW58cGx1Z2luRnVuY3Rpb24+fFByb2Nlc3Nvcn0gcGx1Z2lucyBQb3N0Q1NTIHBsdWdpbnMuXG4gICAqICAgICAgICBTZWUge0BsaW5rIFByb2Nlc3NvciN1c2V9IGZvciBwbHVnaW4gZm9ybWF0LlxuICAgKi9cbiAgY29uc3RydWN0b3IgKHBsdWdpbnMgPSBbXSkge1xuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgUG9zdENTUyB2ZXJzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogaWYgKHJlc3VsdC5wcm9jZXNzb3IudmVyc2lvbi5zcGxpdCgnLicpWzBdICE9PSAnNicpIHtcbiAgICAgKiAgIHRocm93IG5ldyBFcnJvcignVGhpcyBwbHVnaW4gd29ya3Mgb25seSB3aXRoIFBvc3RDU1MgNicpXG4gICAgICogfVxuICAgICAqL1xuICAgIHRoaXMudmVyc2lvbiA9ICc3LjAuMidcbiAgICAvKipcbiAgICAgKiBQbHVnaW5zIGFkZGVkIHRvIHRoaXMgcHJvY2Vzc29yLlxuICAgICAqXG4gICAgICogQHR5cGUge3BsdWdpbkZ1bmN0aW9uW119XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnN0IHByb2Nlc3NvciA9IHBvc3Rjc3MoW2F1dG9wcmVmaXhlciwgcHJlY3NzXSlcbiAgICAgKiBwcm9jZXNzb3IucGx1Z2lucy5sZW5ndGggLy89PiAyXG4gICAgICovXG4gICAgdGhpcy5wbHVnaW5zID0gdGhpcy5ub3JtYWxpemUocGx1Z2lucylcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGEgcGx1Z2luIHRvIGJlIHVzZWQgYXMgYSBDU1MgcHJvY2Vzc29yLlxuICAgKlxuICAgKiBQb3N0Q1NTIHBsdWdpbiBjYW4gYmUgaW4gNCBmb3JtYXRzOlxuICAgKiAqIEEgcGx1Z2luIGNyZWF0ZWQgYnkge0BsaW5rIHBvc3Rjc3MucGx1Z2lufSBtZXRob2QuXG4gICAqICogQSBmdW5jdGlvbi4gUG9zdENTUyB3aWxsIHBhc3MgdGhlIGZ1bmN0aW9uIGEgQHtsaW5rIFJvb3R9XG4gICAqICAgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IGFuZCBjdXJyZW50IHtAbGluayBSZXN1bHR9IGluc3RhbmNlXG4gICAqICAgYXMgdGhlIHNlY29uZC5cbiAgICogKiBBbiBvYmplY3Qgd2l0aCBhIGBwb3N0Y3NzYCBtZXRob2QuIFBvc3RDU1Mgd2lsbCB1c2UgdGhhdCBtZXRob2RcbiAgICogICBhcyBkZXNjcmliZWQgaW4gIzIuXG4gICAqICogQW5vdGhlciB7QGxpbmsgUHJvY2Vzc29yfSBpbnN0YW5jZS4gUG9zdENTUyB3aWxsIGNvcHkgcGx1Z2luc1xuICAgKiAgIGZyb20gdGhhdCBpbnN0YW5jZSBpbnRvIHRoaXMgb25lLlxuICAgKlxuICAgKiBQbHVnaW5zIGNhbiBhbHNvIGJlIGFkZGVkIGJ5IHBhc3NpbmcgdGhlbSBhcyBhcmd1bWVudHMgd2hlbiBjcmVhdGluZ1xuICAgKiBhIGBwb3N0Y3NzYCBpbnN0YW5jZSAoc2VlIFtgcG9zdGNzcyhwbHVnaW5zKWBdKS5cbiAgICpcbiAgICogQXN5bmNocm9ub3VzIHBsdWdpbnMgc2hvdWxkIHJldHVybiBhIGBQcm9taXNlYCBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIHtQbHVnaW58cGx1Z2luRnVuY3Rpb258UHJvY2Vzc29yfSBwbHVnaW4gUG9zdENTUyBwbHVnaW5cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3Ige0BsaW5rIFByb2Nlc3Nvcn1cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2l0aCBwbHVnaW5zLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBjb25zdCBwcm9jZXNzb3IgPSBwb3N0Y3NzKClcbiAgICogICAudXNlKGF1dG9wcmVmaXhlcilcbiAgICogICAudXNlKHByZWNzcylcbiAgICpcbiAgICogQHJldHVybiB7UHJvY2Vzc2VzfSBDdXJyZW50IHByb2Nlc3NvciB0byBtYWtlIG1ldGhvZHMgY2hhaW4uXG4gICAqL1xuICB1c2UgKHBsdWdpbikge1xuICAgIHRoaXMucGx1Z2lucyA9IHRoaXMucGx1Z2lucy5jb25jYXQodGhpcy5ub3JtYWxpemUoW3BsdWdpbl0pKVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICogUGFyc2VzIHNvdXJjZSBDU1MgYW5kIHJldHVybnMgYSB7QGxpbmsgTGF6eVJlc3VsdH0gUHJvbWlzZSBwcm94eS5cbiAgICogQmVjYXVzZSBzb21lIHBsdWdpbnMgY2FuIGJlIGFzeW5jaHJvbm91cyBpdCBkb2VzbuKAmXQgbWFrZVxuICAgKiBhbnkgdHJhbnNmb3JtYXRpb25zLiBUcmFuc2Zvcm1hdGlvbnMgd2lsbCBiZSBhcHBsaWVkXG4gICAqIGluIHRoZSB7QGxpbmsgTGF6eVJlc3VsdH0gbWV0aG9kcy5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd8dG9TdHJpbmd8UmVzdWx0fSBjc3MgU3RyaW5nIHdpdGggaW5wdXQgQ1NTIG9yIGFueSBvYmplY3RcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2l0aCBhIGB0b1N0cmluZygpYCBtZXRob2QsXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpa2UgYSBCdWZmZXIuIE9wdGlvbmFsbHksIHNlbmRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYSB7QGxpbmsgUmVzdWx0fSBpbnN0YW5jZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmQgdGhlIHByb2Nlc3NvciB3aWxsIHRha2VcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIHtAbGluayBSb290fSBmcm9tIGl0LlxuICAgKiBAcGFyYW0ge3Byb2Nlc3NPcHRpb25zfSBbb3B0c10gICAgICBPcHRpb25zLlxuICAgKlxuICAgKiBAcmV0dXJuIHtMYXp5UmVzdWx0fSBQcm9taXNlIHByb3h5LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBwcm9jZXNzb3IucHJvY2Vzcyhjc3MsIHsgZnJvbTogJ2EuY3NzJywgdG86ICdhLm91dC5jc3MnIH0pXG4gICAqICAgLnRoZW4ocmVzdWx0ID0+IHtcbiAgICogICAgICBjb25zb2xlLmxvZyhyZXN1bHQuY3NzKVxuICAgKiAgIH0pXG4gICAqL1xuICBwcm9jZXNzIChjc3MsIG9wdHMgPSB7IH0pIHtcbiAgICBpZiAodGhpcy5wbHVnaW5zLmxlbmd0aCA9PT0gMCAmJiBvcHRzLnBhcnNlciA9PT0gb3B0cy5zdHJpbmdpZmllcikge1xuICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlLndhcm4pIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgICAnWW91IGRpZCBub3Qgc2V0IGFueSBwbHVnaW5zLCBwYXJzZXIsIG9yIHN0cmluZ2lmaWVyLiAnICtcbiAgICAgICAgICAgICdSaWdodCBub3cgUG9zdENTUyBkbyBub3RoaW5nLiBQaWNrIHBsdWdpbnMgZm9yIHlvdXIgY2FzZSAnICtcbiAgICAgICAgICAgICdvbiBodHRwczovL3d3dy5wb3N0Y3NzLnBhcnRzLyBhbmQgdXNlIHRoZW0gaW4gcG9zdGNzcy5jb25maWcuanMuJ1xuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IExhenlSZXN1bHQodGhpcywgY3NzLCBvcHRzKVxuICB9XG5cbiAgbm9ybWFsaXplIChwbHVnaW5zKSB7XG4gICAgbGV0IG5vcm1hbGl6ZWQgPSBbXVxuICAgIGZvciAobGV0IGkgb2YgcGx1Z2lucykge1xuICAgICAgaWYgKGkucG9zdGNzcykgaSA9IGkucG9zdGNzc1xuXG4gICAgICBpZiAodHlwZW9mIGkgPT09ICdvYmplY3QnICYmIEFycmF5LmlzQXJyYXkoaS5wbHVnaW5zKSkge1xuICAgICAgICBub3JtYWxpemVkID0gbm9ybWFsaXplZC5jb25jYXQoaS5wbHVnaW5zKVxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBub3JtYWxpemVkLnB1c2goaSlcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGkgPT09ICdvYmplY3QnICYmIChpLnBhcnNlIHx8IGkuc3RyaW5naWZ5KSkge1xuICAgICAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICdQb3N0Q1NTIHN5bnRheGVzIGNhbm5vdCBiZSB1c2VkIGFzIHBsdWdpbnMuIEluc3RlYWQsIHBsZWFzZSB1c2UgJyArXG4gICAgICAgICAgICAnb25lIG9mIHRoZSBzeW50YXgvcGFyc2VyL3N0cmluZ2lmaWVyIG9wdGlvbnMgYXMgb3V0bGluZWQgJyArXG4gICAgICAgICAgICAnaW4geW91ciBQb3N0Q1NTIHJ1bm5lciBkb2N1bWVudGF0aW9uLidcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihpICsgJyBpcyBub3QgYSBQb3N0Q1NTIHBsdWdpbicpXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBub3JtYWxpemVkXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUHJvY2Vzc29yXG5cbi8qKlxuICogQGNhbGxiYWNrIGJ1aWxkZXJcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJ0ICAgICAgICAgIFBhcnQgb2YgZ2VuZXJhdGVkIENTUyBjb25uZWN0ZWQgdG8gdGhpcyBub2RlLlxuICogQHBhcmFtIHtOb2RlfSAgIG5vZGUgICAgICAgICAgQVNUIG5vZGUuXG4gKiBAcGFyYW0ge1wic3RhcnRcInxcImVuZFwifSBbdHlwZV0gTm9kZeKAmXMgcGFydCB0eXBlLlxuICovXG5cbi8qKlxuICogQGNhbGxiYWNrIHBhcnNlclxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfHRvU3RyaW5nfSBjc3MgICBTdHJpbmcgd2l0aCBpbnB1dCBDU1Mgb3IgYW55IG9iamVjdFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpdGggdG9TdHJpbmcoKSBtZXRob2QsIGxpa2UgYSBCdWZmZXIuXG4gKiBAcGFyYW0ge3Byb2Nlc3NPcHRpb25zfSBbb3B0c10gT3B0aW9ucyB3aXRoIG9ubHkgYGZyb21gIGFuZCBgbWFwYCBrZXlzLlxuICpcbiAqIEByZXR1cm4ge1Jvb3R9IFBvc3RDU1MgQVNUXG4gKi9cblxuLyoqXG4gKiBAY2FsbGJhY2sgc3RyaW5naWZpZXJcbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgICAgICAgU3RhcnQgbm9kZSBmb3Igc3RyaW5naWZpbmcuIFVzdWFsbHkge0BsaW5rIFJvb3R9LlxuICogQHBhcmFtIHtidWlsZGVyfSBidWlsZGVyIEZ1bmN0aW9uIHRvIGNvbmNhdGVuYXRlIENTUyBmcm9tIG5vZGXigJlzIHBhcnRzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgb3IgZ2VuZXJhdGUgc3RyaW5nIGFuZCBzb3VyY2UgbWFwLlxuICpcbiAqIEByZXR1cm4ge3ZvaWR9XG4gKi9cblxuLyoqXG4gKiBAdHlwZWRlZiB7b2JqZWN0fSBzeW50YXhcbiAqIEBwcm9wZXJ0eSB7cGFyc2VyfSBwYXJzZSAgICAgICAgICBGdW5jdGlvbiB0byBnZW5lcmF0ZSBBU1QgYnkgc3RyaW5nLlxuICogQHByb3BlcnR5IHtzdHJpbmdpZmllcn0gc3RyaW5naWZ5IEZ1bmN0aW9uIHRvIGdlbmVyYXRlIHN0cmluZyBieSBBU1QuXG4gKi9cblxuLyoqXG4gKiBAdHlwZWRlZiB7b2JqZWN0fSB0b1N0cmluZ1xuICogQHByb3BlcnR5IHtmdW5jdGlvbn0gdG9TdHJpbmdcbiAqL1xuXG4vKipcbiAqIEBjYWxsYmFjayBwbHVnaW5GdW5jdGlvblxuICogQHBhcmFtIHtSb290fSByb290ICAgICBQYXJzZWQgaW5wdXQgQ1NTLlxuICogQHBhcmFtIHtSZXN1bHR9IHJlc3VsdCBSZXN1bHQgdG8gc2V0IHdhcm5pbmdzIG9yIGNoZWNrIG90aGVyIHBsdWdpbnMuXG4gKi9cblxuLyoqXG4gKiBAdHlwZWRlZiB7b2JqZWN0fSBQbHVnaW5cbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb259IHBvc3Rjc3MgUG9zdENTUyBwbHVnaW4gZnVuY3Rpb24uXG4gKi9cblxuLyoqXG4gKiBAdHlwZWRlZiB7b2JqZWN0fSBwcm9jZXNzT3B0aW9uc1xuICogQHByb3BlcnR5IHtzdHJpbmd9IGZyb20gICAgICAgICAgICAgVGhlIHBhdGggb2YgdGhlIENTUyBzb3VyY2UgZmlsZS5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFlvdSBzaG91bGQgYWx3YXlzIHNldCBgZnJvbWAsXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWNhdXNlIGl0IGlzIHVzZWQgaW4gc291cmNlIG1hcFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGlvbiBhbmQgc3ludGF4IGVycm9yIG1lc3NhZ2VzLlxuICogQHByb3BlcnR5IHtzdHJpbmd9IHRvICAgICAgICAgICAgICAgVGhlIHBhdGggd2hlcmUgeW914oCZbGwgcHV0IHRoZSBvdXRwdXRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIENTUyBmaWxlLiBZb3Ugc2hvdWxkIGFsd2F5cyBzZXQgYHRvYFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG8gZ2VuZXJhdGUgY29ycmVjdCBzb3VyY2UgbWFwcy5cbiAqIEBwcm9wZXJ0eSB7cGFyc2VyfSBwYXJzZXIgICAgICAgICAgIEZ1bmN0aW9uIHRvIGdlbmVyYXRlIEFTVCBieSBzdHJpbmcuXG4gKiBAcHJvcGVydHkge3N0cmluZ2lmaWVyfSBzdHJpbmdpZmllciBDbGFzcyB0byBnZW5lcmF0ZSBzdHJpbmcgYnkgQVNULlxuICogQHByb3BlcnR5IHtzeW50YXh9IHN5bnRheCAgICAgICAgICAgT2JqZWN0IHdpdGggYHBhcnNlYCBhbmQgYHN0cmluZ2lmeWAuXG4gKiBAcHJvcGVydHkge29iamVjdH0gbWFwICAgICAgICAgICAgICBTb3VyY2UgbWFwIG9wdGlvbnMuXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IG1hcC5pbmxpbmUgICAgICAgICAgICAgICAgICAgIERvZXMgc291cmNlIG1hcCBzaG91bGRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmUgZW1iZWRkZWQgaW4gdGhlIG91dHB1dFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBDU1MgYXMgYSBiYXNlNjQtZW5jb2RlZFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21tZW50LlxuICogQHByb3BlcnR5IHtzdHJpbmd8b2JqZWN0fGZhbHNlfGZ1bmN0aW9ufSBtYXAucHJldiBTb3VyY2UgbWFwIGNvbnRlbnRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbSBhIHByZXZpb3VzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3Npbmcgc3RlcFxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZm9yIGV4YW1wbGUsIFNhc3MpLlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBQb3N0Q1NTIHdpbGwgdHJ5IHRvIGZpbmRcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXMgbWFwIGF1dG9tYXRpY2FsbHksXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvIHlvdSBjb3VsZCBkaXNhYmxlIGl0IGJ5XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBmYWxzZWAgdmFsdWUuXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IG1hcC5zb3VyY2VzQ29udGVudCAgICAgICAgICAgIERvZXMgUG9zdENTUyBzaG91bGQgc2V0XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZSBvcmlnaW4gY29udGVudCB0byBtYXAuXG4gKiBAcHJvcGVydHkge3N0cmluZ3xmYWxzZX0gbWFwLmFubm90YXRpb24gICAgICAgICAgIERvZXMgUG9zdENTUyBzaG91bGQgc2V0XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFubm90YXRpb24gY29tbWVudCB0byBtYXAuXG4gKiBAcHJvcGVydHkge3N0cmluZ30gbWFwLmZyb20gICAgICAgICAgICAgICAgICAgICAgIE92ZXJyaWRlIGBmcm9tYCBpbiBtYXDigJlzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZXNgLlxuICovXG4iXX0=
