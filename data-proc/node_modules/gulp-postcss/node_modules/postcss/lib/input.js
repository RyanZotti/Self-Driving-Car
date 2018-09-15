'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _cssSyntaxError = require('./css-syntax-error');

var _cssSyntaxError2 = _interopRequireDefault(_cssSyntaxError);

var _previousMap = require('./previous-map');

var _previousMap2 = _interopRequireDefault(_previousMap);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var sequence = 0;

/**
 * Represents the source CSS.
 *
 * @example
 * const root  = postcss.parse(css, { from: file })
 * const input = root.source.input
 */

var Input = function () {
  /**
   * @param {string} css    Input CSS source.
   * @param {object} [opts] {@link Processor#process} options.
   */
  function Input(css) {
    var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Input);

    if (css === null || (typeof css === 'undefined' ? 'undefined' : _typeof(css)) === 'object' && !css.toString) {
      throw new Error('PostCSS received ' + css + ' instead of CSS string');
    }

    /**
     * Input CSS source
     *
     * @type {string}
     *
     * @example
     * const input = postcss.parse('a{}', { from: file }).input
     * input.css //=> "a{}"
     */
    this.css = css.toString();

    if (this.css[0] === '\uFEFF' || this.css[0] === '\uFFFE') {
      this.css = this.css.slice(1);
    }

    if (opts.from) {
      if (/^\w+:\/\//.test(opts.from)) {
        /**
         * The absolute path to the CSS source file defined
         * with the `from` option.
         *
         * @type {string}
         *
         * @example
         * const root = postcss.parse(css, { from: 'a.css' })
         * root.source.input.file //=> '/home/ai/a.css'
         */
        this.file = opts.from;
      } else {
        this.file = _path2.default.resolve(opts.from);
      }
    }

    var map = new _previousMap2.default(this.css, opts);
    if (map.text) {
      /**
       * The input source map passed from a compilation step before PostCSS
       * (for example, from Sass compiler).
       *
       * @type {PreviousMap}
       *
       * @example
       * root.source.input.map.consumer().sources //=> ['a.sass']
       */
      this.map = map;
      var file = map.consumer().file;
      if (!this.file && file) this.file = this.mapResolve(file);
    }

    if (!this.file) {
      sequence += 1;
      /**
       * The unique ID of the CSS source. It will be created if `from` option
       * is not provided (because PostCSS does not know the file path).
       *
       * @type {string}
       *
       * @example
       * const root = postcss.parse(css)
       * root.source.input.file //=> undefined
       * root.source.input.id   //=> "<input css 1>"
       */
      this.id = '<input css ' + sequence + '>';
    }
    if (this.map) this.map.file = this.from;
  }

  Input.prototype.error = function error(message, line, column) {
    var opts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

    var result = void 0;
    var origin = this.origin(line, column);
    if (origin) {
      result = new _cssSyntaxError2.default(message, origin.line, origin.column, origin.source, origin.file, opts.plugin);
    } else {
      result = new _cssSyntaxError2.default(message, line, column, this.css, this.file, opts.plugin);
    }

    result.input = { line: line, column: column, source: this.css };
    if (this.file) result.input.file = this.file;

    return result;
  };

  /**
   * Reads the input source map and returns a symbol position
   * in the input source (e.g., in a Sass file that was compiled
   * to CSS before being passed to PostCSS).
   *
   * @param {number} line   Line in input CSS.
   * @param {number} column Column in input CSS.
   *
   * @return {filePosition} Position in input source.
   *
   * @example
   * root.source.input.origin(1, 1) //=> { file: 'a.css', line: 3, column: 1 }
   */


  Input.prototype.origin = function origin(line, column) {
    if (!this.map) return false;
    var consumer = this.map.consumer();

    var from = consumer.originalPositionFor({ line: line, column: column });
    if (!from.source) return false;

    var result = {
      file: this.mapResolve(from.source),
      line: from.line,
      column: from.column
    };

    var source = consumer.sourceContentFor(from.source);
    if (source) result.source = source;

    return result;
  };

  Input.prototype.mapResolve = function mapResolve(file) {
    if (/^\w+:\/\//.test(file)) {
      return file;
    } else {
      return _path2.default.resolve(this.map.consumer().sourceRoot || '.', file);
    }
  };

  /**
   * The CSS source identifier. Contains {@link Input#file} if the user
   * set the `from` option, or {@link Input#id} if they did not.
   *
   * @type {string}
   *
   * @example
   * const root = postcss.parse(css, { from: 'a.css' })
   * root.source.input.from //=> "/home/ai/a.css"
   *
   * const root = postcss.parse(css)
   * root.source.input.from //=> "<input css 1>"
   */


  _createClass(Input, [{
    key: 'from',
    get: function get() {
      return this.file || this.id;
    }
  }]);

  return Input;
}();

