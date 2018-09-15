'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Represents a plugin’s warning. It can be created using {@link Node#warn}.
 *
 * @example
 * if (decl.important) {
 *   decl.warn(result, 'Avoid !important', { word: '!important' })
 * }
 */
var Warning = function () {
  /**
   * @param {string} text        Warning message.
   * @param {Object} [opts]      Warning options.
   * @param {Node}   opts.node   CSS node that caused the warning.
   * @param {string} opts.word   Word in CSS source that caused the warning.
   * @param {number} opts.index  Index in CSS node string that caused
   *                             the warning.
   * @param {string} opts.plugin Name of the plugin that created
   *                             this warning. {@link Result#warn} fills
   *                             this property automatically.
   */
  function Warning(text) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Warning);

    /**
     * Type to filter warnings from {@link Result#messages}.
     * Always equal to `"warning"`.
     *
     * @type {string}
     *
     * @example
     * const nonWarning = result.messages.filter(i => i.type !== 'warning')
     */
    this.type = 'warning';
    /**
     * The warning message.
     *
     * @type {string}
     *
     * @example
     * warning.text //=> 'Try to avoid !important'
     */
    this.text = text;

    if (opts.node && opts.node.source) {
      var pos = opts.node.positionBy(opts);
      /**
       * Line in the input file with this warning’s source.
       * @type {number}
       *
       * @example
       * warning.line //=> 5
       */
      this.line = pos.line;
      /**
       * Column in the input file with this warning’s source.
       *
       * @type {number}
       *
       * @example
       * warning.column //=> 6
       */
      this.column = pos.column;
    }

    for (var opt in opts) {
      this[opt] = opts[opt];
    }
  }

  /**
   * Returns a warning position and message.
   *
   * @example
   * warning.toString() //=> 'postcss-lint:a.css:10:14: Avoid !important'
   *
   * @return {string} Warning position and message.
   */


  Warning.prototype.toString = function toString() {
    if (this.node) {
      return this.node.error(this.text, {
        plugin: this.plugin,
        index: this.index,
        word: this.word
      }).message;
    } else if (this.plugin) {
      return this.plugin + ': ' + this.text;
    } else {
      return this.text;
    }
  };

  /**
   * @memberof Warning#
   * @member {string} plugin The name of the plugin that created
   *                         it will fill this property automatically.
   *                         this warning. When you call {@link Node#warn}
   *
   * @example
   * warning.plugin //=> 'postcss-important'
   */

  /**
   * @memberof Warning#
   * @member {Node} node Contains the CSS node that caused the warning.
   *
   * @example
   * warning.node.toString() //=> 'color: white !important'
   */


  return Warning;
}();

