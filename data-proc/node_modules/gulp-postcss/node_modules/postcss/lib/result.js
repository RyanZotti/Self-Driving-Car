'use strict';

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _warning = require('./warning');

var _warning2 = _interopRequireDefault(_warning);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Provides the result of the PostCSS transformations.
 *
 * A Result instance is returned by {@link LazyResult#then}
 * or {@link Root#toResult} methods.
 *
 * @example
 * postcss([cssnext]).process(css).then(result => {
 *  console.log(result.css)
 * })
 *
 * @example
 * const result2 = postcss.parse(css).toResult()
 */
var Result = function () {
  /**
   * @param {Processor} processor Processor used for this transformation.
   * @param {Root}      root      Root node after all transformations.
   * @param {processOptions} opts Options from the {@link Processor#process}
   *                              or {@link Root#toResult}.
   */
  function Result(processor, root, opts) {
    _classCallCheck(this, Result);

    /**
     * The Processor instance used for this transformation.
     *
     * @type {Processor}
     *
     * @example
     * for (const plugin of result.processor.plugins) {
     *   if (plugin.postcssPlugin === 'postcss-bad') {
     *     throw 'postcss-good is incompatible with postcss-bad'
     *   }
     * })
     */
    this.processor = processor;
    /**
     * Contains messages from plugins (e.g., warnings or custom messages).
     * Each message should have type and plugin properties.
     *
     * @type {Message[]}
     *
     * @example
     * postcss.plugin('postcss-min-browser', () => {
     *   return (root, result) => {
     *     const browsers = detectMinBrowsersByCanIUse(root)
     *     result.messages.push({
     *       type: 'min-browser',
     *       plugin: 'postcss-min-browser',
     *       browsers
     *     })
     *   }
     * })
     */
    this.messages = [];
    /**
     * Root node after all transformations.
     *
     * @type {Root}
     *
     * @example
     * root.toResult().root === root
     */
    this.root = root;
    /**
     * Options from the {@link Processor#process} or {@link Root#toResult} call
     * that produced this Result instance.
     *
     * @type {processOptions}
     *
     * @example
     * root.toResult(opts).opts === opts
     */
    this.opts = opts;
    /**
     * A CSS string representing of {@link Result#root}.
     *
     * @type {string}
     *
     * @example
     * postcss.parse('a{}').toResult().css //=> "a{}"
     */
    this.css = undefined;
    /**
     * An instance of `SourceMapGenerator` class from the `source-map` library,
     * representing changes to the {@link Result#root} instance.
     *
     * @type {SourceMapGenerator}
     *
     * @example
     * result.map.toJSON() //=> { version: 3, file: 'a.css', … }
     *
     * @example
     * if (result.map) {
     *   fs.writeFileSync(result.opts.to + '.map', result.map.toString())
     * }
     */
    this.map = undefined;
  }

  /**
   * Returns for @{link Result#css} content.
   *
   * @example
   * result + '' === result.css
   *
   * @return {string} String representing of {@link Result#root}.
   */


  Result.prototype.toString = function toString() {
    return this.css;
  };

  /**
   * Creates an instance of {@link Warning} and adds it
   * to {@link Result#messages}.
   *
   * @param {string} text        Warning message.
   * @param {Object} [opts]      Warning options.
   * @param {Node}   opts.node   CSS node that caused the warning.
   * @param {string} opts.word   Word in CSS source that caused the warning.
   * @param {number} opts.index  Index in CSS node string that caused
   *                             the warning.
   * @param {string} opts.plugin Name of the plugin that created
   *                             this warning. {@link Result#warn} fills
   *                             this property automatically.
   *
   * @return {Warning} Created warning.
   */


  Result.prototype.warn = function warn(text) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    if (!opts.plugin) {
      if (this.lastPlugin && this.lastPlugin.postcssPlugin) {
        opts.plugin = this.lastPlugin.postcssPlugin;
      }
    }

    var warning = new _warning2.default(text, opts);
    this.messages.push(warning);

    return warning;
  };

  /**
     * Returns warnings from plugins. Filters {@link Warning} instances
     * from {@link Result#messages}.
     *
     * @example
     * result.warnings().forEach(warn => {
     *   console.warn(warn.toString())
     * })
     *
     * @return {Warning[]} Warnings from plugins.
     */


  Result.prototype.warnings = function warnings() {
    return this.messages.filter(function (i) {
      return i.type === 'warning';
    });
  };

  /**
   * An alias for the {@link Result#css} property.
   * Use it with syntaxes that generate non-CSS output.
   *
   * @type {string}
   *
   * @example
   * result.css === result.content
   */


  _createClass(Result, [{
    key: 'content',
    get: function get() {
      return this.css;
    }
  }]);

  return Result;
}();

exports.default = Result;

/**
 * @typedef  {object} Message
 * @property {string} type   Message type.
 * @property {string} plugin Source PostCSS plugin name.
 */

module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJlc3VsdC5lczYiXSwibmFtZXMiOlsiUmVzdWx0IiwicHJvY2Vzc29yIiwicm9vdCIsIm9wdHMiLCJtZXNzYWdlcyIsImNzcyIsInVuZGVmaW5lZCIsIm1hcCIsInRvU3RyaW5nIiwid2FybiIsInRleHQiLCJwbHVnaW4iLCJsYXN0UGx1Z2luIiwicG9zdGNzc1BsdWdpbiIsIndhcm5pbmciLCJXYXJuaW5nIiwicHVzaCIsIndhcm5pbmdzIiwiZmlsdGVyIiwiaSIsInR5cGUiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOzs7Ozs7OztBQUVBOzs7Ozs7Ozs7Ozs7OztJQWNNQSxNO0FBQ0o7Ozs7OztBQU1BLGtCQUFhQyxTQUFiLEVBQXdCQyxJQUF4QixFQUE4QkMsSUFBOUIsRUFBb0M7QUFBQTs7QUFDbEM7Ozs7Ozs7Ozs7OztBQVlBLFNBQUtGLFNBQUwsR0FBaUJBLFNBQWpCO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQSxTQUFLRyxRQUFMLEdBQWdCLEVBQWhCO0FBQ0E7Ozs7Ozs7O0FBUUEsU0FBS0YsSUFBTCxHQUFZQSxJQUFaO0FBQ0E7Ozs7Ozs7OztBQVNBLFNBQUtDLElBQUwsR0FBWUEsSUFBWjtBQUNBOzs7Ozs7OztBQVFBLFNBQUtFLEdBQUwsR0FBV0MsU0FBWDtBQUNBOzs7Ozs7Ozs7Ozs7OztBQWNBLFNBQUtDLEdBQUwsR0FBV0QsU0FBWDtBQUNEOztBQUVEOzs7Ozs7Ozs7O21CQVFBRSxRLHVCQUFZO0FBQ1YsV0FBTyxLQUFLSCxHQUFaO0FBQ0QsRzs7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7O21CQWdCQUksSSxpQkFBTUMsSSxFQUFrQjtBQUFBLFFBQVpQLElBQVksdUVBQUwsRUFBSzs7QUFDdEIsUUFBSSxDQUFDQSxLQUFLUSxNQUFWLEVBQWtCO0FBQ2hCLFVBQUksS0FBS0MsVUFBTCxJQUFtQixLQUFLQSxVQUFMLENBQWdCQyxhQUF2QyxFQUFzRDtBQUNwRFYsYUFBS1EsTUFBTCxHQUFjLEtBQUtDLFVBQUwsQ0FBZ0JDLGFBQTlCO0FBQ0Q7QUFDRjs7QUFFRCxRQUFJQyxVQUFVLElBQUlDLGlCQUFKLENBQVlMLElBQVosRUFBa0JQLElBQWxCLENBQWQ7QUFDQSxTQUFLQyxRQUFMLENBQWNZLElBQWQsQ0FBbUJGLE9BQW5COztBQUVBLFdBQU9BLE9BQVA7QUFDRCxHOztBQUVEOzs7Ozs7Ozs7Ozs7O21CQVdBRyxRLHVCQUFZO0FBQ1YsV0FBTyxLQUFLYixRQUFMLENBQWNjLE1BQWQsQ0FBcUI7QUFBQSxhQUFLQyxFQUFFQyxJQUFGLEtBQVcsU0FBaEI7QUFBQSxLQUFyQixDQUFQO0FBQ0QsRzs7QUFFRDs7Ozs7Ozs7Ozs7Ozt3QkFTZTtBQUNiLGFBQU8sS0FBS2YsR0FBWjtBQUNEOzs7Ozs7a0JBR1lMLE07O0FBRWYiLCJmaWxlIjoicmVzdWx0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFdhcm5pbmcgZnJvbSAnLi93YXJuaW5nJ1xuXG4vKipcbiAqIFByb3ZpZGVzIHRoZSByZXN1bHQgb2YgdGhlIFBvc3RDU1MgdHJhbnNmb3JtYXRpb25zLlxuICpcbiAqIEEgUmVzdWx0IGluc3RhbmNlIGlzIHJldHVybmVkIGJ5IHtAbGluayBMYXp5UmVzdWx0I3RoZW59XG4gKiBvciB7QGxpbmsgUm9vdCN0b1Jlc3VsdH0gbWV0aG9kcy5cbiAqXG4gKiBAZXhhbXBsZVxuICogcG9zdGNzcyhbY3NzbmV4dF0pLnByb2Nlc3MoY3NzKS50aGVuKHJlc3VsdCA9PiB7XG4gKiAgY29uc29sZS5sb2cocmVzdWx0LmNzcylcbiAqIH0pXG4gKlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IHJlc3VsdDIgPSBwb3N0Y3NzLnBhcnNlKGNzcykudG9SZXN1bHQoKVxuICovXG5jbGFzcyBSZXN1bHQge1xuICAvKipcbiAgICogQHBhcmFtIHtQcm9jZXNzb3J9IHByb2Nlc3NvciBQcm9jZXNzb3IgdXNlZCBmb3IgdGhpcyB0cmFuc2Zvcm1hdGlvbi5cbiAgICogQHBhcmFtIHtSb290fSAgICAgIHJvb3QgICAgICBSb290IG5vZGUgYWZ0ZXIgYWxsIHRyYW5zZm9ybWF0aW9ucy5cbiAgICogQHBhcmFtIHtwcm9jZXNzT3B0aW9uc30gb3B0cyBPcHRpb25zIGZyb20gdGhlIHtAbGluayBQcm9jZXNzb3IjcHJvY2Vzc31cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvciB7QGxpbmsgUm9vdCN0b1Jlc3VsdH0uXG4gICAqL1xuICBjb25zdHJ1Y3RvciAocHJvY2Vzc29yLCByb290LCBvcHRzKSB7XG4gICAgLyoqXG4gICAgICogVGhlIFByb2Nlc3NvciBpbnN0YW5jZSB1c2VkIGZvciB0aGlzIHRyYW5zZm9ybWF0aW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge1Byb2Nlc3Nvcn1cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogZm9yIChjb25zdCBwbHVnaW4gb2YgcmVzdWx0LnByb2Nlc3Nvci5wbHVnaW5zKSB7XG4gICAgICogICBpZiAocGx1Z2luLnBvc3Rjc3NQbHVnaW4gPT09ICdwb3N0Y3NzLWJhZCcpIHtcbiAgICAgKiAgICAgdGhyb3cgJ3Bvc3Rjc3MtZ29vZCBpcyBpbmNvbXBhdGlibGUgd2l0aCBwb3N0Y3NzLWJhZCdcbiAgICAgKiAgIH1cbiAgICAgKiB9KVxuICAgICAqL1xuICAgIHRoaXMucHJvY2Vzc29yID0gcHJvY2Vzc29yXG4gICAgLyoqXG4gICAgICogQ29udGFpbnMgbWVzc2FnZXMgZnJvbSBwbHVnaW5zIChlLmcuLCB3YXJuaW5ncyBvciBjdXN0b20gbWVzc2FnZXMpLlxuICAgICAqIEVhY2ggbWVzc2FnZSBzaG91bGQgaGF2ZSB0eXBlIGFuZCBwbHVnaW4gcHJvcGVydGllcy5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtNZXNzYWdlW119XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHBvc3Rjc3MucGx1Z2luKCdwb3N0Y3NzLW1pbi1icm93c2VyJywgKCkgPT4ge1xuICAgICAqICAgcmV0dXJuIChyb290LCByZXN1bHQpID0+IHtcbiAgICAgKiAgICAgY29uc3QgYnJvd3NlcnMgPSBkZXRlY3RNaW5Ccm93c2Vyc0J5Q2FuSVVzZShyb290KVxuICAgICAqICAgICByZXN1bHQubWVzc2FnZXMucHVzaCh7XG4gICAgICogICAgICAgdHlwZTogJ21pbi1icm93c2VyJyxcbiAgICAgKiAgICAgICBwbHVnaW46ICdwb3N0Y3NzLW1pbi1icm93c2VyJyxcbiAgICAgKiAgICAgICBicm93c2Vyc1xuICAgICAqICAgICB9KVxuICAgICAqICAgfVxuICAgICAqIH0pXG4gICAgICovXG4gICAgdGhpcy5tZXNzYWdlcyA9IFtdXG4gICAgLyoqXG4gICAgICogUm9vdCBub2RlIGFmdGVyIGFsbCB0cmFuc2Zvcm1hdGlvbnMuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7Um9vdH1cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogcm9vdC50b1Jlc3VsdCgpLnJvb3QgPT09IHJvb3RcbiAgICAgKi9cbiAgICB0aGlzLnJvb3QgPSByb290XG4gICAgLyoqXG4gICAgICogT3B0aW9ucyBmcm9tIHRoZSB7QGxpbmsgUHJvY2Vzc29yI3Byb2Nlc3N9IG9yIHtAbGluayBSb290I3RvUmVzdWx0fSBjYWxsXG4gICAgICogdGhhdCBwcm9kdWNlZCB0aGlzIFJlc3VsdCBpbnN0YW5jZS5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtwcm9jZXNzT3B0aW9uc31cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogcm9vdC50b1Jlc3VsdChvcHRzKS5vcHRzID09PSBvcHRzXG4gICAgICovXG4gICAgdGhpcy5vcHRzID0gb3B0c1xuICAgIC8qKlxuICAgICAqIEEgQ1NTIHN0cmluZyByZXByZXNlbnRpbmcgb2Yge0BsaW5rIFJlc3VsdCNyb290fS5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHBvc3Rjc3MucGFyc2UoJ2F7fScpLnRvUmVzdWx0KCkuY3NzIC8vPT4gXCJhe31cIlxuICAgICAqL1xuICAgIHRoaXMuY3NzID0gdW5kZWZpbmVkXG4gICAgLyoqXG4gICAgICogQW4gaW5zdGFuY2Ugb2YgYFNvdXJjZU1hcEdlbmVyYXRvcmAgY2xhc3MgZnJvbSB0aGUgYHNvdXJjZS1tYXBgIGxpYnJhcnksXG4gICAgICogcmVwcmVzZW50aW5nIGNoYW5nZXMgdG8gdGhlIHtAbGluayBSZXN1bHQjcm9vdH0gaW5zdGFuY2UuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7U291cmNlTWFwR2VuZXJhdG9yfVxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiByZXN1bHQubWFwLnRvSlNPTigpIC8vPT4geyB2ZXJzaW9uOiAzLCBmaWxlOiAnYS5jc3MnLCDigKYgfVxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBpZiAocmVzdWx0Lm1hcCkge1xuICAgICAqICAgZnMud3JpdGVGaWxlU3luYyhyZXN1bHQub3B0cy50byArICcubWFwJywgcmVzdWx0Lm1hcC50b1N0cmluZygpKVxuICAgICAqIH1cbiAgICAgKi9cbiAgICB0aGlzLm1hcCA9IHVuZGVmaW5lZFxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgZm9yIEB7bGluayBSZXN1bHQjY3NzfSBjb250ZW50LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiByZXN1bHQgKyAnJyA9PT0gcmVzdWx0LmNzc1xuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9IFN0cmluZyByZXByZXNlbnRpbmcgb2Yge0BsaW5rIFJlc3VsdCNyb290fS5cbiAgICovXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gdGhpcy5jc3NcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGluc3RhbmNlIG9mIHtAbGluayBXYXJuaW5nfSBhbmQgYWRkcyBpdFxuICAgKiB0byB7QGxpbmsgUmVzdWx0I21lc3NhZ2VzfS5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgICAgICAgIFdhcm5pbmcgbWVzc2FnZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRzXSAgICAgIFdhcm5pbmcgb3B0aW9ucy5cbiAgICogQHBhcmFtIHtOb2RlfSAgIG9wdHMubm9kZSAgIENTUyBub2RlIHRoYXQgY2F1c2VkIHRoZSB3YXJuaW5nLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0cy53b3JkICAgV29yZCBpbiBDU1Mgc291cmNlIHRoYXQgY2F1c2VkIHRoZSB3YXJuaW5nLlxuICAgKiBAcGFyYW0ge251bWJlcn0gb3B0cy5pbmRleCAgSW5kZXggaW4gQ1NTIG5vZGUgc3RyaW5nIHRoYXQgY2F1c2VkXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgd2FybmluZy5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG9wdHMucGx1Z2luIE5hbWUgb2YgdGhlIHBsdWdpbiB0aGF0IGNyZWF0ZWRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMgd2FybmluZy4ge0BsaW5rIFJlc3VsdCN3YXJufSBmaWxsc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcyBwcm9wZXJ0eSBhdXRvbWF0aWNhbGx5LlxuICAgKlxuICAgKiBAcmV0dXJuIHtXYXJuaW5nfSBDcmVhdGVkIHdhcm5pbmcuXG4gICAqL1xuICB3YXJuICh0ZXh0LCBvcHRzID0geyB9KSB7XG4gICAgaWYgKCFvcHRzLnBsdWdpbikge1xuICAgICAgaWYgKHRoaXMubGFzdFBsdWdpbiAmJiB0aGlzLmxhc3RQbHVnaW4ucG9zdGNzc1BsdWdpbikge1xuICAgICAgICBvcHRzLnBsdWdpbiA9IHRoaXMubGFzdFBsdWdpbi5wb3N0Y3NzUGx1Z2luXG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IHdhcm5pbmcgPSBuZXcgV2FybmluZyh0ZXh0LCBvcHRzKVxuICAgIHRoaXMubWVzc2FnZXMucHVzaCh3YXJuaW5nKVxuXG4gICAgcmV0dXJuIHdhcm5pbmdcbiAgfVxuXG4gIC8qKlxuICAgICAqIFJldHVybnMgd2FybmluZ3MgZnJvbSBwbHVnaW5zLiBGaWx0ZXJzIHtAbGluayBXYXJuaW5nfSBpbnN0YW5jZXNcbiAgICAgKiBmcm9tIHtAbGluayBSZXN1bHQjbWVzc2FnZXN9LlxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiByZXN1bHQud2FybmluZ3MoKS5mb3JFYWNoKHdhcm4gPT4ge1xuICAgICAqICAgY29uc29sZS53YXJuKHdhcm4udG9TdHJpbmcoKSlcbiAgICAgKiB9KVxuICAgICAqXG4gICAgICogQHJldHVybiB7V2FybmluZ1tdfSBXYXJuaW5ncyBmcm9tIHBsdWdpbnMuXG4gICAgICovXG4gIHdhcm5pbmdzICgpIHtcbiAgICByZXR1cm4gdGhpcy5tZXNzYWdlcy5maWx0ZXIoaSA9PiBpLnR5cGUgPT09ICd3YXJuaW5nJylcbiAgfVxuXG4gIC8qKlxuICAgKiBBbiBhbGlhcyBmb3IgdGhlIHtAbGluayBSZXN1bHQjY3NzfSBwcm9wZXJ0eS5cbiAgICogVXNlIGl0IHdpdGggc3ludGF4ZXMgdGhhdCBnZW5lcmF0ZSBub24tQ1NTIG91dHB1dC5cbiAgICpcbiAgICogQHR5cGUge3N0cmluZ31cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogcmVzdWx0LmNzcyA9PT0gcmVzdWx0LmNvbnRlbnRcbiAgICovXG4gIGdldCBjb250ZW50ICgpIHtcbiAgICByZXR1cm4gdGhpcy5jc3NcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBSZXN1bHRcblxuLyoqXG4gKiBAdHlwZWRlZiAge29iamVjdH0gTWVzc2FnZVxuICogQHByb3BlcnR5IHtzdHJpbmd9IHR5cGUgICBNZXNzYWdlIHR5cGUuXG4gKiBAcHJvcGVydHkge3N0cmluZ30gcGx1Z2luIFNvdXJjZSBQb3N0Q1NTIHBsdWdpbiBuYW1lLlxuICovXG4iXX0=
