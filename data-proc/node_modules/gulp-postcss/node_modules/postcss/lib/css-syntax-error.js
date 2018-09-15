'use strict';

exports.__esModule = true;

var _supportsColor = require('supports-color');

var _supportsColor2 = _interopRequireDefault(_supportsColor);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _terminalHighlight = require('./terminal-highlight');

var _terminalHighlight2 = _interopRequireDefault(_terminalHighlight);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * The CSS parser throws this error for broken CSS.
 *
 * Custom parsers can throw this error for broken custom syntax using
 * the {@link Node#error} method.
 *
 * PostCSS will use the input source map to detect the original error location.
 * If you wrote a Sass file, compiled it to CSS and then parsed it with PostCSS,
 * PostCSS will show the original position in the Sass file.
 *
 * If you need the position in the PostCSS input
 * (e.g., to debug the previous compiler), use `error.input.file`.
 *
 * @example
 * // Catching and checking syntax error
 * try {
 *   postcss.parse('a{')
 * } catch (error) {
 *   if (error.name === 'CssSyntaxError') {
 *     error //=> CssSyntaxError
 *   }
 * }
 *
 * @example
 * // Raising error from plugin
 * throw node.error('Unknown variable', { plugin: 'postcss-vars' })
 */
var CssSyntaxError = function () {
  /**
   * @param {string} message  Error message.
   * @param {number} [line]   Source line of the error.
   * @param {number} [column] Source column of the error.
   * @param {string} [source] Source code of the broken file.
   * @param {string} [file]   Absolute path to the broken file.
   * @param {string} [plugin] PostCSS plugin name, if error came from plugin.
   */
  function CssSyntaxError(message, line, column, source, file, plugin) {
    _classCallCheck(this, CssSyntaxError);

    /**
     * Always equal to `'CssSyntaxError'`. You should always check error type
     * by `error.name === 'CssSyntaxError'`
     * instead of `error instanceof CssSyntaxError`,
     * because npm could have several PostCSS versions.
     *
     * @type {string}
     *
     * @example
     * if (error.name === 'CssSyntaxError') {
     *   error //=> CssSyntaxError
     * }
     */
    this.name = 'CssSyntaxError';
    /**
     * Error message.
     *
     * @type {string}
     *
     * @example
     * error.message //=> 'Unclosed block'
     */
    this.reason = message;

    if (file) {
      /**
       * Absolute path to the broken file.
       *
       * @type {string}
       *
       * @example
       * error.file       //=> 'a.sass'
       * error.input.file //=> 'a.css'
       */
      this.file = file;
    }
    if (source) {
      /**
       * Source code of the broken file.
       *
       * @type {string}
       *
       * @example
       * error.source       //=> 'a { b {} }'
       * error.input.column //=> 'a b { }'
       */
      this.source = source;
    }
    if (plugin) {
      /**
       * Plugin name, if error came from plugin.
       *
       * @type {string}
       *
       * @example
       * error.plugin //=> 'postcss-vars'
       */
      this.plugin = plugin;
    }
    if (typeof line !== 'undefined' && typeof column !== 'undefined') {
      /**
       * Source line of the error.
       *
       * @type {number}
       *
       * @example
       * error.line       //=> 2
       * error.input.line //=> 4
       */
      this.line = line;
      /**
       * Source column of the error.
       *
       * @type {number}
       *
       * @example
       * error.column       //=> 1
       * error.input.column //=> 4
       */
      this.column = column;
    }

    this.setMessage();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CssSyntaxError);
    }
  }

  CssSyntaxError.prototype.setMessage = function setMessage() {
    /**
     * Full error text in the GNU error format
     * with plugin, file, line and column.
     *
     * @type {string}
     *
     * @example
     * error.message //=> 'a.css:1:1: Unclosed block'
     */
    this.message = this.plugin ? this.plugin + ': ' : '';
    this.message += this.file ? this.file : '<css input>';
    if (typeof this.line !== 'undefined') {
      this.message += ':' + this.line + ':' + this.column;
    }
    this.message += ': ' + this.reason;
  };

  /**
   * Returns a few lines of CSS source that caused the error.
   *
   * If the CSS has an input source map without `sourceContent`,
   * this method will return an empty string.
   *
   * @param {boolean} [color] Whether arrow will be colored red by terminal
   *                          color codes. By default, PostCSS will detect
   *                          color support by `process.stdout.isTTY`
   *                          and `process.env.NODE_DISABLE_COLORS`.
   *
   * @example
   * error.showSourceCode() //=> "  4 | }
   *                        //      5 | a {
   *                        //    > 6 |   bad
   *                        //        |   ^
   *                        //      7 | }
   *                        //      8 | b {"
   *
   * @return {string} Few lines of CSS source that caused the error.
   */


  CssSyntaxError.prototype.showSourceCode = function showSourceCode(color) {
    var _this = this;

    if (!this.source) return '';

    var css = this.source;
    if (_terminalHighlight2.default) {
      if (typeof color === 'undefined') color = _supportsColor2.default.stdout;
      if (color) css = (0, _terminalHighlight2.default)(css);
    }

    var lines = css.split(/\r?\n/);
    var start = Math.max(this.line - 3, 0);
    var end = Math.min(this.line + 2, lines.length);

    var maxWidth = String(end).length;

    function mark(text) {
      if (color && _chalk2.default.red) {
        return _chalk2.default.red.bold(text);
      } else {
        return text;
      }
    }
    function aside(text) {
      if (color && _chalk2.default.gray) {
        return _chalk2.default.gray(text);
      } else {
        return text;
      }
    }

    return lines.slice(start, end).map(function (line, index) {
      var number = start + 1 + index;
      var gutter = ' ' + (' ' + number).slice(-maxWidth) + ' | ';
      if (number === _this.line) {
        var spacing = aside(gutter.replace(/\d/g, ' ')) + line.slice(0, _this.column - 1).replace(/[^\t]/g, ' ');
        return mark('>') + aside(gutter) + line + '\n ' + spacing + mark('^');
      } else {
        return ' ' + aside(gutter) + line;
      }
    }).join('\n');
  };

  /**
   * Returns error position, message and source code of the broken part.
   *
   * @example
   * error.toString() //=> "CssSyntaxError: app.css:1:1: Unclosed block
   *                  //    > 1 | a {
   *                  //        | ^"
   *
   * @return {string} Error position, message and source code.
   */


  CssSyntaxError.prototype.toString = function toString() {
    var code = this.showSourceCode();
    if (code) {
      code = '\n\n' + code + '\n';
    }
    return this.name + ': ' + this.message + code;
  };

  /**
   * @memberof CssSyntaxError#
   * @member {Input} input Input object with PostCSS internal information
   *                       about input file. If input has source map
   *                       from previous tool, PostCSS will use origin
   *                       (for example, Sass) source. You can use this
   *                       object to get PostCSS input source.
   *
   * @example
   * error.input.file //=> 'a.css'
   * error.file       //=> 'a.sass'
   */


  return CssSyntaxError;
}();

