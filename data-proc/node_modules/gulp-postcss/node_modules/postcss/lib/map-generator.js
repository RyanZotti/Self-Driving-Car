'use strict';

exports.__esModule = true;

var _sourceMap = require('source-map');

var _sourceMap2 = _interopRequireDefault(_sourceMap);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MapGenerator = function () {
  function MapGenerator(stringify, root, opts) {
    _classCallCheck(this, MapGenerator);

    this.stringify = stringify;
    this.mapOpts = opts.map || {};
    this.root = root;
    this.opts = opts;
  }

  MapGenerator.prototype.isMap = function isMap() {
    if (typeof this.opts.map !== 'undefined') {
      return !!this.opts.map;
    } else {
      return this.previous().length > 0;
    }
  };

  MapGenerator.prototype.previous = function previous() {
    var _this = this;

    if (!this.previousMaps) {
      this.previousMaps = [];
      this.root.walk(function (node) {
        if (node.source && node.source.input.map) {
          var map = node.source.input.map;
          if (_this.previousMaps.indexOf(map) === -1) {
            _this.previousMaps.push(map);
          }
        }
      });
    }

    return this.previousMaps;
  };

  MapGenerator.prototype.isInline = function isInline() {
    if (typeof this.mapOpts.inline !== 'undefined') {
      return this.mapOpts.inline;
    }

    var annotation = this.mapOpts.annotation;
    if (typeof annotation !== 'undefined' && annotation !== true) {
      return false;
    }

    if (this.previous().length) {
      return this.previous().some(function (i) {
        return i.inline;
      });
    } else {
      return true;
    }
  };

  MapGenerator.prototype.isSourcesContent = function isSourcesContent() {
    if (typeof this.mapOpts.sourcesContent !== 'undefined') {
      return this.mapOpts.sourcesContent;
    }
    if (this.previous().length) {
      return this.previous().some(function (i) {
        return i.withContent();
      });
    } else {
      return true;
    }
  };

  MapGenerator.prototype.clearAnnotation = function clearAnnotation() {
    if (this.mapOpts.annotation === false) return;

    var node = void 0;
    for (var i = this.root.nodes.length - 1; i >= 0; i--) {
      node = this.root.nodes[i];
      if (node.type !== 'comment') continue;
      if (node.text.indexOf('# sourceMappingURL=') === 0) {
        this.root.removeChild(i);
      }
    }
  };

  MapGenerator.prototype.setSourcesContent = function setSourcesContent() {
    var _this2 = this;

    var already = {};
    this.root.walk(function (node) {
      if (node.source) {
        var from = node.source.input.from;
        if (from && !already[from]) {
          already[from] = true;
          var relative = _this2.relative(from);
          _this2.map.setSourceContent(relative, node.source.input.css);
        }
      }
    });
  };

  MapGenerator.prototype.applyPrevMaps = function applyPrevMaps() {
    for (var _iterator = this.previous(), _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref = _i.value;
      }

      var prev = _ref;

      var from = this.relative(prev.file);
      var root = prev.root || _path2.default.dirname(prev.file);
      var map = void 0;

      if (this.mapOpts.sourcesContent === false) {
        map = new _sourceMap2.default.SourceMapConsumer(prev.text);
        if (map.sourcesContent) {
          map.sourcesContent = map.sourcesContent.map(function () {
            return null;
          });
        }
      } else {
        map = prev.consumer();
      }

      this.map.applySourceMap(map, from, this.relative(root));
    }
  };

  MapGenerator.prototype.isAnnotation = function isAnnotation() {
    if (this.isInline()) {
      return true;
    } else if (typeof this.mapOpts.annotation !== 'undefined') {
      return this.mapOpts.annotation;
    } else if (this.previous().length) {
      return this.previous().some(function (i) {
        return i.annotation;
      });
    } else {
      return true;
    }
  };

  MapGenerator.prototype.toBase64 = function toBase64(str) {
    if (Buffer) {
      return Buffer.from(str).toString('base64');
    } else {
      return window.btoa(unescape(encodeURIComponent(str)));
    }
  };

  MapGenerator.prototype.addAnnotation = function addAnnotation() {
    var content = void 0;

    if (this.isInline()) {
      content = 'data:application/json;base64,' + this.toBase64(this.map.toString());
    } else if (typeof this.mapOpts.annotation === 'string') {
      content = this.mapOpts.annotation;
    } else {
      content = this.outputFile() + '.map';
    }

    var eol = '\n';
    if (this.css.indexOf('\r\n') !== -1) eol = '\r\n';

    this.css += eol + '/*# sourceMappingURL=' + content + ' */';
  };

  MapGenerator.prototype.outputFile = function outputFile() {
    if (this.opts.to) {
      return this.relative(this.opts.to);
    } else if (this.opts.from) {
      return this.relative(this.opts.from);
    } else {
      return 'to.css';
    }
  };

  MapGenerator.prototype.generateMap = function generateMap() {
    this.generateString();
    if (this.isSourcesContent()) this.setSourcesContent();
    if (this.previous().length > 0) this.applyPrevMaps();
    if (this.isAnnotation()) this.addAnnotation();

    if (this.isInline()) {
      return [this.css];
    } else {
      return [this.css, this.map];
    }
  };

  MapGenerator.prototype.relative = function relative(file) {
    if (file.indexOf('<') === 0) return file;
    if (/^\w+:\/\//.test(file)) return file;

    var from = this.opts.to ? _path2.default.dirname(this.opts.to) : '.';

    if (typeof this.mapOpts.annotation === 'string') {
      from = _path2.default.dirname(_path2.default.resolve(from, this.mapOpts.annotation));
    }

    file = _path2.default.relative(from, file);
    if (_path2.default.sep === '\\') {
      return file.replace(/\\/g, '/');
    } else {
      return file;
    }
  };

  MapGenerator.prototype.sourcePath = function sourcePath(node) {
    if (this.mapOpts.from) {
      return this.mapOpts.from;
    } else {
      return this.relative(node.source.input.from);
    }
  };

  MapGenerator.prototype.generateString = function generateString() {
    var _this3 = this;

    this.css = '';
    this.map = new _sourceMap2.default.SourceMapGenerator({ file: this.outputFile() });

    var line = 1;
    var column = 1;

    var lines = void 0,
        last = void 0;
    this.stringify(this.root, function (str, node, type) {
      _this3.css += str;

      if (node && type !== 'end') {
        if (node.source && node.source.start) {
          _this3.map.addMapping({
            source: _this3.sourcePath(node),
            generated: { line: line, column: column - 1 },
            original: {
              line: node.source.start.line,
              column: node.source.start.column - 1
            }
          });
        } else {
          _this3.map.addMapping({
            source: '<no source>',
            original: { line: 1, column: 0 },
            generated: { line: line, column: column - 1 }
          });
        }
      }

      lines = str.match(/\n/g);
      if (lines) {
        line += lines.length;
        last = str.lastIndexOf('\n');
        column = str.length - last;
      } else {
        column += str.length;
      }

      if (node && type !== 'start') {
        if (node.source && node.source.end) {
          _this3.map.addMapping({
            source: _this3.sourcePath(node),
            generated: { line: line, column: column - 1 },
            original: {
              line: node.source.end.line,
              column: node.source.end.column
            }
          });
        } else {
          _this3.map.addMapping({
            source: '<no source>',
            original: { line: 1, column: 0 },
            generated: { line: line, column: column - 1 }
          });
        }
      }
    });
  };

  MapGenerator.prototype.generate = function generate() {
    this.clearAnnotation();

    if (this.isMap()) {
      return this.generateMap();
    } else {
      var result = '';
      this.stringify(this.root, function (i) {
        result += i;
      });
      return [result];
    }
  };

  return MapGenerator;
}();

