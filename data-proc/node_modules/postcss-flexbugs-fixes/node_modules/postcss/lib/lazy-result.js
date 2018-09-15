'use strict';

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _mapGenerator = require('./map-generator');

var _mapGenerator2 = _interopRequireDefault(_mapGenerator);

var _stringify2 = require('./stringify');

var _stringify3 = _interopRequireDefault(_stringify2);

var _warnOnce = require('./warn-once');

var _warnOnce2 = _interopRequireDefault(_warnOnce);

var _result = require('./result');

var _result2 = _interopRequireDefault(_result);

var _parse = require('./parse');

var _parse2 = _interopRequireDefault(_parse);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function isPromise(obj) {
  return (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && typeof obj.then === 'function';
}

/**
 * A Promise proxy for the result of PostCSS transformations.
 *
 * A `LazyResult` instance is returned by {@link Processor#process}.
 *
 * @example
 * const lazy = postcss([cssnext]).process(css)
 */

var LazyResult = function () {
  function LazyResult(processor, css, opts) {
    _classCallCheck(this, LazyResult);

    this.stringified = false;
    this.processed = false;

    var root = void 0;
    if ((typeof css === 'undefined' ? 'undefined' : _typeof(css)) === 'object' && css !== null && css.type === 'root') {
      root = css;
    } else if (css instanceof LazyResult || css instanceof _result2.default) {
      root = css.root;
      if (css.map) {
        if (typeof opts.map === 'undefined') opts.map = {};
        if (!opts.map.inline) opts.map.inline = false;
        opts.map.prev = css.map;
      }
    } else {
      var parser = _parse2.default;
      if (opts.syntax) parser = opts.syntax.parse;
      if (opts.parser) parser = opts.parser;
      if (parser.parse) parser = parser.parse;

      try {
        root = parser(css, opts);
      } catch (error) {
        this.error = error;
      }
    }

    this.result = new _result2.default(processor, root, opts);
  }

  /**
   * Returns a {@link Processor} instance, which will be used
   * for CSS transformations.
   *
   * @type {Processor}
   */


  /**
   * Processes input CSS through synchronous plugins
   * and calls {@link Result#warnings()}.
   *
   * @return {Warning[]} Warnings from plugins.
   */
  LazyResult.prototype.warnings = function warnings() {
    return this.sync().warnings();
  };

  /**
   * Alias for the {@link LazyResult#css} property.
   *
   * @example
   * lazy + '' === lazy.css
   *
   * @return {string} Output CSS.
   */


  LazyResult.prototype.toString = function toString() {
    return this.css;
  };

  /**
   * Processes input CSS through synchronous and asynchronous plugins
   * and calls `onFulfilled` with a Result instance. If a plugin throws
   * an error, the `onRejected` callback will be executed.
   *
   * It implements standard Promise API.
   *
   * @param {onFulfilled} onFulfilled Callback will be executed
   *                                  when all plugins will finish work.
   * @param {onRejected}  onRejected  Callback will be executed on any error.
   *
   * @return {Promise} Promise API to make queue.
   *
   * @example
   * postcss([cssnext]).process(css, { from: cssPath }).then(result => {
   *   console.log(result.css)
   * })
   */


  LazyResult.prototype.then = function then(onFulfilled, onRejected) {
    if (process.env.NODE_ENV !== 'production') {
      if (!('from' in this.opts)) {
        (0, _warnOnce2.default)('Without `from` option PostCSS could generate wrong source map ' + 'and will not find Browserslist config. Set it to CSS file path ' + 'or to `undefined` to prevent this warning.');
      }
    }
    return this.async().then(onFulfilled, onRejected);
  };

  /**
   * Processes input CSS through synchronous and asynchronous plugins
   * and calls onRejected for each error thrown in any plugin.
   *
   * It implements standard Promise API.
   *
   * @param {onRejected} onRejected Callback will be executed on any error.
   *
   * @return {Promise} Promise API to make queue.
   *
   * @example
   * postcss([cssnext]).process(css).then(result => {
   *   console.log(result.css)
   * }).catch(error => {
   *   console.error(error)
   * })
   */


  LazyResult.prototype.catch = function _catch(onRejected) {
    return this.async().catch(onRejected);
  };
  /**
   * Processes input CSS through synchronous and asynchronous plugins
   * and calls onFinally on any error or when all plugins will finish work.
   *
   * It implements standard Promise API.
   *
   * @param {onFinally} onFinally Callback will be executed on any error or
   *                              when all plugins will finish work.
   *
   * @return {Promise} Promise API to make queue.
   *
   * @example
   * postcss([cssnext]).process(css).finally(() => {
   *   console.log('processing ended')
   * })
   */


  LazyResult.prototype.finally = function _finally(onFinally) {
    return this.async().then(onFinally, onFinally);
  };

  LazyResult.prototype.handleError = function handleError(error, plugin) {
    try {
      this.error = error;
      if (error.name === 'CssSyntaxError' && !error.plugin) {
        error.plugin = plugin.postcssPlugin;
        error.setMessage();
      } else if (plugin.postcssVersion) {
        if (process.env.NODE_ENV !== 'production') {
          var pluginName = plugin.postcssPlugin;
          var pluginVer = plugin.postcssVersion;
          var runtimeVer = this.result.processor.version;
          var a = pluginVer.split('.');
          var b = runtimeVer.split('.');

          if (a[0] !== b[0] || parseInt(a[1]) > parseInt(b[1])) {
            console.error('Unknown error from PostCSS plugin. Your current PostCSS ' + 'version is ' + runtimeVer + ', but ' + pluginName + ' uses ' + pluginVer + '. Perhaps this is the source of the error below.');
          }
        }
      }
    } catch (err) {
      if (console && console.error) console.error(err);
    }
  };

  LazyResult.prototype.asyncTick = function asyncTick(resolve, reject) {
    var _this = this;

    if (this.plugin >= this.processor.plugins.length) {
      this.processed = true;
      return resolve();
    }

    try {
      var plugin = this.processor.plugins[this.plugin];
      var promise = this.run(plugin);
      this.plugin += 1;

      if (isPromise(promise)) {
        promise.then(function () {
          _this.asyncTick(resolve, reject);
        }).catch(function (error) {
          _this.handleError(error, plugin);
          _this.processed = true;
          reject(error);
        });
      } else {
        this.asyncTick(resolve, reject);
      }
    } catch (error) {
      this.processed = true;
      reject(error);
    }
  };

  LazyResult.prototype.async = function async() {
    var _this2 = this;

    if (this.processed) {
      return new Promise(function (resolve, reject) {
        if (_this2.error) {
          reject(_this2.error);
        } else {
          resolve(_this2.stringify());
        }
      });
    }
    if (this.processing) {
      return this.processing;
    }

    this.processing = new Promise(function (resolve, reject) {
      if (_this2.error) return reject(_this2.error);
      _this2.plugin = 0;
      _this2.asyncTick(resolve, reject);
    }).then(function () {
      _this2.processed = true;
      return _this2.stringify();
    });

    return this.processing;
  };

  LazyResult.prototype.sync = function sync() {
    if (this.processed) return this.result;
    this.processed = true;

    if (this.processing) {
      throw new Error('Use process(css).then(cb) to work with async plugins');
    }

    if (this.error) throw this.error;

    for (var _iterator = this.result.processor.plugins, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref = _i.value;
      }

      var plugin = _ref;

      var promise = this.run(plugin);
      if (isPromise(promise)) {
        throw new Error('Use process(css).then(cb) to work with async plugins');
      }
    }

    return this.result;
  };

  LazyResult.prototype.run = function run(plugin) {
    this.result.lastPlugin = plugin;

    try {
      return plugin(this.result.root, this.result);
    } catch (error) {
      this.handleError(error, plugin);
      throw error;
    }
  };

  LazyResult.prototype.stringify = function stringify() {
    if (this.stringified) return this.result;
    this.stringified = true;

    this.sync();

    var opts = this.result.opts;
    var str = _stringify3.default;
    if (opts.syntax) str = opts.syntax.stringify;
    if (opts.stringifier) str = opts.stringifier;
    if (str.stringify) str = str.stringify;

    var map = new _mapGenerator2.default(str, this.result.root, this.result.opts);
    var data = map.generate();
    this.result.css = data[0];
    this.result.map = data[1];

    return this.result;
  };

  _createClass(LazyResult, [{
    key: 'processor',
    get: function get() {
      return this.result.processor;
    }

    /**
     * Options from the {@link Processor#process} call.
     *
     * @type {processOptions}
     */

  }, {
    key: 'opts',
    get: function get() {
      return this.result.opts;
    }

    /**
     * Processes input CSS through synchronous plugins, converts `Root`
     * to a CSS string and returns {@link Result#css}.
     *
     * This property will only work with synchronous plugins.
     * If the processor contains any asynchronous plugins
     * it will throw an error. This is why this method is only
     * for debug purpose, you should always use {@link LazyResult#then}.
     *
     * @type {string}
     * @see Result#css
     */

  }, {
    key: 'css',
    get: function get() {
      return this.stringify().css;
    }

    /**
     * An alias for the `css` property. Use it with syntaxes
     * that generate non-CSS output.
     *
     * This property will only work with synchronous plugins.
     * If the processor contains any asynchronous plugins
     * it will throw an error. This is why this method is only
     * for debug purpose, you should always use {@link LazyResult#then}.
     *
     * @type {string}
     * @see Result#content
     */

  }, {
    key: 'content',
    get: function get() {
      return this.stringify().content;
    }

    /**
     * Processes input CSS through synchronous plugins
     * and returns {@link Result#map}.
     *
     * This property will only work with synchronous plugins.
     * If the processor contains any asynchronous plugins
     * it will throw an error. This is why this method is only
     * for debug purpose, you should always use {@link LazyResult#then}.
     *
     * @type {SourceMapGenerator}
     * @see Result#map
     */

  }, {
    key: 'map',
    get: function get() {
      return this.stringify().map;
    }

    /**
     * Processes input CSS through synchronous plugins
     * and returns {@link Result#root}.
     *
     * This property will only work with synchronous plugins. If the processor
     * contains any asynchronous plugins it will throw an error.
     *
     * This is why this method is only for debug purpose,
     * you should always use {@link LazyResult#then}.
     *
     * @type {Root}
     * @see Result#root
     */

  }, {
    key: 'root',
    get: function get() {
      return this.sync().root;
    }

    /**
     * Processes input CSS through synchronous plugins
     * and returns {@link Result#messages}.
     *
     * This property will only work with synchronous plugins. If the processor
     * contains any asynchronous plugins it will throw an error.
     *
     * This is why this method is only for debug purpose,
     * you should always use {@link LazyResult#then}.
     *
     * @type {Message[]}
     * @see Result#messages
     */

  }, {
    key: 'messages',
    get: function get() {
      return this.sync().messages;
    }
  }]);

  return LazyResult;
}();