exports.default = CssSyntaxError;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNzcy1zeW50YXgtZXJyb3IuZXM2Il0sIm5hbWVzIjpbIkNzc1N5bnRheEVycm9yIiwibWVzc2FnZSIsImxpbmUiLCJjb2x1bW4iLCJzb3VyY2UiLCJmaWxlIiwicGx1Z2luIiwibmFtZSIsInJlYXNvbiIsInNldE1lc3NhZ2UiLCJFcnJvciIsImNhcHR1cmVTdGFja1RyYWNlIiwic2hvd1NvdXJjZUNvZGUiLCJjb2xvciIsImNzcyIsInRlcm1pbmFsSGlnaGxpZ2h0Iiwic3VwcG9ydHNDb2xvciIsInN0ZG91dCIsImxpbmVzIiwic3BsaXQiLCJzdGFydCIsIk1hdGgiLCJtYXgiLCJlbmQiLCJtaW4iLCJsZW5ndGgiLCJtYXhXaWR0aCIsIlN0cmluZyIsIm1hcmsiLCJ0ZXh0IiwiY2hhbGsiLCJyZWQiLCJib2xkIiwiYXNpZGUiLCJncmF5Iiwic2xpY2UiLCJtYXAiLCJpbmRleCIsIm51bWJlciIsImd1dHRlciIsInNwYWNpbmciLCJyZXBsYWNlIiwiam9pbiIsInRvU3RyaW5nIiwiY29kZSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBOzs7O0FBQ0E7Ozs7QUFFQTs7Ozs7Ozs7QUFFQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBMkJNQSxjO0FBQ0o7Ozs7Ozs7O0FBUUEsMEJBQWFDLE9BQWIsRUFBc0JDLElBQXRCLEVBQTRCQyxNQUE1QixFQUFvQ0MsTUFBcEMsRUFBNENDLElBQTVDLEVBQWtEQyxNQUFsRCxFQUEwRDtBQUFBOztBQUN4RDs7Ozs7Ozs7Ozs7OztBQWFBLFNBQUtDLElBQUwsR0FBWSxnQkFBWjtBQUNBOzs7Ozs7OztBQVFBLFNBQUtDLE1BQUwsR0FBY1AsT0FBZDs7QUFFQSxRQUFJSSxJQUFKLEVBQVU7QUFDUjs7Ozs7Ozs7O0FBU0EsV0FBS0EsSUFBTCxHQUFZQSxJQUFaO0FBQ0Q7QUFDRCxRQUFJRCxNQUFKLEVBQVk7QUFDVjs7Ozs7Ozs7O0FBU0EsV0FBS0EsTUFBTCxHQUFjQSxNQUFkO0FBQ0Q7QUFDRCxRQUFJRSxNQUFKLEVBQVk7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RUFBYyxNQUFLaEMsTUFBTCxHQUFjLENBQTVCLEVBQStCc0MsT0FBL0IsQ0FBdUMsUUFBdkMsRUFBaUQsR0FBakQsQ0FERjtBQUVBLGVBQU9iLEtBQUssR0FBTCxJQUFZSyxNQUFNTSxNQUFOLENBQVosR0FBNEJyQyxJQUE1QixHQUFtQyxLQUFuQyxHQUEyQ3NDLE9BQTNDLEdBQXFEWixLQUFLLEdBQUwsQ0FBNUQ7QUFDRCxPQUpELE1BSU87QUFDTCxlQUFPLE1BQU1LLE1BQU1NLE1BQU4sQ0FBTixHQUFzQnJDLElBQTdCO0FBQ0Q7QUFDRixLQVZNLEVBVUp3QyxJQVZJLENBVUMsSUFWRCxDQUFQO0FBV0QsRzs7QUFFRDs7Ozs7Ozs7Ozs7OzJCQVVBQyxRLHVCQUFZO0FBQ1YsUUFBSUMsT0FBTyxLQUFLaEMsY0FBTCxFQUFYO0FBQ0EsUUFBSWdDLElBQUosRUFBVTtBQUNSQSxhQUFPLFNBQVNBLElBQVQsR0FBZ0IsSUFBdkI7QUFDRDtBQUNELFdBQU8sS0FBS3JDLElBQUwsR0FBWSxJQUFaLEdBQW1CLEtBQUtOLE9BQXhCLEdBQWtDMkMsSUFBekM7QUFDRCxHOztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7OztrQkFjYTVDLGMiLCJmaWxlIjoiY3NzLXN5bnRheC1lcnJvci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBzdXBwb3J0c0NvbG9yIGZyb20gJ3N1cHBvcnRzLWNvbG9yJ1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJ1xuXG5pbXBvcnQgdGVybWluYWxIaWdobGlnaHQgZnJvbSAnLi90ZXJtaW5hbC1oaWdobGlnaHQnXG5cbi8qKlxuICogVGhlIENTUyBwYXJzZXIgdGhyb3dzIHRoaXMgZXJyb3IgZm9yIGJyb2tlbiBDU1MuXG4gKlxuICogQ3VzdG9tIHBhcnNlcnMgY2FuIHRocm93IHRoaXMgZXJyb3IgZm9yIGJyb2tlbiBjdXN0b20gc3ludGF4IHVzaW5nXG4gKiB0aGUge0BsaW5rIE5vZGUjZXJyb3J9IG1ldGhvZC5cbiAqXG4gKiBQb3N0Q1NTIHdpbGwgdXNlIHRoZSBpbnB1dCBzb3VyY2UgbWFwIHRvIGRldGVjdCB0aGUgb3JpZ2luYWwgZXJyb3IgbG9jYXRpb24uXG4gKiBJZiB5b3Ugd3JvdGUgYSBTYXNzIGZpbGUsIGNvbXBpbGVkIGl0IHRvIENTUyBhbmQgdGhlbiBwYXJzZWQgaXQgd2l0aCBQb3N0Q1NTLFxuICogUG9zdENTUyB3aWxsIHNob3cgdGhlIG9yaWdpbmFsIHBvc2l0aW9uIGluIHRoZSBTYXNzIGZpbGUuXG4gKlxuICogSWYgeW91IG5lZWQgdGhlIHBvc2l0aW9uIGluIHRoZSBQb3N0Q1NTIGlucHV0XG4gKiAoZS5nLiwgdG8gZGVidWcgdGhlIHByZXZpb3VzIGNvbXBpbGVyKSwgdXNlIGBlcnJvci5pbnB1dC5maWxlYC5cbiAqXG4gKiBAZXhhbXBsZVxuICogLy8gQ2F0Y2hpbmcgYW5kIGNoZWNraW5nIHN5bnRheCBlcnJvclxuICogdHJ5IHtcbiAqICAgcG9zdGNzcy5wYXJzZSgnYXsnKVxuICogfSBjYXRjaCAoZXJyb3IpIHtcbiAqICAgaWYgKGVycm9yLm5hbWUgPT09ICdDc3NTeW50YXhFcnJvcicpIHtcbiAqICAgICBlcnJvciAvLz0+IENzc1N5bnRheEVycm9yXG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBAZXhhbXBsZVxuICogLy8gUmFpc2luZyBlcnJvciBmcm9tIHBsdWdpblxuICogdGhyb3cgbm9kZS5lcnJvcignVW5rbm93biB2YXJpYWJsZScsIHsgcGx1Z2luOiAncG9zdGNzcy12YXJzJyB9KVxuICovXG5jbGFzcyBDc3NTeW50YXhFcnJvciB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSAgRXJyb3IgbWVzc2FnZS5cbiAgICogQHBhcmFtIHtudW1iZXJ9IFtsaW5lXSAgIFNvdXJjZSBsaW5lIG9mIHRoZSBlcnJvci5cbiAgICogQHBhcmFtIHtudW1iZXJ9IFtjb2x1bW5dIFNvdXJjZSBjb2x1bW4gb2YgdGhlIGVycm9yLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW3NvdXJjZV0gU291cmNlIGNvZGUgb2YgdGhlIGJyb2tlbiBmaWxlLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW2ZpbGVdICAgQWJzb2x1dGUgcGF0aCB0byB0aGUgYnJva2VuIGZpbGUuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbcGx1Z2luXSBQb3N0Q1NTIHBsdWdpbiBuYW1lLCBpZiBlcnJvciBjYW1lIGZyb20gcGx1Z2luLlxuICAgKi9cbiAgY29uc3RydWN0b3IgKG1lc3NhZ2UsIGxpbmUsIGNvbHVtbiwgc291cmNlLCBmaWxlLCBwbHVnaW4pIHtcbiAgICAvKipcbiAgICAgKiBBbHdheXMgZXF1YWwgdG8gYCdDc3NTeW50YXhFcnJvcidgLiBZb3Ugc2hvdWxkIGFsd2F5cyBjaGVjayBlcnJvciB0eXBlXG4gICAgICogYnkgYGVycm9yLm5hbWUgPT09ICdDc3NTeW50YXhFcnJvcidgXG4gICAgICogaW5zdGVhZCBvZiBgZXJyb3IgaW5zdGFuY2VvZiBDc3NTeW50YXhFcnJvcmAsXG4gICAgICogYmVjYXVzZSBucG0gY291bGQgaGF2ZSBzZXZlcmFsIFBvc3RDU1MgdmVyc2lvbnMuXG4gICAgICpcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqXG4gICAgICogQGV4YW1wbGVcbiAgICAgKiBpZiAoZXJyb3IubmFtZSA9PT0gJ0Nzc1N5bnRheEVycm9yJykge1xuICAgICAqICAgZXJyb3IgLy89PiBDc3NTeW50YXhFcnJvclxuICAgICAqIH1cbiAgICAgKi9cbiAgICB0aGlzLm5hbWUgPSAnQ3NzU3ludGF4RXJyb3InXG4gICAgLyoqXG4gICAgICogRXJyb3IgbWVzc2FnZS5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGVycm9yLm1lc3NhZ2UgLy89PiAnVW5jbG9zZWQgYmxvY2snXG4gICAgICovXG4gICAgdGhpcy5yZWFzb24gPSBtZXNzYWdlXG5cbiAgICBpZiAoZmlsZSkge1xuICAgICAgLyoqXG4gICAgICAgKiBBYnNvbHV0ZSBwYXRoIHRvIHRoZSBicm9rZW4gZmlsZS5cbiAgICAgICAqXG4gICAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAgICpcbiAgICAgICAqIEBleGFtcGxlXG4gICAgICAgKiBlcnJvci5maWxlICAgICAgIC8vPT4gJ2Euc2FzcydcbiAgICAgICAqIGVycm9yLmlucHV0LmZpbGUgLy89PiAnYS5jc3MnXG4gICAgICAgKi9cbiAgICAgIHRoaXMuZmlsZSA9IGZpbGVcbiAgICB9XG4gICAgaWYgKHNvdXJjZSkge1xuICAgICAgLyoqXG4gICAgICAgKiBTb3VyY2UgY29kZSBvZiB0aGUgYnJva2VuIGZpbGUuXG4gICAgICAgKlxuICAgICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgICAqXG4gICAgICAgKiBAZXhhbXBsZVxuICAgICAgICogZXJyb3Iuc291cmNlICAgICAgIC8vPT4gJ2EgeyBiIHt9IH0nXG4gICAgICAgKiBlcnJvci5pbnB1dC5jb2x1bW4gLy89PiAnYSBiIHsgfSdcbiAgICAgICAqL1xuICAgICAgdGhpcy5zb3VyY2UgPSBzb3VyY2VcbiAgICB9XG4gICAgaWYgKHBsdWdpbikge1xuICAgICAgLyoqXG4gICAgICAgKiBQbHVnaW4gbmFtZSwgaWYgZXJyb3IgY2FtZSBmcm9tIHBsdWdpbi5cbiAgICAgICAqXG4gICAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAgICpcbiAgICAgICAqIEBleGFtcGxlXG4gICAgICAgKiBlcnJvci5wbHVnaW4gLy89PiAncG9zdGNzcy12YXJzJ1xuICAgICAgICovXG4gICAgICB0aGlzLnBsdWdpbiA9IHBsdWdpblxuICAgIH1cbiAgICBpZiAodHlwZW9mIGxpbmUgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBjb2x1bW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAvKipcbiAgICAgICAqIFNvdXJjZSBsaW5lIG9mIHRoZSBlcnJvci5cbiAgICAgICAqXG4gICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICpcbiAgICAgICAqIEBleGFtcGxlXG4gICAgICAgKiBlcnJvci5saW5lICAgICAgIC8vPT4gMlxuICAgICAgICogZXJyb3IuaW5wdXQubGluZSAvLz0+IDRcbiAgICAgICAqL1xuICAgICAgdGhpcy5saW5lID0gbGluZVxuICAgICAgLyoqXG4gICAgICAgKiBTb3VyY2UgY29sdW1uIG9mIHRoZSBlcnJvci5cbiAgICAgICAqXG4gICAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAgICpcbiAgICAgICAqIEBleGFtcGxlXG4gICAgICAgKiBlcnJvci5jb2x1bW4gICAgICAgLy89PiAxXG4gICAgICAgKiBlcnJvci5pbnB1dC5jb2x1bW4gLy89PiA0XG4gICAgICAgKi9cbiAgICAgIHRoaXMuY29sdW1uID0gY29sdW1uXG4gICAgfVxuXG4gICAgdGhpcy5zZXRNZXNzYWdlKClcblxuICAgIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xuICAgICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgQ3NzU3ludGF4RXJyb3IpXG4gICAgfVxuICB9XG5cbiAgc2V0TWVzc2FnZSAoKSB7XG4gICAgLyoqXG4gICAgICogRnVsbCBlcnJvciB0ZXh0IGluIHRoZSBHTlUgZXJyb3IgZm9ybWF0XG4gICAgICogd2l0aCBwbHVnaW4sIGZpbGUsIGxpbmUgYW5kIGNvbHVtbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGVycm9yLm1lc3NhZ2UgLy89PiAnYS5jc3M6MToxOiBVbmNsb3NlZCBibG9jaydcbiAgICAgKi9cbiAgICB0aGlzLm1lc3NhZ2UgPSB0aGlzLnBsdWdpbiA/IHRoaXMucGx1Z2luICsgJzogJyA6ICcnXG4gICAgdGhpcy5tZXNzYWdlICs9IHRoaXMuZmlsZSA/IHRoaXMuZmlsZSA6ICc8Y3NzIGlucHV0PidcbiAgICBpZiAodHlwZW9mIHRoaXMubGluZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXMubWVzc2FnZSArPSAnOicgKyB0aGlzLmxpbmUgKyAnOicgKyB0aGlzLmNvbHVtblxuICAgIH1cbiAgICB0aGlzLm1lc3NhZ2UgKz0gJzogJyArIHRoaXMucmVhc29uXG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIGZldyBsaW5lcyBvZiBDU1Mgc291cmNlIHRoYXQgY2F1c2VkIHRoZSBlcnJvci5cbiAgICpcbiAgICogSWYgdGhlIENTUyBoYXMgYW4gaW5wdXQgc291cmNlIG1hcCB3aXRob3V0IGBzb3VyY2VDb250ZW50YCxcbiAgICogdGhpcyBtZXRob2Qgd2lsbCByZXR1cm4gYW4gZW1wdHkgc3RyaW5nLlxuICAgKlxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb2xvcl0gV2hldGhlciBhcnJvdyB3aWxsIGJlIGNvbG9yZWQgcmVkIGJ5IHRlcm1pbmFsXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICBjb2xvciBjb2Rlcy4gQnkgZGVmYXVsdCwgUG9zdENTUyB3aWxsIGRldGVjdFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgY29sb3Igc3VwcG9ydCBieSBgcHJvY2Vzcy5zdGRvdXQuaXNUVFlgXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICBhbmQgYHByb2Nlc3MuZW52Lk5PREVfRElTQUJMRV9DT0xPUlNgLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBlcnJvci5zaG93U291cmNlQ29kZSgpIC8vPT4gXCIgIDQgfCB9XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICA1IHwgYSB7XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgPiA2IHwgICBiYWRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgICAgfCAgIF5cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgIDcgfCB9XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICA4IHwgYiB7XCJcbiAgICpcbiAgICogQHJldHVybiB7c3RyaW5nfSBGZXcgbGluZXMgb2YgQ1NTIHNvdXJjZSB0aGF0IGNhdXNlZCB0aGUgZXJyb3IuXG4gICAqL1xuICBzaG93U291cmNlQ29kZSAoY29sb3IpIHtcbiAgICBpZiAoIXRoaXMuc291cmNlKSByZXR1cm4gJydcblxuICAgIGxldCBjc3MgPSB0aGlzLnNvdXJjZVxuICAgIGlmICh0ZXJtaW5hbEhpZ2hsaWdodCkge1xuICAgICAgaWYgKHR5cGVvZiBjb2xvciA9PT0gJ3VuZGVmaW5lZCcpIGNvbG9yID0gc3VwcG9ydHNDb2xvci5zdGRvdXRcbiAgICAgIGlmIChjb2xvcikgY3NzID0gdGVybWluYWxIaWdobGlnaHQoY3NzKVxuICAgIH1cblxuICAgIGxldCBsaW5lcyA9IGNzcy5zcGxpdCgvXFxyP1xcbi8pXG4gICAgbGV0IHN0YXJ0ID0gTWF0aC5tYXgodGhpcy5saW5lIC0gMywgMClcbiAgICBsZXQgZW5kID0gTWF0aC5taW4odGhpcy5saW5lICsgMiwgbGluZXMubGVuZ3RoKVxuXG4gICAgbGV0IG1heFdpZHRoID0gU3RyaW5nKGVuZCkubGVuZ3RoXG5cbiAgICBmdW5jdGlvbiBtYXJrICh0ZXh0KSB7XG4gICAgICBpZiAoY29sb3IgJiYgY2hhbGsucmVkKSB7XG4gICAgICAgIHJldHVybiBjaGFsay5yZWQuYm9sZCh0ZXh0KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHRleHRcbiAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gYXNpZGUgKHRleHQpIHtcbiAgICAgIGlmIChjb2xvciAmJiBjaGFsay5ncmF5KSB7XG4gICAgICAgIHJldHVybiBjaGFsay5ncmF5KHRleHQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGV4dFxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBsaW5lcy5zbGljZShzdGFydCwgZW5kKS5tYXAoKGxpbmUsIGluZGV4KSA9PiB7XG4gICAgICBsZXQgbnVtYmVyID0gc3RhcnQgKyAxICsgaW5kZXhcbiAgICAgIGxldCBndXR0ZXIgPSAnICcgKyAoJyAnICsgbnVtYmVyKS5zbGljZSgtbWF4V2lkdGgpICsgJyB8ICdcbiAgICAgIGlmIChudW1iZXIgPT09IHRoaXMubGluZSkge1xuICAgICAgICBsZXQgc3BhY2luZyA9IGFzaWRlKGd1dHRlci5yZXBsYWNlKC9cXGQvZywgJyAnKSkgK1xuICAgICAgICAgIGxpbmUuc2xpY2UoMCwgdGhpcy5jb2x1bW4gLSAxKS5yZXBsYWNlKC9bXlxcdF0vZywgJyAnKVxuICAgICAgICByZXR1cm4gbWFyaygnPicpICsgYXNpZGUoZ3V0dGVyKSArIGxpbmUgKyAnXFxuICcgKyBzcGFjaW5nICsgbWFyaygnXicpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJyAnICsgYXNpZGUoZ3V0dGVyKSArIGxpbmVcbiAgICAgIH1cbiAgICB9KS5qb2luKCdcXG4nKVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgZXJyb3IgcG9zaXRpb24sIG1lc3NhZ2UgYW5kIHNvdXJjZSBjb2RlIG9mIHRoZSBicm9rZW4gcGFydC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogZXJyb3IudG9TdHJpbmcoKSAvLz0+IFwiQ3NzU3ludGF4RXJyb3I6IGFwcC5jc3M6MToxOiBVbmNsb3NlZCBibG9ja1xuICAgKiAgICAgICAgICAgICAgICAgIC8vICAgID4gMSB8IGEge1xuICAgKiAgICAgICAgICAgICAgICAgIC8vICAgICAgICB8IF5cIlxuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9IEVycm9yIHBvc2l0aW9uLCBtZXNzYWdlIGFuZCBzb3VyY2UgY29kZS5cbiAgICovXG4gIHRvU3RyaW5nICgpIHtcbiAgICBsZXQgY29kZSA9IHRoaXMuc2hvd1NvdXJjZUNvZGUoKVxuICAgIGlmIChjb2RlKSB7XG4gICAgICBjb2RlID0gJ1xcblxcbicgKyBjb2RlICsgJ1xcbidcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubmFtZSArICc6ICcgKyB0aGlzLm1lc3NhZ2UgKyBjb2RlXG4gIH1cblxuICAvKipcbiAgICogQG1lbWJlcm9mIENzc1N5bnRheEVycm9yI1xuICAgKiBAbWVtYmVyIHtJbnB1dH0gaW5wdXQgSW5wdXQgb2JqZWN0IHdpdGggUG9zdENTUyBpbnRlcm5hbCBpbmZvcm1hdGlvblxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgYWJvdXQgaW5wdXQgZmlsZS4gSWYgaW5wdXQgaGFzIHNvdXJjZSBtYXBcbiAgICogICAgICAgICAgICAgICAgICAgICAgIGZyb20gcHJldmlvdXMgdG9vbCwgUG9zdENTUyB3aWxsIHVzZSBvcmlnaW5cbiAgICogICAgICAgICAgICAgICAgICAgICAgIChmb3IgZXhhbXBsZSwgU2Fzcykgc291cmNlLiBZb3UgY2FuIHVzZSB0aGlzXG4gICAqICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QgdG8gZ2V0IFBvc3RDU1MgaW5wdXQgc291cmNlLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBlcnJvci5pbnB1dC5maWxlIC8vPT4gJ2EuY3NzJ1xuICAgKiBlcnJvci5maWxlICAgICAgIC8vPT4gJ2Euc2FzcydcbiAgICovXG59XG5cbmV4cG9ydCBkZWZhdWx0IENzc1N5bnRheEVycm9yXG4iXX0=