exports.default = MapGenerator;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hcC1nZW5lcmF0b3IuZXM2Il0sIm5hbWVzIjpbIk1hcEdlbmVyYXRvciIsInN0cmluZ2lmeSIsInJvb3QiLCJvcHRzIiwibWFwT3B0cyIsIm1hcCIsImlzTWFwIiwicHJldmlvdXMiLCJsZW5ndGgiLCJwcmV2aW91c01hcHMiLCJ3YWxrIiwibm9kZSIsInNvdXJjZSIsImlucHV0IiwiaW5kZXhPZiIsInB1c2giLCJpc0lubGluZSIsImlubGluZSIsImFubm90YXRpb24iLCJzb21lIiwiaSIsImlzU291cmNlc0NvbnRlbnQiLCJzb3VyY2VzQ29udGVudCIsIndpdGhDb250ZW50IiwiY2xlYXJBbm5vdGF0aW9uIiwibm9kZXMiLCJ0eXBlIiwidGV4dCIsInJlbW92ZUNoaWxkIiwic2V0U291cmNlc0NvbnRlbnQiLCJhbHJlYWR5IiwiZnJvbSIsInJlbGF0aXZlIiwic2V0U291cmNlQ29udGVudCIsImNzcyIsImFwcGx5UHJldk1hcHMiLCJwcmV2IiwiZmlsZSIsInBhdGgiLCJkaXJuYW1lIiwibW96aWxsYSIsIlNvdXJjZU1hcENvbnN1bWVyIiwiY29uc3VtZXIiLCJhcHBseVNvdXJjZU1hcCIsImlzQW5ub3RhdGlvbiIsInRvQmFzZTY0Iiwic3RyIiwiQnVmZmVyIiwidG9TdHJpbmciLCJ3aW5kb3ciLCJidG9hIiwidW5lc2NhcGUiLCJlbmNvZGVVUklDb21wb25lbnQiLCJhZGRBbm5vdGF0aW9uIiwiY29udGVudCIsIm91dHB1dEZpbGUiLCJlb2wiLCJ0byIsImdlbmVyYXRlTWFwIiwiZ2VuZXJhdGVTdHJpbmciLCJ0ZXN0IiwicmVzb2x2ZSIsInNlcCIsInJlcGxhY2UiLCJzb3VyY2VQYXRoIiwiU291cmNlTWFwR2VuZXJhdG9yIiwibGluZSIsImNvbHVtbiIsImxpbmVzIiwibGFzdCIsInN0YXJ0IiwiYWRkTWFwcGluZyIsImdlbmVyYXRlZCIsIm9yaWdpbmFsIiwibWF0Y2giLCJsYXN0SW5kZXhPZiIsImVuZCIsImdlbmVyYXRlIiwicmVzdWx0Il0s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QXBCLEVBQTBCLGFBQUs7QUFDN0I0RSxrQkFBVTFELENBQVY7QUFDRCxPQUZEO0FBR0EsYUFBTyxDQUFDMEQsTUFBRCxDQUFQO0FBQ0Q7QUFDRixHOzs7OztrQkFHWTlFLFkiLCJmaWxlIjoibWFwLWdlbmVyYXRvci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBtb3ppbGxhIGZyb20gJ3NvdXJjZS1tYXAnXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuXG5jbGFzcyBNYXBHZW5lcmF0b3Ige1xuICBjb25zdHJ1Y3RvciAoc3RyaW5naWZ5LCByb290LCBvcHRzKSB7XG4gICAgdGhpcy5zdHJpbmdpZnkgPSBzdHJpbmdpZnlcbiAgICB0aGlzLm1hcE9wdHMgPSBvcHRzLm1hcCB8fCB7IH1cbiAgICB0aGlzLnJvb3QgPSByb290XG4gICAgdGhpcy5vcHRzID0gb3B0c1xuICB9XG5cbiAgaXNNYXAgKCkge1xuICAgIGlmICh0eXBlb2YgdGhpcy5vcHRzLm1hcCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiAhIXRoaXMub3B0cy5tYXBcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMucHJldmlvdXMoKS5sZW5ndGggPiAwXG4gICAgfVxuICB9XG5cbiAgcHJldmlvdXMgKCkge1xuICAgIGlmICghdGhpcy5wcmV2aW91c01hcHMpIHtcbiAgICAgIHRoaXMucHJldmlvdXNNYXBzID0gW11cbiAgICAgIHRoaXMucm9vdC53YWxrKG5vZGUgPT4ge1xuICAgICAgICBpZiAobm9kZS5zb3VyY2UgJiYgbm9kZS5zb3VyY2UuaW5wdXQubWFwKSB7XG4gICAgICAgICAgbGV0IG1hcCA9IG5vZGUuc291cmNlLmlucHV0Lm1hcFxuICAgICAgICAgIGlmICh0aGlzLnByZXZpb3VzTWFwcy5pbmRleE9mKG1hcCkgPT09IC0xKSB7XG4gICAgICAgICAgICB0aGlzLnByZXZpb3VzTWFwcy5wdXNoKG1hcClcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucHJldmlvdXNNYXBzXG4gIH1cblxuICBpc0lubGluZSAoKSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLm1hcE9wdHMuaW5saW5lICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgcmV0dXJuIHRoaXMubWFwT3B0cy5pbmxpbmVcbiAgICB9XG5cbiAgICBsZXQgYW5ub3RhdGlvbiA9IHRoaXMubWFwT3B0cy5hbm5vdGF0aW9uXG4gICAgaWYgKHR5cGVvZiBhbm5vdGF0aW9uICE9PSAndW5kZWZpbmVkJyAmJiBhbm5vdGF0aW9uICE9PSB0cnVlKSB7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICBpZiAodGhpcy5wcmV2aW91cygpLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHRoaXMucHJldmlvdXMoKS5zb21lKGkgPT4gaS5pbmxpbmUpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9XG5cbiAgaXNTb3VyY2VzQ29udGVudCAoKSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLm1hcE9wdHMuc291cmNlc0NvbnRlbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXBPcHRzLnNvdXJjZXNDb250ZW50XG4gICAgfVxuICAgIGlmICh0aGlzLnByZXZpb3VzKCkubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gdGhpcy5wcmV2aW91cygpLnNvbWUoaSA9PiBpLndpdGhDb250ZW50KCkpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9XG5cbiAgY2xlYXJBbm5vdGF0aW9uICgpIHtcbiAgICBpZiAodGhpcy5tYXBPcHRzLmFubm90YXRpb24gPT09IGZhbHNlKSByZXR1cm5cblxuICAgIGxldCBub2RlXG4gICAgZm9yIChsZXQgaSA9IHRoaXMucm9vdC5ub2Rlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgbm9kZSA9IHRoaXMucm9vdC5ub2Rlc1tpXVxuICAgICAgaWYgKG5vZGUudHlwZSAhPT0gJ2NvbW1lbnQnKSBjb250aW51ZVxuICAgICAgaWYgKG5vZGUudGV4dC5pbmRleE9mKCcjIHNvdXJjZU1hcHBpbmdVUkw9JykgPT09IDApIHtcbiAgICAgICAgdGhpcy5yb290LnJlbW92ZUNoaWxkKGkpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc2V0U291cmNlc0NvbnRlbnQgKCkge1xuICAgIGxldCBhbHJlYWR5ID0geyB9XG4gICAgdGhpcy5yb290LndhbGsobm9kZSA9PiB7XG4gICAgICBpZiAobm9kZS5zb3VyY2UpIHtcbiAgICAgICAgbGV0IGZyb20gPSBub2RlLnNvdXJjZS5pbnB1dC5mcm9tXG4gICAgICAgIGlmIChmcm9tICYmICFhbHJlYWR5W2Zyb21dKSB7XG4gICAgICAgICAgYWxyZWFkeVtmcm9tXSA9IHRydWVcbiAgICAgICAgICBsZXQgcmVsYXRpdmUgPSB0aGlzLnJlbGF0aXZlKGZyb20pXG4gICAgICAgICAgdGhpcy5tYXAuc2V0U291cmNlQ29udGVudChyZWxhdGl2ZSwgbm9kZS5zb3VyY2UuaW5wdXQuY3NzKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGFwcGx5UHJldk1hcHMgKCkge1xuICAgIGZvciAobGV0IHByZXYgb2YgdGhpcy5wcmV2aW91cygpKSB7XG4gICAgICBsZXQgZnJvbSA9IHRoaXMucmVsYXRpdmUocHJldi5maWxlKVxuICAgICAgbGV0IHJvb3QgPSBwcmV2LnJvb3QgfHwgcGF0aC5kaXJuYW1lKHByZXYuZmlsZSlcbiAgICAgIGxldCBtYXBcblxuICAgICAgaWYgKHRoaXMubWFwT3B0cy5zb3VyY2VzQ29udGVudCA9PT0gZmFsc2UpIHtcbiAgICAgICAgbWFwID0gbmV3IG1vemlsbGEuU291cmNlTWFwQ29uc3VtZXIocHJldi50ZXh0KVxuICAgICAgICBpZiAobWFwLnNvdXJjZXNDb250ZW50KSB7XG4gICAgICAgICAgbWFwLnNvdXJjZXNDb250ZW50ID0gbWFwLnNvdXJjZXNDb250ZW50Lm1hcCgoKSA9PiBudWxsKVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtYXAgPSBwcmV2LmNvbnN1bWVyKClcbiAgICAgIH1cblxuICAgICAgdGhpcy5tYXAuYXBwbHlTb3VyY2VNYXAobWFwLCBmcm9tLCB0aGlzLnJlbGF0aXZlKHJvb3QpKVxuICAgIH1cbiAgfVxuXG4gIGlzQW5ub3RhdGlvbiAoKSB7XG4gICAgaWYgKHRoaXMuaXNJbmxpbmUoKSkge1xuICAgICAgcmV0dXJuIHRydWVcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzLm1hcE9wdHMuYW5ub3RhdGlvbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hcE9wdHMuYW5ub3RhdGlvblxuICAgIH0gZWxzZSBpZiAodGhpcy5wcmV2aW91cygpLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHRoaXMucHJldmlvdXMoKS5zb21lKGkgPT4gaS5hbm5vdGF0aW9uKVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxuXG4gIHRvQmFzZTY0IChzdHIpIHtcbiAgICBpZiAoQnVmZmVyKSB7XG4gICAgICByZXR1cm4gQnVmZmVyLmZyb20oc3RyKS50b1N0cmluZygnYmFzZTY0JylcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHdpbmRvdy5idG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChzdHIpKSlcbiAgICB9XG4gIH1cblxuICBhZGRBbm5vdGF0aW9uICgpIHtcbiAgICBsZXQgY29udGVudFxuXG4gICAgaWYgKHRoaXMuaXNJbmxpbmUoKSkge1xuICAgICAgY29udGVudCA9ICdkYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LCcgK1xuICAgICAgICAgICAgICAgIHRoaXMudG9CYXNlNjQodGhpcy5tYXAudG9TdHJpbmcoKSlcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiB0aGlzLm1hcE9wdHMuYW5ub3RhdGlvbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGNvbnRlbnQgPSB0aGlzLm1hcE9wdHMuYW5ub3RhdGlvblxuICAgIH0gZWxzZSB7XG4gICAgICBjb250ZW50ID0gdGhpcy5vdXRwdXRGaWxlKCkgKyAnLm1hcCdcbiAgICB9XG5cbiAgICBsZXQgZW9sID0gJ1xcbidcbiAgICBpZiAodGhpcy5jc3MuaW5kZXhPZignXFxyXFxuJykgIT09IC0xKSBlb2wgPSAnXFxyXFxuJ1xuXG4gICAgdGhpcy5jc3MgKz0gZW9sICsgJy8qIyBzb3VyY2VNYXBwaW5nVVJMPScgKyBjb250ZW50ICsgJyAqLydcbiAgfVxuXG4gIG91dHB1dEZpbGUgKCkge1xuICAgIGlmICh0aGlzLm9wdHMudG8pIHtcbiAgICAgIHJldHVybiB0aGlzLnJlbGF0aXZlKHRoaXMub3B0cy50bylcbiAgICB9IGVsc2UgaWYgKHRoaXMub3B0cy5mcm9tKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZWxhdGl2ZSh0aGlzLm9wdHMuZnJvbSlcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICd0by5jc3MnXG4gICAgfVxuICB9XG5cbiAgZ2VuZXJhdGVNYXAgKCkge1xuICAgIHRoaXMuZ2VuZXJhdGVTdHJpbmcoKVxuICAgIGlmICh0aGlzLmlzU291cmNlc0NvbnRlbnQoKSkgdGhpcy5zZXRTb3VyY2VzQ29udGVudCgpXG4gICAgaWYgKHRoaXMucHJldmlvdXMoKS5sZW5ndGggPiAwKSB0aGlzLmFwcGx5UHJldk1hcHMoKVxuICAgIGlmICh0aGlzLmlzQW5ub3RhdGlvbigpKSB0aGlzLmFkZEFubm90YXRpb24oKVxuXG4gICAgaWYgKHRoaXMuaXNJbmxpbmUoKSkge1xuICAgICAgcmV0dXJuIFt0aGlzLmNzc11cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFt0aGlzLmNzcywgdGhpcy5tYXBdXG4gICAgfVxuICB9XG5cbiAgcmVsYXRpdmUgKGZpbGUpIHtcbiAgICBpZiAoZmlsZS5pbmRleE9mKCc8JykgPT09IDApIHJldHVybiBmaWxlXG4gICAgaWYgKC9eXFx3KzpcXC9cXC8vLnRlc3QoZmlsZSkpIHJldHVybiBmaWxlXG5cbiAgICBsZXQgZnJvbSA9IHRoaXMub3B0cy50byA/IHBhdGguZGlybmFtZSh0aGlzLm9wdHMudG8pIDogJy4nXG5cbiAgICBpZiAodHlwZW9mIHRoaXMubWFwT3B0cy5hbm5vdGF0aW9uID09PSAnc3RyaW5nJykge1xuICAgICAgZnJvbSA9IHBhdGguZGlybmFtZShwYXRoLnJlc29sdmUoZnJvbSwgdGhpcy5tYXBPcHRzLmFubm90YXRpb24pKVxuICAgIH1cblxuICAgIGZpbGUgPSBwYXRoLnJlbGF0aXZlKGZyb20sIGZpbGUpXG4gICAgaWYgKHBhdGguc2VwID09PSAnXFxcXCcpIHtcbiAgICAgIHJldHVybiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmlsZVxuICAgIH1cbiAgfVxuXG4gIHNvdXJjZVBhdGggKG5vZGUpIHtcbiAgICBpZiAodGhpcy5tYXBPcHRzLmZyb20pIHtcbiAgICAgIHJldHVybiB0aGlzLm1hcE9wdHMuZnJvbVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5yZWxhdGl2ZShub2RlLnNvdXJjZS5pbnB1dC5mcm9tKVxuICAgIH1cbiAgfVxuXG4gIGdlbmVyYXRlU3RyaW5nICgpIHtcbiAgICB0aGlzLmNzcyA9ICcnXG4gICAgdGhpcy5tYXAgPSBuZXcgbW96aWxsYS5Tb3VyY2VNYXBHZW5lcmF0b3IoeyBmaWxlOiB0aGlzLm91dHB1dEZpbGUoKSB9KVxuXG4gICAgbGV0IGxpbmUgPSAxXG4gICAgbGV0IGNvbHVtbiA9IDFcblxuICAgIGxldCBsaW5lcywgbGFzdFxuICAgIHRoaXMuc3RyaW5naWZ5KHRoaXMucm9vdCwgKHN0ciwgbm9kZSwgdHlwZSkgPT4ge1xuICAgICAgdGhpcy5jc3MgKz0gc3RyXG5cbiAgICAgIGlmIChub2RlICYmIHR5cGUgIT09ICdlbmQnKSB7XG4gICAgICAgIGlmIChub2RlLnNvdXJjZSAmJiBub2RlLnNvdXJjZS5zdGFydCkge1xuICAgICAgICAgIHRoaXMubWFwLmFkZE1hcHBpbmcoe1xuICAgICAgICAgICAgc291cmNlOiB0aGlzLnNvdXJjZVBhdGgobm9kZSksXG4gICAgICAgICAgICBnZW5lcmF0ZWQ6IHsgbGluZSwgY29sdW1uOiBjb2x1bW4gLSAxIH0sXG4gICAgICAgICAgICBvcmlnaW5hbDoge1xuICAgICAgICAgICAgICBsaW5lOiBub2RlLnNvdXJjZS5zdGFydC5saW5lLFxuICAgICAgICAgICAgICBjb2x1bW46IG5vZGUuc291cmNlLnN0YXJ0LmNvbHVtbiAtIDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubWFwLmFkZE1hcHBpbmcoe1xuICAgICAgICAgICAgc291cmNlOiAnPG5vIHNvdXJjZT4nLFxuICAgICAgICAgICAgb3JpZ2luYWw6IHsgbGluZTogMSwgY29sdW1uOiAwIH0sXG4gICAgICAgICAgICBnZW5lcmF0ZWQ6IHsgbGluZSwgY29sdW1uOiBjb2x1bW4gLSAxIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGxpbmVzID0gc3RyLm1hdGNoKC9cXG4vZylcbiAgICAgIGlmIChsaW5lcykge1xuICAgICAgICBsaW5lICs9IGxpbmVzLmxlbmd0aFxuICAgICAgICBsYXN0ID0gc3RyLmxhc3RJbmRleE9mKCdcXG4nKVxuICAgICAgICBjb2x1bW4gPSBzdHIubGVuZ3RoIC0gbGFzdFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29sdW1uICs9IHN0ci5sZW5ndGhcbiAgICAgIH1cblxuICAgICAgaWYgKG5vZGUgJiYgdHlwZSAhPT0gJ3N0YXJ0Jykge1xuICAgICAgICBpZiAobm9kZS5zb3VyY2UgJiYgbm9kZS5zb3VyY2UuZW5kKSB7XG4gICAgICAgICAgdGhpcy5tYXAuYWRkTWFwcGluZyh7XG4gICAgICAgICAgICBzb3VyY2U6IHRoaXMuc291cmNlUGF0aChub2RlKSxcbiAgICAgICAgICAgIGdlbmVyYXRlZDogeyBsaW5lLCBjb2x1bW46IGNvbHVtbiAtIDEgfSxcbiAgICAgICAgICAgIG9yaWdpbmFsOiB7XG4gICAgICAgICAgICAgIGxpbmU6IG5vZGUuc291cmNlLmVuZC5saW5lLFxuICAgICAgICAgICAgICBjb2x1bW46IG5vZGUuc291cmNlLmVuZC5jb2x1bW5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubWFwLmFkZE1hcHBpbmcoe1xuICAgICAgICAgICAgc291cmNlOiAnPG5vIHNvdXJjZT4nLFxuICAgICAgICAgICAgb3JpZ2luYWw6IHsgbGluZTogMSwgY29sdW1uOiAwIH0sXG4gICAgICAgICAgICBnZW5lcmF0ZWQ6IHsgbGluZSwgY29sdW1uOiBjb2x1bW4gLSAxIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGdlbmVyYXRlICgpIHtcbiAgICB0aGlzLmNsZWFyQW5ub3RhdGlvbigpXG5cbiAgICBpZiAodGhpcy5pc01hcCgpKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZW5lcmF0ZU1hcCgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCByZXN1bHQgPSAnJ1xuICAgICAgdGhpcy5zdHJpbmdpZnkodGhpcy5yb290LCBpID0+IHtcbiAgICAgICAgcmVzdWx0ICs9IGlcbiAgICAgIH0pXG4gICAgICByZXR1cm4gW3Jlc3VsdF1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgTWFwR2VuZXJhdG9yXG4iXX0=