exports.default = LazyResult;

/**
 * @callback onFulfilled
 * @param {Result} result
 */

/**
 * @callback onRejected
 * @param {Error} error
 */

module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxhenktcmVzdWx0LmVzNiJdLCJuYW1lcyI6WyJpc1Byb21pc2UiLCJvYmoiLCJ0aGVuIiwiTGF6eVJlc3VsdCIsInByb2Nlc3NvciIsImNzcyIsIm9wdHMiLCJzdHJpbmdpZmllZCIsInByb2Nlc3NlZCIsInJvb3QiLCJ0eXBlIiwiUmVzdWx0IiwibWFwIiwiaW5saW5lIiwicHJldiIsInBhcnNlciIsInBhcnNlIiwic3ludGF4IiwiZXJyb3IiLCJyZXN1bHQiLCJ3YXJuaW5ncyIsInN5bmMiLCJ0b1N0cmluZyIsIm9uRnVsZmlsbGVkIiwib25SZWplY3RlZCIsInByb2Nlc3MiLCJlbnYiLCJOT0RFX0VOViIsImFzeW5jIiwiY2F0Y2giLCJmaW5hbGx5Iiwib25GaW5hbGx5IiwiaGFuZGxlRXJyb3IiLCJwbHVnaW4iLCJuYW1lIiwicG9zdGNzc1BsdWdpbiIsInNldE1lc3NhZ2UiLCJwb3N0Y3NzVmVyc2lvbiIsInBsdWdpbk5hbWUiLCJwbHVnaW5WZXIiLCJydW50aW1lVmVyIiwidmVyc2lvbiIsImEiLCJzcGxpdCIsImIiLCJwYXJzZUludCIsImNvbnNvbGUiLCJlcnIiLCJhc3luY1RpY2siLCJyZXNvbHZlIiwicmVqZWN0IiwicGx1Z2lucyIsImxlbmd0aCIsInByb21pc2UiLCJydW4iLCJQcm9taXNlIiwic3RyaW5naWZ5IiwicHJvY2Vzc2luZyIsIkVycm9yIiwibGFzdFBsdWdpbiIsInN0ciIsInN0cmluZ2lmaWVyIiwiTWFwR2VuZXJhdG9yIiwiZGF0YSIsImdlbmVyYXRlIiwiY29udGVudCIsIm1lc3NhZ2VzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7O0FBRUEsU0FBU0EsU0FBVCxDQUFvQkMsR0FBcEIsRUFBeUI7QUFDdkIsU0FBTyxRQUFPQSxHQUFQLHlDQUFPQSxHQUFQLE9BQWUsUUFBZixJQUEyQixPQUFPQSxJQUFJQyxJQUFYLEtBQW9CLFVBQXREO0FBQ0Q7O0FB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Ozs7Ozs7Ozs7O3dCQWFZO0FBQ1YsYUFBTyxLQUFLUyxJQUFMLEdBQVlaLElBQW5CO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7d0JBYWdCO0FBQ2QsYUFBTyxLQUFLWSxJQUFMLEdBQVk2QyxRQUFuQjtBQUNEOzs7Ozs7a0JBdU9ZL0QsVTs7QUFFZjs7Ozs7QUFLQSIsImZpbGUiOiJsYXp5LXJlc3VsdC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBNYXBHZW5lcmF0b3IgZnJvbSAnLi9tYXAtZ2VuZXJhdG9yJ1xuaW1wb3J0IHN0cmluZ2lmeSBmcm9tICcuL3N0cmluZ2lmeSdcbmltcG9ydCB3YXJuT25jZSBmcm9tICcuL3dhcm4tb25jZSdcbmltcG9ydCBSZXN1bHQgZnJvbSAnLi9yZXN1bHQnXG5pbXBvcnQgcGFyc2UgZnJvbSAnLi9wYXJzZSdcblxuZnVuY3Rpb24gaXNQcm9taXNlIChvYmopIHtcbiAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdvYmplY3QnICYmIHR5cGVvZiBvYmoudGhlbiA9PT0gJ2Z1bmN0aW9uJ1xufVxuXG4vKipcbiAqIEEgUHJvbWlzZSBwcm94eSBmb3IgdGhlIHJlc3VsdCBvZiBQb3N0Q1NTIHRyYW5zZm9ybWF0aW9ucy5cbiAqXG4gKiBBIGBMYXp5UmVzdWx0YCBpbnN0YW5jZSBpcyByZXR1cm5lZCBieSB7QGxpbmsgUHJvY2Vzc29yI3Byb2Nlc3N9LlxuICpcbiAqIEBleGFtcGxlXG4gKiBjb25zdCBsYXp5ID0gcG9zdGNzcyhbY3NzbmV4dF0pLnByb2Nlc3MoY3NzKVxuICovXG5jbGFzcyBMYXp5UmVzdWx0IHtcbiAgY29uc3RydWN0b3IgKHByb2Nlc3NvciwgY3NzLCBvcHRzKSB7XG4gICAgdGhpcy5zdHJpbmdpZmllZCA9IGZhbHNlXG4gICAgdGhpcy5wcm9jZXNzZWQgPSBmYWxzZVxuXG4gICAgbGV0IHJvb3RcbiAgICBpZiAodHlwZW9mIGNzcyA9PT0gJ29iamVjdCcgJiYgY3NzICE9PSBudWxsICYmIGNzcy50eXBlID09PSAncm9vdCcpIHtcbiAgICAgIHJvb3QgPSBjc3NcbiAgICB9IGVsc2UgaWYgKGNzcyBpbnN0YW5jZW9mIExhenlSZXN1bHQgfHwgY3NzIGluc3RhbmNlb2YgUmVzdWx0KSB7XG4gICAgICByb290ID0gY3NzLnJvb3RcbiAgICAgIGlmIChjc3MubWFwKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0cy5tYXAgPT09ICd1bmRlZmluZWQnKSBvcHRzLm1hcCA9IHsgfVxuICAgICAgICBpZiAoIW9wdHMubWFwLmlubGluZSkgb3B0cy5tYXAuaW5saW5lID0gZmFsc2VcbiAgICAgICAgb3B0cy5tYXAucHJldiA9IGNzcy5tYXBcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHBhcnNlciA9IHBhcnNlXG4gICAgICBpZiAob3B0cy5zeW50YXgpIHBhcnNlciA9IG9wdHMuc3ludGF4LnBhcnNlXG4gICAgICBpZiAob3B0cy5wYXJzZXIpIHBhcnNlciA9IG9wdHMucGFyc2VyXG4gICAgICBpZiAocGFyc2VyLnBhcnNlKSBwYXJzZXIgPSBwYXJzZXIucGFyc2VcblxuICAgICAgdHJ5IHtcbiAgICAgICAgcm9vdCA9IHBhcnNlcihjc3MsIG9wdHMpXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aGlzLmVycm9yID0gZXJyb3JcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnJlc3VsdCA9IG5ldyBSZXN1bHQocHJvY2Vzc29yLCByb290LCBvcHRzKVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSB7QGxpbmsgUHJvY2Vzc29yfSBpbnN0YW5jZSwgd2hpY2ggd2lsbCBiZSB1c2VkXG4gICAqIGZvciBDU1MgdHJhbnNmb3JtYXRpb25zLlxuICAgKlxuICAgKiBAdHlwZSB7UHJvY2Vzc29yfVxuICAgKi9cbiAgZ2V0IHByb2Nlc3NvciAoKSB7XG4gICAgcmV0dXJuIHRoaXMucmVzdWx0LnByb2Nlc3NvclxuICB9XG5cbiAgLyoqXG4gICAqIE9wdGlvbnMgZnJvbSB0aGUge0BsaW5rIFByb2Nlc3NvciNwcm9jZXNzfSBjYWxsLlxuICAgKlxuICAgKiBAdHlwZSB7cHJvY2Vzc09wdGlvbnN9XG4gICAqL1xuICBnZXQgb3B0cyAoKSB7XG4gICAgcmV0dXJuIHRoaXMucmVzdWx0Lm9wdHNcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgaW5wdXQgQ1NTIHRocm91Z2ggc3luY2hyb25vdXMgcGx1Z2lucywgY29udmVydHMgYFJvb3RgXG4gICAqIHRvIGEgQ1NTIHN0cmluZyBhbmQgcmV0dXJucyB7QGxpbmsgUmVzdWx0I2Nzc30uXG4gICAqXG4gICAqIFRoaXMgcHJvcGVydHkgd2lsbCBvbmx5IHdvcmsgd2l0aCBzeW5jaHJvbm91cyBwbHVnaW5zLlxuICAgKiBJZiB0aGUgcHJvY2Vzc29yIGNvbnRhaW5zIGFueSBhc3luY2hyb25vdXMgcGx1Z2luc1xuICAgKiBpdCB3aWxsIHRocm93IGFuIGVycm9yLiBUaGlzIGlzIHdoeSB0aGlzIG1ldGhvZCBpcyBvbmx5XG4gICAqIGZvciBkZWJ1ZyBwdXJwb3NlLCB5b3Ugc2hvdWxkIGFsd2F5cyB1c2Uge0BsaW5rIExhenlSZXN1bHQjdGhlbn0uXG4gICAqXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqIEBzZWUgUmVzdWx0I2Nzc1xuICAgKi9cbiAgZ2V0IGNzcyAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RyaW5naWZ5KCkuY3NzXG4gIH1cblxuICAvKipcbiAgICogQW4gYWxpYXMgZm9yIHRoZSBgY3NzYCBwcm9wZXJ0eS4gVXNlIGl0IHdpdGggc3ludGF4ZXNcbiAgICogdGhhdCBnZW5lcmF0ZSBub24tQ1NTIG91dHB1dC5cbiAgICpcbiAgICogVGhpcyBwcm9wZXJ0eSB3aWxsIG9ubHkgd29yayB3aXRoIHN5bmNocm9ub3VzIHBsdWdpbnMuXG4gICAqIElmIHRoZSBwcm9jZXNzb3IgY29udGFpbnMgYW55IGFzeW5jaHJvbm91cyBwbHVnaW5zXG4gICAqIGl0IHdpbGwgdGhyb3cgYW4gZXJyb3IuIFRoaXMgaXMgd2h5IHRoaXMgbWV0aG9kIGlzIG9ubHlcbiAgICogZm9yIGRlYnVnIHB1cnBvc2UsIHlvdSBzaG91bGQgYWx3YXlzIHVzZSB7QGxpbmsgTGF6eVJlc3VsdCN0aGVufS5cbiAgICpcbiAgICogQHR5cGUge3N0cmluZ31cbiAgICogQHNlZSBSZXN1bHQjY29udGVudFxuICAgKi9cbiAgZ2V0IGNvbnRlbnQgKCkge1xuICAgIHJldHVybiB0aGlzLnN0cmluZ2lmeSgpLmNvbnRlbnRcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgaW5wdXQgQ1NTIHRocm91Z2ggc3luY2hyb25vdXMgcGx1Z2luc1xuICAgKiBhbmQgcmV0dXJucyB7QGxpbmsgUmVzdWx0I21hcH0uXG4gICAqXG4gICAqIFRoaXMgcHJvcGVydHkgd2lsbCBvbmx5IHdvcmsgd2l0aCBzeW5jaHJvbm91cyBwbHVnaW5zLlxuICAgKiBJZiB0aGUgcHJvY2Vzc29yIGNvbnRhaW5zIGFueSBhc3luY2hyb25vdXMgcGx1Z2luc1xuICAgKiBpdCB3aWxsIHRocm93IGFuIGVycm9yLiBUaGlzIGlzIHdoeSB0aGlzIG1ldGhvZCBpcyBvbmx5XG4gICAqIGZvciBkZWJ1ZyBwdXJwb3NlLCB5b3Ugc2hvdWxkIGFsd2F5cyB1c2Uge0BsaW5rIExhenlSZXN1bHQjdGhlbn0uXG4gICAqXG4gICAqIEB0eXBlIHtTb3VyY2VNYXBHZW5lcmF0b3J9XG4gICAqIEBzZWUgUmVzdWx0I21hcFxuICAgKi9cbiAgZ2V0IG1hcCAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3RyaW5naWZ5KCkubWFwXG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIGlucHV0IENTUyB0aHJvdWdoIHN5bmNocm9ub3VzIHBsdWdpbnNcbiAgICogYW5kIHJldHVybnMge0BsaW5rIFJlc3VsdCNyb290fS5cbiAgICpcbiAgICogVGhpcyBwcm9wZXJ0eSB3aWxsIG9ubHkgd29yayB3aXRoIHN5bmNocm9ub3VzIHBsdWdpbnMuIElmIHRoZSBwcm9jZXNzb3JcbiAgICogY29udGFpbnMgYW55IGFzeW5jaHJvbm91cyBwbHVnaW5zIGl0IHdpbGwgdGhyb3cgYW4gZXJyb3IuXG4gICAqXG4gICAqIFRoaXMgaXMgd2h5IHRoaXMgbWV0aG9kIGlzIG9ubHkgZm9yIGRlYnVnIHB1cnBvc2UsXG4gICAqIHlvdSBzaG91bGQgYWx3YXlzIHVzZSB7QGxpbmsgTGF6eVJlc3VsdCN0aGVufS5cbiAgICpcbiAgICogQHR5cGUge1Jvb3R9XG4gICAqIEBzZWUgUmVzdWx0I3Jvb3RcbiAgICovXG4gIGdldCByb290ICgpIHtcbiAgICByZXR1cm4gdGhpcy5zeW5jKCkucm9vdFxuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3NlcyBpbnB1dCBDU1MgdGhyb3VnaCBzeW5jaHJvbm91cyBwbHVnaW5zXG4gICAqIGFuZCByZXR1cm5zIHtAbGluayBSZXN1bHQjbWVzc2FnZXN9LlxuICAgKlxuICAgKiBUaGlzIHByb3BlcnR5IHdpbGwgb25seSB3b3JrIHdpdGggc3luY2hyb25vdXMgcGx1Z2lucy4gSWYgdGhlIHByb2Nlc3NvclxuICAgKiBjb250YWlucyBhbnkgYXN5bmNocm9ub3VzIHBsdWdpbnMgaXQgd2lsbCB0aHJvdyBhbiBlcnJvci5cbiAgICpcbiAgICogVGhpcyBpcyB3aHkgdGhpcyBtZXRob2QgaXMgb25seSBmb3IgZGVidWcgcHVycG9zZSxcbiAgICogeW91IHNob3VsZCBhbHdheXMgdXNlIHtAbGluayBMYXp5UmVzdWx0I3RoZW59LlxuICAgKlxuICAgKiBAdHlwZSB7TWVzc2FnZVtdfVxuICAgKiBAc2VlIFJlc3VsdCNtZXNzYWdlc1xuICAgKi9cbiAgZ2V0IG1lc3NhZ2VzICgpIHtcbiAgICByZXR1cm4gdGhpcy5zeW5jKCkubWVzc2FnZXNcbiAgfVxuXG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgaW5wdXQgQ1NTIHRocm91Z2ggc3luY2hyb25vdXMgcGx1Z2luc1xuICAgKiBhbmQgY2FsbHMge0BsaW5rIFJlc3VsdCN3YXJuaW5ncygpfS5cbiAgICpcbiAgICogQHJldHVybiB7V2FybmluZ1tdfSBXYXJuaW5ncyBmcm9tIHBsdWdpbnMuXG4gICAqL1xuICB3YXJuaW5ncyAoKSB7XG4gICAgcmV0dXJuIHRoaXMuc3luYygpLndhcm5pbmdzKClcbiAgfVxuXG4gIC8qKlxuICAgKiBBbGlhcyBmb3IgdGhlIHtAbGluayBMYXp5UmVzdWx0I2Nzc30gcHJvcGVydHkuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGxhenkgKyAnJyA9PT0gbGF6eS5jc3NcbiAgICpcbiAgICogQHJldHVybiB7c3RyaW5nfSBPdXRwdXQgQ1NTLlxuICAgKi9cbiAgdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiB0aGlzLmNzc1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2Nlc3NlcyBpbnB1dCBDU1MgdGhyb3VnaCBzeW5jaHJvbm91cyBhbmQgYXN5bmNocm9ub3VzIHBsdWdpbnNcbiAgICogYW5kIGNhbGxzIGBvbkZ1bGZpbGxlZGAgd2l0aCBhIFJlc3VsdCBpbnN0YW5jZS4gSWYgYSBwbHVnaW4gdGhyb3dzXG4gICAqIGFuIGVycm9yLCB0aGUgYG9uUmVqZWN0ZWRgIGNhbGxiYWNrIHdpbGwgYmUgZXhlY3V0ZWQuXG4gICAqXG4gICAqIEl0IGltcGxlbWVudHMgc3RhbmRhcmQgUHJvbWlzZSBBUEkuXG4gICAqXG4gICAqIEBwYXJhbSB7b25GdWxmaWxsZWR9IG9uRnVsZmlsbGVkIENhbGxiYWNrIHdpbGwgYmUgZXhlY3V0ZWRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiBhbGwgcGx1Z2lucyB3aWxsIGZpbmlzaCB3b3JrLlxuICAgKiBAcGFyYW0ge29uUmVqZWN0ZWR9ICBvblJlamVjdGVkICBDYWxsYmFjayB3aWxsIGJlIGV4ZWN1dGVkIG9uIGFueSBlcnJvci5cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX0gUHJvbWlzZSBBUEkgdG8gbWFrZSBxdWV1ZS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogcG9zdGNzcyhbY3NzbmV4dF0pLnByb2Nlc3MoY3NzLCB7IGZyb206IGNzc1BhdGggfSkudGhlbihyZXN1bHQgPT4ge1xuICAgKiAgIGNvbnNvbGUubG9nKHJlc3VsdC5jc3MpXG4gICAqIH0pXG4gICAqL1xuICB0aGVuIChvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgICBpZiAoISgnZnJvbScgaW4gdGhpcy5vcHRzKSkge1xuICAgICAgICB3YXJuT25jZShcbiAgICAgICAgICAnV2l0aG91dCBgZnJvbWAgb3B0aW9uIFBvc3RDU1MgY291bGQgZ2VuZXJhdGUgd3Jvbmcgc291cmNlIG1hcCAnICtcbiAgICAgICAgICAnYW5kIHdpbGwgbm90IGZpbmQgQnJvd3NlcnNsaXN0IGNvbmZpZy4gU2V0IGl0IHRvIENTUyBmaWxlIHBhdGggJyArXG4gICAgICAgICAgJ29yIHRvIGB1bmRlZmluZWRgIHRvIHByZXZlbnQgdGhpcyB3YXJuaW5nLidcbiAgICAgICAgKVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5hc3luYygpLnRoZW4ob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpXG4gIH1cblxuICAvKipcbiAgICogUHJvY2Vzc2VzIGlucHV0IENTUyB0aHJvdWdoIHN5bmNocm9ub3VzIGFuZCBhc3luY2hyb25vdXMgcGx1Z2luc1xuICAgKiBhbmQgY2FsbHMgb25SZWplY3RlZCBmb3IgZWFjaCBlcnJvciB0aHJvd24gaW4gYW55IHBsdWdpbi5cbiAgICpcbiAgICogSXQgaW1wbGVtZW50cyBzdGFuZGFyZCBQcm9taXNlIEFQSS5cbiAgICpcbiAgICogQHBhcmFtIHtvblJlamVjdGVkfSBvblJlamVjdGVkIENhbGxiYWNrIHdpbGwgYmUgZXhlY3V0ZWQgb24gYW55IGVycm9yLlxuICAgKlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBQcm9taXNlIEFQSSB0byBtYWtlIHF1ZXVlLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBwb3N0Y3NzKFtjc3NuZXh0XSkucHJvY2Vzcyhjc3MpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICogICBjb25zb2xlLmxvZyhyZXN1bHQuY3NzKVxuICAgKiB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAqICAgY29uc29sZS5lcnJvcihlcnJvcilcbiAgICogfSlcbiAgICovXG4gIGNhdGNoIChvblJlamVjdGVkKSB7XG4gICAgcmV0dXJuIHRoaXMuYXN5bmMoKS5jYXRjaChvblJlamVjdGVkKVxuICB9XG4gIC8qKlxuICAgKiBQcm9jZXNzZXMgaW5wdXQgQ1NTIHRocm91Z2ggc3luY2hyb25vdXMgYW5kIGFzeW5jaHJvbm91cyBwbHVnaW5zXG4gICAqIGFuZCBjYWxscyBvbkZpbmFsbHkgb24gYW55IGVycm9yIG9yIHdoZW4gYWxsIHBsdWdpbnMgd2lsbCBmaW5pc2ggd29yay5cbiAgICpcbiAgICogSXQgaW1wbGVtZW50cyBzdGFuZGFyZCBQcm9taXNlIEFQSS5cbiAgICpcbiAgICogQHBhcmFtIHtvbkZpbmFsbHl9IG9uRmluYWxseSBDYWxsYmFjayB3aWxsIGJlIGV4ZWN1dGVkIG9uIGFueSBlcnJvciBvclxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gYWxsIHBsdWdpbnMgd2lsbCBmaW5pc2ggd29yay5cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX0gUHJvbWlzZSBBUEkgdG8gbWFrZSBxdWV1ZS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogcG9zdGNzcyhbY3NzbmV4dF0pLnByb2Nlc3MoY3NzKS5maW5hbGx5KCgpID0+IHtcbiAgICogICBjb25zb2xlLmxvZygncHJvY2Vzc2luZyBlbmRlZCcpXG4gICAqIH0pXG4gICAqL1xuICBmaW5hbGx5IChvbkZpbmFsbHkpIHtcbiAgICByZXR1cm4gdGhpcy5hc3luYygpLnRoZW4ob25GaW5hbGx5LCBvbkZpbmFsbHkpXG4gIH1cblxuICBoYW5kbGVFcnJvciAoZXJyb3IsIHBsdWdpbikge1xuICAgIHRyeSB7XG4gICAgICB0aGlzLmVycm9yID0gZXJyb3JcbiAgICAgIGlmIChlcnJvci5uYW1lID09PSAnQ3NzU3ludGF4RXJyb3InICYmICFlcnJvci5wbHVnaW4pIHtcbiAgICAgICAgZXJyb3IucGx1Z2luID0gcGx1Z2luLnBvc3Rjc3NQbHVnaW5cbiAgICAgICAgZXJyb3Iuc2V0TWVzc2FnZSgpXG4gICAgICB9IGVsc2UgaWYgKHBsdWdpbi5wb3N0Y3NzVmVyc2lvbikge1xuICAgICAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICAgICAgICAgIGxldCBwbHVnaW5OYW1lID0gcGx1Z2luLnBvc3Rjc3NQbHVnaW5cbiAgICAgICAgICBsZXQgcGx1Z2luVmVyID0gcGx1Z2luLnBvc3Rjc3NWZXJzaW9uXG4gICAgICAgICAgbGV0IHJ1bnRpbWVWZXIgPSB0aGlzLnJlc3VsdC5wcm9jZXNzb3IudmVyc2lvblxuICAgICAgICAgIGxldCBhID0gcGx1Z2luVmVyLnNwbGl0KCcuJylcbiAgICAgICAgICBsZXQgYiA9IHJ1bnRpbWVWZXIuc3BsaXQoJy4nKVxuXG4gICAgICAgICAgaWYgKGFbMF0gIT09IGJbMF0gfHwgcGFyc2VJbnQoYVsxXSkgPiBwYXJzZUludChiWzFdKSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgICAgJ1Vua25vd24gZXJyb3IgZnJvbSBQb3N0Q1NTIHBsdWdpbi4gWW91ciBjdXJyZW50IFBvc3RDU1MgJyArXG4gICAgICAgICAgICAgICd2ZXJzaW9uIGlzICcgKyBydW50aW1lVmVyICsgJywgYnV0ICcgKyBwbHVnaW5OYW1lICsgJyB1c2VzICcgK1xuICAgICAgICAgICAgICBwbHVnaW5WZXIgKyAnLiBQZXJoYXBzIHRoaXMgaXMgdGhlIHNvdXJjZSBvZiB0aGUgZXJyb3IgYmVsb3cuJ1xuICAgICAgICAgICAgKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgaWYgKGNvbnNvbGUgJiYgY29uc29sZS5lcnJvcikgY29uc29sZS5lcnJvcihlcnIpXG4gICAgfVxuICB9XG5cbiAgYXN5bmNUaWNrIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICBpZiAodGhpcy5wbHVnaW4gPj0gdGhpcy5wcm9jZXNzb3IucGx1Z2lucy5sZW5ndGgpIHtcbiAgICAgIHRoaXMucHJvY2Vzc2VkID0gdHJ1ZVxuICAgICAgcmV0dXJuIHJlc29sdmUoKVxuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBsZXQgcGx1Z2luID0gdGhpcy5wcm9jZXNzb3IucGx1Z2luc1t0aGlzLnBsdWdpbl1cbiAgICAgIGxldCBwcm9taXNlID0gdGhpcy5ydW4ocGx1Z2luKVxuICAgICAgdGhpcy5wbHVnaW4gKz0gMVxuXG4gICAgICBpZiAoaXNQcm9taXNlKHByb21pc2UpKSB7XG4gICAgICAgIHByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgICAgdGhpcy5hc3luY1RpY2socmVzb2x2ZSwgcmVqZWN0KVxuICAgICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgdGhpcy5oYW5kbGVFcnJvcihlcnJvciwgcGx1Z2luKVxuICAgICAgICAgIHRoaXMucHJvY2Vzc2VkID0gdHJ1ZVxuICAgICAgICAgIHJlamVjdChlcnJvcilcbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYXN5bmNUaWNrKHJlc29sdmUsIHJlamVjdClcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5wcm9jZXNzZWQgPSB0cnVlXG4gICAgICByZWplY3QoZXJyb3IpXG4gICAgfVxuICB9XG5cbiAgYXN5bmMgKCkge1xuICAgIGlmICh0aGlzLnByb2Nlc3NlZCkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgaWYgKHRoaXMuZXJyb3IpIHtcbiAgICAgICAgICByZWplY3QodGhpcy5lcnJvcilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXNvbHZlKHRoaXMuc3RyaW5naWZ5KCkpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICAgIGlmICh0aGlzLnByb2Nlc3NpbmcpIHtcbiAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NpbmdcbiAgICB9XG5cbiAgICB0aGlzLnByb2Nlc3NpbmcgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBpZiAodGhpcy5lcnJvcikgcmV0dXJuIHJlamVjdCh0aGlzLmVycm9yKVxuICAgICAgdGhpcy5wbHVnaW4gPSAwXG4gICAgICB0aGlzLmFzeW5jVGljayhyZXNvbHZlLCByZWplY3QpXG4gICAgfSkudGhlbigoKSA9PiB7XG4gICAgICB0aGlzLnByb2Nlc3NlZCA9IHRydWVcbiAgICAgIHJldHVybiB0aGlzLnN0cmluZ2lmeSgpXG4gICAgfSlcblxuICAgIHJldHVybiB0aGlzLnByb2Nlc3NpbmdcbiAgfVxuXG4gIHN5bmMgKCkge1xuICAgIGlmICh0aGlzLnByb2Nlc3NlZCkgcmV0dXJuIHRoaXMucmVzdWx0XG4gICAgdGhpcy5wcm9jZXNzZWQgPSB0cnVlXG5cbiAgICBpZiAodGhpcy5wcm9jZXNzaW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdVc2UgcHJvY2Vzcyhjc3MpLnRoZW4oY2IpIHRvIHdvcmsgd2l0aCBhc3luYyBwbHVnaW5zJylcbiAgICB9XG5cbiAgICBpZiAodGhpcy5lcnJvcikgdGhyb3cgdGhpcy5lcnJvclxuXG4gICAgZm9yIChsZXQgcGx1Z2luIG9mIHRoaXMucmVzdWx0LnByb2Nlc3Nvci5wbHVnaW5zKSB7XG4gICAgICBsZXQgcHJvbWlzZSA9IHRoaXMucnVuKHBsdWdpbilcbiAgICAgIGlmIChpc1Byb21pc2UocHJvbWlzZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICdVc2UgcHJvY2Vzcyhjc3MpLnRoZW4oY2IpIHRvIHdvcmsgd2l0aCBhc3luYyBwbHVnaW5zJylcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yZXN1bHRcbiAgfVxuXG4gIHJ1biAocGx1Z2luKSB7XG4gICAgdGhpcy5yZXN1bHQubGFzdFBsdWdpbiA9IHBsdWdpblxuXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBwbHVnaW4odGhpcy5yZXN1bHQucm9vdCwgdGhpcy5yZXN1bHQpXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMuaGFuZGxlRXJyb3IoZXJyb3IsIHBsdWdpbilcbiAgICAgIHRocm93IGVycm9yXG4gICAgfVxuICB9XG5cbiAgc3RyaW5naWZ5ICgpIHtcbiAgICBpZiAodGhpcy5zdHJpbmdpZmllZCkgcmV0dXJuIHRoaXMucmVzdWx0XG4gICAgdGhpcy5zdHJpbmdpZmllZCA9IHRydWVcblxuICAgIHRoaXMuc3luYygpXG5cbiAgICBsZXQgb3B0cyA9IHRoaXMucmVzdWx0Lm9wdHNcbiAgICBsZXQgc3RyID0gc3RyaW5naWZ5XG4gICAgaWYgKG9wdHMuc3ludGF4KSBzdHIgPSBvcHRzLnN5bnRheC5zdHJpbmdpZnlcbiAgICBpZiAob3B0cy5zdHJpbmdpZmllcikgc3RyID0gb3B0cy5zdHJpbmdpZmllclxuICAgIGlmIChzdHIuc3RyaW5naWZ5KSBzdHIgPSBzdHIuc3RyaW5naWZ5XG5cbiAgICBsZXQgbWFwID0gbmV3IE1hcEdlbmVyYXRvcihzdHIsIHRoaXMucmVzdWx0LnJvb3QsIHRoaXMucmVzdWx0Lm9wdHMpXG4gICAgbGV0IGRhdGEgPSBtYXAuZ2VuZXJhdGUoKVxuICAgIHRoaXMucmVzdWx0LmNzcyA9IGRhdGFbMF1cbiAgICB0aGlzLnJlc3VsdC5tYXAgPSBkYXRhWzFdXG5cbiAgICByZXR1cm4gdGhpcy5yZXN1bHRcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBMYXp5UmVzdWx0XG5cbi8qKlxuICogQGNhbGxiYWNrIG9uRnVsZmlsbGVkXG4gKiBAcGFyYW0ge1Jlc3VsdH0gcmVzdWx0XG4gKi9cblxuLyoqXG4gKiBAY2FsbGJhY2sgb25SZWplY3RlZFxuICogQHBhcmFtIHtFcnJvcn0gZXJyb3JcbiAqL1xuIl19