exports.default = Input;

/**
 * @typedef  {object} filePosition
 * @property {string} file   Path to file.
 * @property {number} line   Source line in file.
 * @property {number} column Source column in file.
 */

module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImlucHV0LmVzNiJdLCJuYW1lcyI6WyJzZXF1ZW5jZSIsIklucHV0IiwiY3NzIiwib3B0cyIsInRvU3RyaW5nIiwiRXJyb3IiLCJzbGljZSIsImZyb20iLCJ0ZXN0IiwiZmlsZSIsInBhdGgiLCJyZXNvbHZlIiwibWFwIiwiUHJldmlvdXNNYXAiLCJ0ZXh0IiwiY29uc3VtZXIiLCJtYXBSZXNvbHZlIiwiaWQiLCJlcnJvciIsIm1lc3NhZ2UiLCJsaW5lIiwiY29sdW1uIiwicmVzdWx0Iiwib3JpZ2luIiwiQ3NzU3ludGF4RXJyb3IiLCJzb3VyY2UiLCJwbHVnaW4iLCJpbnB1dCIsIm9yaWdpbmFsUG9zaXRpb25Gb3IiLCJzb3VyY2VDb250ZW50Rm9yIiwic291cmNlUm9vdCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTs7OztBQUNBOzs7O0FBRUE7Ozs7Ozs7O0FBRUEsSUFBSUEsV0FBVyxDQUFmOztBQUVBOzs7Ozs7OztJQU9NQyxLO0FBQ0o7Ozs7QUFJQSxpQkFBYUMsR0FBYixFQUE4QjtBQUFBLFFBQVpDLElBQVksdUVBQUwsRUFBSzs7QUFBQTs7QUFDNUIsUUFBSUQsUUFBUSxJQUFSLElBQWlCLFFBQU9BLEdBQVAseUNBQU9BLEdBQVAsT0FBZSxRQUFmLElBQTJCLENBQUNBLElBQUlFLFFBQXJELEVBQWdFO0FBQzlELFlBQU0sSUFBSUMsS0FBSix1QkFBK0JILEdBQS9CLDRCQUFOO0FBQ0Q7O0FBRUQ7Ozs7Ozs7OztBQVNBLFNBQUtBLEdBQUwsR0FBV0EsSUFBSUUsUUFBSixFQUFYOztBQUVBLFFBQUksS0FBS0YsR0FBTCxDQUFTLENBQVQsTUFBZ0IsUUFBaEIsSUFBNEIsS0FBS0EsR0FBTCxDQUFTLENBQVQsTUFBZ0IsUUFBaEQsRUFBMEQ7QUFDeEQsV0FBS0EsR0FBTCxHQUFXLEtBQUtBLEdBQUwsQ0FBU0ksS0FBVCxDQUFlLENBQWYsQ0FBWDtBQUNEOztBQUVELFFBQUlILEtBQUtJLElBQVQsRUFBZTtBQUNiLFVBQUksWUFBWUMsSUFBWixDQUFp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QUVPO0FBQ0wsYUFBT0MsZUFBS0MsT0FBTCxDQUFhLEtBQUtDLEdBQUwsQ0FBU0csUUFBVCxHQUFvQmUsVUFBcEIsSUFBa0MsR0FBL0MsRUFBb0RyQixJQUFwRCxDQUFQO0FBQ0Q7QUFDRixHOztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozt3QkFhWTtBQUNWLGFBQU8sS0FBS0EsSUFBTCxJQUFhLEtBQUtRLEVBQXpCO0FBQ0Q7Ozs7OztrQkFHWWhCLEs7O0FBRWYiLCJmaWxlIjoiaW5wdXQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ3NzU3ludGF4RXJyb3IgZnJvbSAnLi9jc3Mtc3ludGF4LWVycm9yJ1xuaW1wb3J0IFByZXZpb3VzTWFwIGZyb20gJy4vcHJldmlvdXMtbWFwJ1xuXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuXG5sZXQgc2VxdWVuY2UgPSAwXG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgc291cmNlIENTUy5cbiAqXG4gKiBAZXhhbXBsZVxuICogY29uc3Qgcm9vdCAgPSBwb3N0Y3NzLnBhcnNlKGNzcywgeyBmcm9tOiBmaWxlIH0pXG4gKiBjb25zdCBpbnB1dCA9IHJvb3Quc291cmNlLmlucHV0XG4gKi9cbmNsYXNzIElucHV0IHtcbiAgLyoqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBjc3MgICAgSW5wdXQgQ1NTIHNvdXJjZS5cbiAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRzXSB7QGxpbmsgUHJvY2Vzc29yI3Byb2Nlc3N9IG9wdGlvbnMuXG4gICAqL1xuICBjb25zdHJ1Y3RvciAoY3NzLCBvcHRzID0geyB9KSB7XG4gICAgaWYgKGNzcyA9PT0gbnVsbCB8fCAodHlwZW9mIGNzcyA9PT0gJ29iamVjdCcgJiYgIWNzcy50b1N0cmluZykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgUG9zdENTUyByZWNlaXZlZCAkeyBjc3MgfSBpbnN0ZWFkIG9mIENTUyBzdHJpbmdgKVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIElucHV0IENTUyBzb3VyY2VcbiAgICAgKlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGNvbnN0IGlucHV0ID0gcG9zdGNzcy5wYXJzZSgnYXt9JywgeyBmcm9tOiBmaWxlIH0pLmlucHV0XG4gICAgICogaW5wdXQuY3NzIC8vPT4gXCJhe31cIlxuICAgICAqL1xuICAgIHRoaXMuY3NzID0gY3NzLnRvU3RyaW5nKClcblxuICAgIGlmICh0aGlzLmNzc1swXSA9PT0gJ1xcdUZFRkYnIHx8IHRoaXMuY3NzWzBdID09PSAnXFx1RkZGRScpIHtcbiAgICAgIHRoaXMuY3NzID0gdGhpcy5jc3Muc2xpY2UoMSlcbiAgICB9XG5cbiAgICBpZiAob3B0cy5mcm9tKSB7XG4gICAgICBpZiAoL15cXHcrOlxcL1xcLy8udGVzdChvcHRzLmZyb20pKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBUaGUgYWJzb2x1dGUgcGF0aCB0byB0aGUgQ1NTIHNvdXJjZSBmaWxlIGRlZmluZWRcbiAgICAgICAgICogd2l0aCB0aGUgYGZyb21gIG9wdGlvbi5cbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgICAgICpcbiAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICogY29uc3Qgcm9vdCA9IHBvc3Rjc3MucGFyc2UoY3NzLCB7IGZyb206ICdhLmNzcycgfSlcbiAgICAgICAgICogcm9vdC5zb3VyY2UuaW5wdXQuZmlsZSAvLz0+ICcvaG9tZS9haS9hLmNzcydcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuZmlsZSA9IG9wdHMuZnJvbVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5maWxlID0gcGF0aC5yZXNvbHZlKG9wdHMuZnJvbSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgbWFwID0gbmV3IFByZXZpb3VzTWFwKHRoaXMuY3NzLCBvcHRzKVxuICAgIGlmIChtYXAudGV4dCkge1xuICAgICAgLyoqXG4gICAgICAgKiBUaGUgaW5wdXQgc291cmNlIG1hcCBwYXNzZWQgZnJvbSBhIGNvbXBpbGF0aW9uIHN0ZXAgYmVmb3JlIFBvc3RDU1NcbiAgICAgICAqIChmb3IgZXhhbXBsZSwgZnJvbSBTYXNzIGNvbXBpbGVyKS5cbiAgICAgICAqXG4gICAgICAgKiBAdHlwZSB7UHJldmlvdXNNYXB9XG4gICAgICAgKlxuICAgICAgICogQGV4YW1wbGVcbiAgICAgICAqIHJvb3Quc291cmNlLmlucHV0Lm1hcC5jb25zdW1lcigpLnNvdXJjZXMgLy89PiBbJ2Euc2FzcyddXG4gICAgICAgKi9cbiAgICAgIHRoaXMubWFwID0gbWFwXG4gICAgICBsZXQgZmlsZSA9IG1hcC5jb25zdW1lcigpLmZpbGVcbiAgICAgIGlmICghdGhpcy5maWxlICYmIGZpbGUpIHRoaXMuZmlsZSA9IHRoaXMubWFwUmVzb2x2ZShmaWxlKVxuICAgIH1cblxuICAgIGlmICghdGhpcy5maWxlKSB7XG4gICAgICBzZXF1ZW5jZSArPSAxXG4gICAgICAvKipcbiAgICAgICAqIFRoZSB1bmlxdWUgSUQgb2YgdGhlIENTUyBzb3VyY2UuIEl0IHdpbGwgYmUgY3JlYXRlZCBpZiBgZnJvbWAgb3B0aW9uXG4gICAgICAgKiBpcyBub3QgcHJvdmlkZWQgKGJlY2F1c2UgUG9zdENTUyBkb2VzIG5vdCBrbm93IHRoZSBmaWxlIHBhdGgpLlxuICAgICAgICpcbiAgICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICAgKlxuICAgICAgICogQGV4YW1wbGVcbiAgICAgICAqIGNvbnN0IHJvb3QgPSBwb3N0Y3NzLnBhcnNlKGNzcylcbiAgICAgICAqIHJvb3Quc291cmNlLmlucHV0LmZpbGUgLy89PiB1bmRlZmluZWRcbiAgICAgICAqIHJvb3Quc291cmNlLmlucHV0LmlkICAgLy89PiBcIjxpbnB1dCBjc3MgMT5cIlxuICAgICAgICovXG4gICAgICB0aGlzLmlkID0gJzxpbnB1dCBjc3MgJyArIHNlcXVlbmNlICsgJz4nXG4gICAgfVxuICAgIGlmICh0aGlzLm1hcCkgdGhpcy5tYXAuZmlsZSA9IHRoaXMuZnJvbVxuICB9XG5cbiAgZXJyb3IgKG1lc3NhZ2UsIGxpbmUsIGNvbHVtbiwgb3B0cyA9IHsgfSkge1xuICAgIGxldCByZXN1bHRcbiAgICBsZXQgb3JpZ2luID0gdGhpcy5vcmlnaW4obGluZSwgY29sdW1uKVxuICAgIGlmIChvcmlnaW4pIHtcbiAgICAgIHJlc3VsdCA9IG5ldyBDc3NTeW50YXhFcnJvcihcbiAgICAgICAgbWVzc2FnZSwgb3JpZ2luLmxpbmUsIG9yaWdpbi5jb2x1bW4sXG4gICAgICAgIG9yaWdpbi5zb3VyY2UsIG9yaWdpbi5maWxlLCBvcHRzLnBsdWdpblxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQgPSBuZXcgQ3NzU3ludGF4RXJyb3IoXG4gICAgICAgIG1lc3NhZ2UsIGxpbmUsIGNvbHVtbiwgdGhpcy5jc3MsIHRoaXMuZmlsZSwgb3B0cy5wbHVnaW4pXG4gICAgfVxuXG4gICAgcmVzdWx0LmlucHV0ID0geyBsaW5lLCBjb2x1bW4sIHNvdXJjZTogdGhpcy5jc3MgfVxuICAgIGlmICh0aGlzLmZpbGUpIHJlc3VsdC5pbnB1dC5maWxlID0gdGhpcy5maWxlXG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICAvKipcbiAgICogUmVhZHMgdGhlIGlucHV0IHNvdXJjZSBtYXAgYW5kIHJldHVybnMgYSBzeW1ib2wgcG9zaXRpb25cbiAgICogaW4gdGhlIGlucHV0IHNvdXJjZSAoZS5nLiwgaW4gYSBTYXNzIGZpbGUgdGhhdCB3YXMgY29tcGlsZWRcbiAgICogdG8gQ1NTIGJlZm9yZSBiZWluZyBwYXNzZWQgdG8gUG9zdENTUykuXG4gICAqXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBsaW5lICAgTGluZSBpbiBpbnB1dCBDU1MuXG4gICAqIEBwYXJhbSB7bnVtYmVyfSBjb2x1bW4gQ29sdW1uIGluIGlucHV0IENTUy5cbiAgICpcbiAgICogQHJldHVybiB7ZmlsZVBvc2l0aW9ufSBQb3NpdGlvbiBpbiBpbnB1dCBzb3VyY2UuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHJvb3Quc291cmNlLmlucHV0Lm9yaWdpbigxLCAxKSAvLz0+IHsgZmlsZTogJ2EuY3NzJywgbGluZTogMywgY29sdW1uOiAxIH1cbiAgICovXG4gIG9yaWdpbiAobGluZSwgY29sdW1uKSB7XG4gICAgaWYgKCF0aGlzLm1hcCkgcmV0dXJuIGZhbHNlXG4gICAgbGV0IGNvbnN1bWVyID0gdGhpcy5tYXAuY29uc3VtZXIoKVxuXG4gICAgbGV0IGZyb20gPSBjb25zdW1lci5vcmlnaW5hbFBvc2l0aW9uRm9yKHsgbGluZSwgY29sdW1uIH0pXG4gICAgaWYgKCFmcm9tLnNvdXJjZSkgcmV0dXJuIGZhbHNlXG5cbiAgICBsZXQgcmVzdWx0ID0ge1xuICAgICAgZmlsZTogdGhpcy5tYXBSZXNvbHZlKGZyb20uc291cmNlKSxcbiAgICAgIGxpbmU6IGZyb20ubGluZSxcbiAgICAgIGNvbHVtbjogZnJvbS5jb2x1bW5cbiAgICB9XG5cbiAgICBsZXQgc291cmNlID0gY29uc3VtZXIuc291cmNlQ29udGVudEZvcihmcm9tLnNvdXJjZSlcbiAgICBpZiAoc291cmNlKSByZXN1bHQuc291cmNlID0gc291cmNlXG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICBtYXBSZXNvbHZlIChmaWxlKSB7XG4gICAgaWYgKC9eXFx3KzpcXC9cXC8vLnRlc3QoZmlsZSkpIHtcbiAgICAgIHJldHVybiBmaWxlXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBwYXRoLnJlc29sdmUodGhpcy5tYXAuY29uc3VtZXIoKS5zb3VyY2VSb290IHx8ICcuJywgZmlsZSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVGhlIENTUyBzb3VyY2UgaWRlbnRpZmllci4gQ29udGFpbnMge0BsaW5rIElucHV0I2ZpbGV9IGlmIHRoZSB1c2VyXG4gICAqIHNldCB0aGUgYGZyb21gIG9wdGlvbiwgb3Ige0BsaW5rIElucHV0I2lkfSBpZiB0aGV5IGRpZCBub3QuXG4gICAqXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnN0IHJvb3QgPSBwb3N0Y3NzLnBhcnNlKGNzcywgeyBmcm9tOiAnYS5jc3MnIH0pXG4gICAqIHJvb3Quc291cmNlLmlucHV0LmZyb20gLy89PiBcIi9ob21lL2FpL2EuY3NzXCJcbiAgICpcbiAgICogY29uc3Qgcm9vdCA9IHBvc3Rjc3MucGFyc2UoY3NzKVxuICAgKiByb290LnNvdXJjZS5pbnB1dC5mcm9tIC8vPT4gXCI8aW5wdXQgY3NzIDE+XCJcbiAgICovXG4gIGdldCBmcm9tICgpIHtcbiAgICByZXR1cm4gdGhpcy5maWxlIHx8IHRoaXMuaWRcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBJbnB1dFxuXG4vKipcbiAqIEB0eXBlZGVmICB7b2JqZWN0fSBmaWxlUG9zaXRpb25cbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBmaWxlICAgUGF0aCB0byBmaWxlLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IGxpbmUgICBTb3VyY2UgbGluZSBpbiBmaWxlLlxuICogQHByb3BlcnR5IHtudW1iZXJ9IGNvbHVtbiBTb3VyY2UgY29sdW1uIGluIGZpbGUuXG4gKi9cbiJdfQ==