exports.default = Warning;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndhcm5pbmcuZXM2Il0sIm5hbWVzIjpbIldhcm5pbmciLCJ0ZXh0Iiwib3B0cyIsInR5cGUiLCJub2RlIiwic291cmNlIiwicG9zIiwicG9zaXRpb25CeSIsImxpbmUiLCJjb2x1bW4iLCJvcHQiLCJ0b1N0cmluZyIsImVycm9yIiwicGx1Z2luIiwiaW5kZXgiLCJ3b3JkIiwibWVzc2FnZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7Ozs7O0lBUU1BLE87QUFDSjs7Ozs7Ozs7Ozs7QUFXQSxtQkFBYUMsSUFBYixFQUErQjtBQUFBLFFBQVpDLElBQVksdUVBQUwsRUFBSzs7QUFBQTs7QUFDN0I7Ozs7Ozs7OztBQVNBLFNBQUtDLElBQUwsR0FBWSxTQUFaO0FBQ0E7Ozs7Ozs7O0FBUUEsU0FBS0YsSUFBTCxHQUFZQSxJQUFaOztBQUVBLFFBQUlDLEtBQUtFLElBQUwsSUFBYUYsS0FBS0UsSUFBTCxDQUFVQyxNQUEzQixFQUFtQztBQUNqQyxVQUFJQyxNQUFNSixLQUFLRSxJQUFMLENBQVVHLFVBQVYsQ0FBcUJMLElBQXJCLENBQVY7QUFDQTs7Ozs7OztBQU9BLFdBQUtNLElBQUwsR0FBWUYsSUFBSUUsSUFBaEI7QUFDQTs7Ozs7Ozs7QUFRQSxXQUFLQyxNQUFMLEdBQWNILElBQUlHLE1BQWxCO0FBQ0Q7O0FBRUQsU0FBSyxJQUFJQyxHQUFULElBQWdCUixJQUFoQjtBQUFzQixXQUFLUSxHQUFMLElBQVlSLEtBQUtRLEdBQUwsQ0FBWjtBQUF0QjtBQUNEOztBQUVEOzs7Ozs7Ozs7O29CQVFBQyxRLHVCQUFZO0FBQ1YsUUFBSSxLQUFLUCxJQUFULEVBQWU7QUFDYixhQUFPLEtBQUtBLElBQUwsQ0FBVVEsS0FBVixDQUFnQixLQUFLWCxJQUFyQixFQUEyQjtBQUNoQ1ksZ0JBQVEsS0FBS0EsTUFEbUI7QUFFaENDLGVBQU8sS0FBS0EsS0FGb0I7QUFHaENDLGNBQU0sS0FBS0E7QUFIcUIsT0FBM0IsRUFJSkMsT0FKSDtBQUtELEtBTkQsTUFNTyxJQUFJLEtBQUtILE1BQVQsRUFBaUI7QUFDdEIsYUFBTyxLQUFLQSxNQUFMLEdBQWMsSUFBZCxHQUFxQixLQUFLWixJQUFqQztBQUNELEtBRk0sTUFFQTtBQUNMLGFBQU8sS0FBS0EsSUFBWjtBQUNEO0FBQ0YsRzs7QUFFRDs7Ozs7Ozs7OztBQVVBOzs7Ozs7Ozs7Ozs7a0JBU2FELE8iLCJmaWxlIjoid2FybmluZy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogUmVwcmVzZW50cyBhIHBsdWdpbuKAmXMgd2FybmluZy4gSXQgY2FuIGJlIGNyZWF0ZWQgdXNpbmcge0BsaW5rIE5vZGUjd2Fybn0uXG4gKlxuICogQGV4YW1wbGVcbiAqIGlmIChkZWNsLmltcG9ydGFudCkge1xuICogICBkZWNsLndhcm4ocmVzdWx0LCAnQXZvaWQgIWltcG9ydGFudCcsIHsgd29yZDogJyFpbXBvcnRhbnQnIH0pXG4gKiB9XG4gKi9cbmNsYXNzIFdhcm5pbmcge1xuICAvKipcbiAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgICAgICAgIFdhcm5pbmcgbWVzc2FnZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRzXSAgICAgIFdhcm5pbmcgb3B0aW9ucy5cbiAgICogQHBhcmFtIHtOb2RlfSAgIG9wdHMubm9kZSAgIENTUyBub2RlIHRoYXQgY2F1c2VkIHRoZSB3YXJuaW5nLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0cy53b3JkICAgV29yZCBpbiBDU1Mgc291cmNlIHRoYXQgY2F1c2VkIHRoZSB3YXJuaW5nLlxuICAgKiBAcGFyYW0ge251bWJlcn0gb3B0cy5pbmRleCAgSW5kZXggaW4gQ1NTIG5vZGUgc3RyaW5nIHRoYXQgY2F1c2VkXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGUgd2FybmluZy5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG9wdHMucGx1Z2luIE5hbWUgb2YgdGhlIHBsdWdpbiB0aGF0IGNyZWF0ZWRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMgd2FybmluZy4ge0BsaW5rIFJlc3VsdCN3YXJufSBmaWxsc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcyBwcm9wZXJ0eSBhdXRvbWF0aWNhbGx5LlxuICAgKi9cbiAgY29uc3RydWN0b3IgKHRleHQsIG9wdHMgPSB7IH0pIHtcbiAgICAvKipcbiAgICAgKiBUeXBlIHRvIGZpbHRlciB3YXJuaW5ncyBmcm9tIHtAbGluayBSZXN1bHQjbWVzc2FnZXN9LlxuICAgICAqIEFsd2F5cyBlcXVhbCB0byBgXCJ3YXJuaW5nXCJgLlxuICAgICAqXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogY29uc3Qgbm9uV2FybmluZyA9IHJlc3VsdC5tZXNzYWdlcy5maWx0ZXIoaSA9PiBpLnR5cGUgIT09ICd3YXJuaW5nJylcbiAgICAgKi9cbiAgICB0aGlzLnR5cGUgPSAnd2FybmluZydcbiAgICAvKipcbiAgICAgKiBUaGUgd2FybmluZyBtZXNzYWdlLlxuICAgICAqXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogd2FybmluZy50ZXh0IC8vPT4gJ1RyeSB0byBhdm9pZCAhaW1wb3J0YW50J1xuICAgICAqL1xuICAgIHRoaXMudGV4dCA9IHRleHRcblxuICAgIGlmIChvcHRzLm5vZGUgJiYgb3B0cy5ub2RlLnNvdXJjZSkge1xuICAgICAgbGV0IHBvcyA9IG9wdHMubm9kZS5wb3NpdGlvbkJ5KG9wdHMpXG4gICAgICAvKipcbiAgICAgICAqIExpbmUgaW4gdGhlIGlucHV0IGZpbGUgd2l0aCB0aGlzIHdhcm5pbmfigJlzIHNvdXJjZS5cbiAgICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICAgKlxuICAgICAgICogQGV4YW1wbGVcbiAgICAgICAqIHdhcm5pbmcubGluZSAvLz0+IDVcbiAgICAgICAqL1xuICAgICAgdGhpcy5saW5lID0gcG9zLmxpbmVcbiAgICAgIC8qKlxuICAgICAgICogQ29sdW1uIGluIHRoZSBpbnB1dCBmaWxlIHdpdGggdGhpcyB3YXJuaW5n4oCZcyBzb3VyY2UuXG4gICAgICAgKlxuICAgICAgICogQHR5cGUge251bWJlcn1cbiAgICAgICAqXG4gICAgICAgKiBAZXhhbXBsZVxuICAgICAgICogd2FybmluZy5jb2x1bW4gLy89PiA2XG4gICAgICAgKi9cbiAgICAgIHRoaXMuY29sdW1uID0gcG9zLmNvbHVtblxuICAgIH1cblxuICAgIGZvciAobGV0IG9wdCBpbiBvcHRzKSB0aGlzW29wdF0gPSBvcHRzW29wdF1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEgd2FybmluZyBwb3NpdGlvbiBhbmQgbWVzc2FnZS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogd2FybmluZy50b1N0cmluZygpIC8vPT4gJ3Bvc3Rjc3MtbGludDphLmNzczoxMDoxNDogQXZvaWQgIWltcG9ydGFudCdcbiAgICpcbiAgICogQHJldHVybiB7c3RyaW5nfSBXYXJuaW5nIHBvc2l0aW9uIGFuZCBtZXNzYWdlLlxuICAgKi9cbiAgdG9TdHJpbmcgKCkge1xuICAgIGlmICh0aGlzLm5vZGUpIHtcbiAgICAgIHJldHVybiB0aGlzLm5vZGUuZXJyb3IodGhpcy50ZXh0LCB7XG4gICAgICAgIHBsdWdpbjogdGhpcy5wbHVnaW4sXG4gICAgICAgIGluZGV4OiB0aGlzLmluZGV4LFxuICAgICAgICB3b3JkOiB0aGlzLndvcmRcbiAgICAgIH0pLm1lc3NhZ2VcbiAgICB9IGVsc2UgaWYgKHRoaXMucGx1Z2luKSB7XG4gICAgICByZXR1cm4gdGhpcy5wbHVnaW4gKyAnOiAnICsgdGhpcy50ZXh0XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLnRleHRcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlcm9mIFdhcm5pbmcjXG4gICAqIEBtZW1iZXIge3N0cmluZ30gcGx1Z2luIFRoZSBuYW1lIG9mIHRoZSBwbHVnaW4gdGhhdCBjcmVhdGVkXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgIGl0IHdpbGwgZmlsbCB0aGlzIHByb3BlcnR5IGF1dG9tYXRpY2FsbHkuXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMgd2FybmluZy4gV2hlbiB5b3UgY2FsbCB7QGxpbmsgTm9kZSN3YXJufVxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiB3YXJuaW5nLnBsdWdpbiAvLz0+ICdwb3N0Y3NzLWltcG9ydGFudCdcbiAgICovXG5cbiAgLyoqXG4gICAqIEBtZW1iZXJvZiBXYXJuaW5nI1xuICAgKiBAbWVtYmVyIHtOb2RlfSBub2RlIENvbnRhaW5zIHRoZSBDU1Mgbm9kZSB0aGF0IGNhdXNlZCB0aGUgd2FybmluZy5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogd2FybmluZy5ub2RlLnRvU3RyaW5nKCkgLy89PiAnY29sb3I6IHdoaXRlICFpbXBvcnRhbnQnXG4gICAqL1xufVxuXG5leHBvcnQgZGVmYXVsdCBXYXJuaW5nXG4iXX0=
