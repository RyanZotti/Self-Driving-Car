'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _sourceMap = require('source-map');

var _sourceMap2 = _interopRequireDefault(_sourceMap);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function fromBase64(str) {
  if (Buffer) {
    return Buffer.from(str, 'base64').toString();
  } else {
    return window.atob(str);
  }
}

/**
 * Source map information from input CSS.
 * For example, source map after Sass compiler.
 *
 * This class will automatically find source map in input CSS or in file system
 * near input file (according `from` option).
 *
 * @example
 * const root = postcss.parse(css, { from: 'a.sass.css' })
 * root.input.map //=> PreviousMap
 */

var PreviousMap = function () {
  /**
   * @param {string}         css    Input CSS source.
   * @param {processOptions} [opts] {@link Processor#process} options.
   */
  function PreviousMap(css, opts) {
    _classCallCheck(this, PreviousMap);

    this.loadAnnotation(css);
    /**
     * Was source map inlined by data-uri to input CSS.
     *
     * @type {boolean}
     */
    this.inline = this.startWith(this.annotation, 'data:');

    var prev = opts.map ? opts.map.prev : undefined;
    var text = this.loadMap(opts.from, prev);
    if (text) this.text = text;
  }

  /**
   * Create a instance of `SourceMapGenerator` class
   * from the `source-map` library to work with source map information.
   *
   * It is lazy method, so it will create object only on first call
   * and then it will use cache.
   *
   * @return {SourceMapGenerator} Object with source map information.
   */


  PreviousMap.prototype.consumer = function consumer() {
    if (!this.consumerCache) {
      this.consumerCache = new _sourceMap2.default.SourceMapConsumer(this.text);
    }
    return this.consumerCache;
  };

  /**
   * Does source map contains `sourcesContent` with input source text.
   *
   * @return {boolean} Is `sourcesContent` present.
   */


  PreviousMap.prototype.withContent = function withContent() {
    return !!(this.consumer().sourcesContent && this.consumer().sourcesContent.length > 0);
  };

  PreviousMap.prototype.startWith = function startWith(string, start) {
    if (!string) return false;
    return string.substr(0, start.length) === start;
  };

  PreviousMap.prototype.loadAnnotation = function loadAnnotation(css) {
    var match = css.match(/\/\*\s*# sourceMappingURL=(.*)\s*\*\//);
    if (match) this.annotation = match[1].trim();
  };

  PreviousMap.prototype.decodeInline = function decodeInline(text) {
    var baseCharsetUri = /^data:application\/json;charset=utf-?8;base64,/;
    var baseUri = /^data:application\/json;base64,/;
    var uri = 'data:application/json,';

    if (this.startWith(text, uri)) {
      return decodeURIComponent(text.substr(uri.length));
    } else if (baseCharsetUri.test(text) || baseUri.test(text)) {
      return fromBase64(text.substr(RegExp.lastMatch.length));
    } else {
      var encoding = text.match(/data:application\/json;([^,]+),/)[1];
      throw new Error('Unsupported source map encoding ' + encoding);
    }
  };

  PreviousMap.prototype.loadMap = function loadMap(file, prev) {
    if (prev === false) return false;

    if (prev) {
      if (typeof prev === 'string') {
        return prev;
      } else if (typeof prev === 'function') {
        var prevPath = prev(file);
        if (prevPath && _fs2.default.existsSync && _fs2.default.existsSync(prevPath)) {
          return _fs2.default.readFileSync(prevPath, 'utf-8').toString().trim();
        } else {
          throw new Error('Unable to load previous source map: ' + prevPath.toString());
        }
      } else if (prev instanceof _sourceMap2.default.SourceMapConsumer) {
        return _sourceMap2.default.SourceMapGenerator.fromSourceMap(prev).toString();
      } else if (prev instanceof _sourceMap2.default.SourceMapGenerator) {
        return prev.toString();
      } else if (this.isMap(prev)) {
        return JSON.stringify(prev);
      } else {
        throw new Error('Unsupported previous source map format: ' + prev.toString());
      }
    } else if (this.inline) {
      return this.decodeInline(this.annotation);
    } else if (this.annotation) {
      var map = this.annotation;
      if (file) map = _path2.default.join(_path2.default.dirname(file), map);

      this.root = _path2.default.dirname(map);
      if (_fs2.default.existsSync && _fs2.default.existsSync(map)) {
        return _fs2.default.readFileSync(map, 'utf-8').toString().trim();
      } else {
        return false;
      }
    }
  };

  PreviousMap.prototype.isMap = function isMap(map) {
    if ((typeof map === 'undefined' ? 'undefined' : _typeof(map)) !== 'object') return false;
    return typeof map.mappings === 'string' || typeof map._mappings === 'string';
  };

  return PreviousMap;
}();

exports.default = PreviousMap;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInByZXZpb3VzLW1hcC5lczYiXSwibmFtZXMiOlsiZnJvbUJhc2U2NCIsInN0ciIsIkJ1ZmZlciIsImZyb20iLCJ0b1N0cmluZyIsIndpbmRvdyIsImF0b2IiLCJQcmV2aW91c01hcCIsImNzcyIsIm9wdHMiLCJsb2FkQW5ub3RhdGlvbiIsImlubGluZSIsInN0YXJ0V2l0aCIsImFubm90YXRpb24iLCJwcmV2IiwibWFwIiwidW5kZWZpbmVkIiwidGV4dCIsImxvYWRNYXAiLCJjb25zdW1lciIsImNvbnN1bWVyQ2FjaGUiLCJtb3ppbGxhIiwiU291cmNlTWFwQ29uc3VtZXIiLCJ3aXRoQ29udGVudCIsInNvdXJjZXNDb250ZW50IiwibGVuZ3RoIiwic3RyaW5nIiwic3RhcnQiLCJzdWJzdHIiLCJtYXRjaCIsInRyaW0iLCJkZWNvZGVJbmxpbmUiLCJiYXNlQ2hhcnNldFVyaSIsImJhc2VVcmkiLCJ1cmkiLCJkZWNvZGVVUklDb21wb25lbnQiLCJ0ZXN0IiwiUmVnRXhwIiwibGFzdE1hdGNoIiwiZW5jb2RpbmciLCJFcnJvciIsImZpbGUiLCJwcmV2UGF0aCIsImZzIiwiZXhpc3RzU3luYyIsInJlYWRGaWxlU3luYyIsIlNvdXJjZU1hcEdlbmVyYXRvciIsImZyb21Tb3VyY2VNYXAiLCJpc01hcCIsIkpTT04iLCJzdHJpbmdpZnkiLCJwYXRoIiwiam9pbiIsImRpcm5hbWUiLCJyb290IiwibWFwcGluZ3MiLCJfbWFwcGluZ3MiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOzs7O0FBQ0E7Ozs7QUFDQTs7Ozs7Ozs7QUFFQSxTQUFTQSxVQUFULENBQXFCQyxHQUFyQixFQUEwQjtBQUN4QixNQUFJQyxNQUFKLEVBQVk7QUFDVixXQUFPQSxPQUFPQyxJQUFQLENBQVlGLEdBQVosRUFBaUIsUUFBakIsRUFBMkJHLFFBQTNCLEVBQVA7QUFDRCxHQUZELE1BRU87QUFDTCxXQUFPQyxPQUFPQyxJQUFQLENBQVlMLEdBQVosQ0FBUDtBQUNEO0FBQ0Y7O0FBRUQ7Ozs7Ozs7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UUFBOUIsR0FBeUMwQixJQUF6QyxFQUFQO0FBQ0QsT0FGRCxNQUVPO0FBQ0wsZUFBTyxLQUFQO0FBQ0Q7QUFDRjtBQUNGLEc7O3dCQUVEa0IsSyxrQkFBT2pDLEcsRUFBSztBQUNWLFFBQUksUUFBT0EsR0FBUCx5Q0FBT0EsR0FBUCxPQUFlLFFBQW5CLEVBQTZCLE9BQU8sS0FBUDtBQUM3QixXQUFPLE9BQU9BLElBQUl3QyxRQUFYLEtBQXdCLFFBQXhCLElBQW9DLE9BQU94QyxJQUFJeUMsU0FBWCxLQUF5QixRQUFwRTtBQUNELEc7Ozs7O2tCQUdZakQsVyIsImZpbGUiOiJwcmV2aW91cy1tYXAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgbW96aWxsYSBmcm9tICdzb3VyY2UtbWFwJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCBmcyBmcm9tICdmcydcblxuZnVuY3Rpb24gZnJvbUJhc2U2NCAoc3RyKSB7XG4gIGlmIChCdWZmZXIpIHtcbiAgICByZXR1cm4gQnVmZmVyLmZyb20oc3RyLCAnYmFzZTY0JykudG9TdHJpbmcoKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiB3aW5kb3cuYXRvYihzdHIpXG4gIH1cbn1cblxuLyoqXG4gKiBTb3VyY2UgbWFwIGluZm9ybWF0aW9uIGZyb20gaW5wdXQgQ1NTLlxuICogRm9yIGV4YW1wbGUsIHNvdXJjZSBtYXAgYWZ0ZXIgU2FzcyBjb21waWxlci5cbiAqXG4gKiBUaGlzIGNsYXNzIHdpbGwgYXV0b21hdGljYWxseSBmaW5kIHNvdXJjZSBtYXAgaW4gaW5wdXQgQ1NTIG9yIGluIGZpbGUgc3lzdGVtXG4gKiBuZWFyIGlucHV0IGZpbGUgKGFjY29yZGluZyBgZnJvbWAgb3B0aW9uKS5cbiAqXG4gKiBAZXhhbXBsZVxuICogY29uc3Qgcm9vdCA9IHBvc3Rjc3MucGFyc2UoY3NzLCB7IGZyb206ICdhLnNhc3MuY3NzJyB9KVxuICogcm9vdC5pbnB1dC5tYXAgLy89PiBQcmV2aW91c01hcFxuICovXG5jbGFzcyBQcmV2aW91c01hcCB7XG4gIC8qKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gICAgICAgICBjc3MgICAgSW5wdXQgQ1NTIHNvdXJjZS5cbiAgICogQHBhcmFtIHtwcm9jZXNzT3B0aW9uc30gW29wdHNdIHtAbGluayBQcm9jZXNzb3IjcHJvY2Vzc30gb3B0aW9ucy5cbiAgICovXG4gIGNvbnN0cnVjdG9yIChjc3MsIG9wdHMpIHtcbiAgICB0aGlzLmxvYWRBbm5vdGF0aW9uKGNzcylcbiAgICAvKipcbiAgICAgKiBXYXMgc291cmNlIG1hcCBpbmxpbmVkIGJ5IGRhdGEtdXJpIHRvIGlucHV0IENTUy5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHRoaXMuaW5saW5lID0gdGhpcy5zdGFydFdpdGgodGhpcy5hbm5vdGF0aW9uLCAnZGF0YTonKVxuXG4gICAgbGV0IHByZXYgPSBvcHRzLm1hcCA/IG9wdHMubWFwLnByZXYgOiB1bmRlZmluZWRcbiAgICBsZXQgdGV4dCA9IHRoaXMubG9hZE1hcChvcHRzLmZyb20sIHByZXYpXG4gICAgaWYgKHRleHQpIHRoaXMudGV4dCA9IHRleHRcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBpbnN0YW5jZSBvZiBgU291cmNlTWFwR2VuZXJhdG9yYCBjbGFzc1xuICAgKiBmcm9tIHRoZSBgc291cmNlLW1hcGAgbGlicmFyeSB0byB3b3JrIHdpdGggc291cmNlIG1hcCBpbmZvcm1hdGlvbi5cbiAgICpcbiAgICogSXQgaXMgbGF6eSBtZXRob2QsIHNvIGl0IHdpbGwgY3JlYXRlIG9iamVjdCBvbmx5IG9uIGZpcnN0IGNhbGxcbiAgICogYW5kIHRoZW4gaXQgd2lsbCB1c2UgY2FjaGUuXG4gICAqXG4gICAqIEByZXR1cm4ge1NvdXJjZU1hcEdlbmVyYXRvcn0gT2JqZWN0IHdpdGggc291cmNlIG1hcCBpbmZvcm1hdGlvbi5cbiAgICovXG4gIGNvbnN1bWVyICgpIHtcbiAgICBpZiAoIXRoaXMuY29uc3VtZXJDYWNoZSkge1xuICAgICAgdGhpcy5jb25zdW1lckNhY2hlID0gbmV3IG1vemlsbGEuU291cmNlTWFwQ29uc3VtZXIodGhpcy50ZXh0KVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5jb25zdW1lckNhY2hlXG4gIH1cblxuICAvKipcbiAgICogRG9lcyBzb3VyY2UgbWFwIGNvbnRhaW5zIGBzb3VyY2VzQ29udGVudGAgd2l0aCBpbnB1dCBzb3VyY2UgdGV4dC5cbiAgICpcbiAgICogQHJldHVybiB7Ym9vbGVhbn0gSXMgYHNvdXJjZXNDb250ZW50YCBwcmVzZW50LlxuICAgKi9cbiAgd2l0aENvbnRlbnQgKCkge1xuICAgIHJldHVybiAhISh0aGlzLmNvbnN1bWVyKCkuc291cmNlc0NvbnRlbnQgJiZcbiAgICAgICAgICAgICAgdGhpcy5jb25zdW1lcigpLnNvdXJjZXNDb250ZW50Lmxlbmd0aCA+IDApXG4gIH1cblxuICBzdGFydFdpdGggKHN0cmluZywgc3RhcnQpIHtcbiAgICBpZiAoIXN0cmluZykgcmV0dXJuIGZhbHNlXG4gICAgcmV0dXJuIHN0cmluZy5zdWJzdHIoMCwgc3RhcnQubGVuZ3RoKSA9PT0gc3RhcnRcbiAgfVxuXG4gIGxvYWRBbm5vdGF0aW9uIChjc3MpIHtcbiAgICBsZXQgbWF0Y2ggPSBjc3MubWF0Y2goL1xcL1xcKlxccyojIHNvdXJjZU1hcHBpbmdVUkw9KC4qKVxccypcXCpcXC8vKVxuICAgIGlmIChtYXRjaCkgdGhpcy5hbm5vdGF0aW9uID0gbWF0Y2hbMV0udHJpbSgpXG4gIH1cblxuICBkZWNvZGVJbmxpbmUgKHRleHQpIHtcbiAgICBsZXQgYmFzZUNoYXJzZXRVcmkgPSAvXmRhdGE6YXBwbGljYXRpb25cXC9qc29uO2NoYXJzZXQ9dXRmLT84O2Jhc2U2NCwvXG4gICAgbGV0IGJhc2VVcmkgPSAvXmRhdGE6YXBwbGljYXRpb25cXC9qc29uO2Jhc2U2NCwvXG4gICAgbGV0IHVyaSA9ICdkYXRhOmFwcGxpY2F0aW9uL2pzb24sJ1xuXG4gICAgaWYgKHRoaXMuc3RhcnRXaXRoKHRleHQsIHVyaSkpIHtcbiAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQodGV4dC5zdWJzdHIodXJpLmxlbmd0aCkpXG4gICAgfSBlbHNlIGlmIChiYXNlQ2hhcnNldFVyaS50ZXN0KHRleHQpIHx8IGJhc2VVcmkudGVzdCh0ZXh0KSkge1xuICAgICAgcmV0dXJuIGZyb21CYXNlNjQodGV4dC5zdWJzdHIoUmVnRXhwLmxhc3RNYXRjaC5sZW5ndGgpKVxuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgZW5jb2RpbmcgPSB0ZXh0Lm1hdGNoKC9kYXRhOmFwcGxpY2F0aW9uXFwvanNvbjsoW14sXSspLC8pWzFdXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vuc3VwcG9ydGVkIHNvdXJjZSBtYXAgZW5jb2RpbmcgJyArIGVuY29kaW5nKVxuICAgIH1cbiAgfVxuXG4gIGxvYWRNYXAgKGZpbGUsIHByZXYpIHtcbiAgICBpZiAocHJldiA9PT0gZmFsc2UpIHJldHVybiBmYWxzZVxuXG4gICAgaWYgKHByZXYpIHtcbiAgICAgIGlmICh0eXBlb2YgcHJldiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHByZXZcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHByZXYgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgbGV0IHByZXZQYXRoID0gcHJldihmaWxlKVxuICAgICAgICBpZiAocHJldlBhdGggJiYgZnMuZXhpc3RzU3luYyAmJiBmcy5leGlzdHNTeW5jKHByZXZQYXRoKSkge1xuICAgICAgICAgIHJldHVybiBmcy5yZWFkRmlsZVN5bmMocHJldlBhdGgsICd1dGYtOCcpLnRvU3RyaW5nKCkudHJpbSgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ1VuYWJsZSB0byBsb2FkIHByZXZpb3VzIHNvdXJjZSBtYXA6ICcgKyBwcmV2UGF0aC50b1N0cmluZygpKVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHByZXYgaW5zdGFuY2VvZiBtb3ppbGxhLlNvdXJjZU1hcENvbnN1bWVyKSB7XG4gICAgICAgIHJldHVybiBtb3ppbGxhLlNvdXJjZU1hcEdlbmVyYXRvci5mcm9tU291cmNlTWFwKHByZXYpLnRvU3RyaW5nKClcbiAgICAgIH0gZWxzZSBpZiAocHJldiBpbnN0YW5jZW9mIG1vemlsbGEuU291cmNlTWFwR2VuZXJhdG9yKSB7XG4gICAgICAgIHJldHVybiBwcmV2LnRvU3RyaW5nKClcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5pc01hcChwcmV2KSkge1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocHJldilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnVW5zdXBwb3J0ZWQgcHJldmlvdXMgc291cmNlIG1hcCBmb3JtYXQ6ICcgKyBwcmV2LnRvU3RyaW5nKCkpXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0aGlzLmlubGluZSkge1xuICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlSW5saW5lKHRoaXMuYW5ub3RhdGlvbilcbiAgICB9IGVsc2UgaWYgKHRoaXMuYW5ub3RhdGlvbikge1xuICAgICAgbGV0IG1hcCA9IHRoaXMuYW5ub3RhdGlvblxuICAgICAgaWYgKGZpbGUpIG1hcCA9IHBhdGguam9pbihwYXRoLmRpcm5hbWUoZmlsZSksIG1hcClcblxuICAgICAgdGhpcy5yb290ID0gcGF0aC5kaXJuYW1lKG1hcClcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jICYmIGZzLmV4aXN0c1N5bmMobWFwKSkge1xuICAgICAgICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKG1hcCwgJ3V0Zi04JykudG9TdHJpbmcoKS50cmltKClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlzTWFwIChtYXApIHtcbiAgICBpZiAodHlwZW9mIG1hcCAhPT0gJ29iamVjdCcpIHJldHVybiBmYWxzZVxuICAgIHJldHVybiB0eXBlb2YgbWFwLm1hcHBpbmdzID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgbWFwLl9tYXBwaW5ncyA9PT0gJ3N0cmluZydcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBQcmV2aW91c01hcFxuIl19
