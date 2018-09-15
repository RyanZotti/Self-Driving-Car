'use strict';

exports.__esModule = true;

var _container = require('./container');

var _container2 = _interopRequireDefault(_container);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Represents a CSS file and contains all its parsed nodes.
 *
 * @extends Container
 *
 * @example
 * const root = postcss.parse('a{color:black} b{z-index:2}')
 * root.type         //=> 'root'
 * root.nodes.length //=> 2
 */
var Root = function (_Container) {
  _inherits(Root, _Container);

  function Root(defaults) {
    _classCallCheck(this, Root);

    var _this = _possibleConstructorReturn(this, _Container.call(this, defaults));

    _this.type = 'root';
    if (!_this.nodes) _this.nodes = [];
    return _this;
  }

  Root.prototype.removeChild = function removeChild(child, ignore) {
    var index = this.index(child);

    if (!ignore && index === 0 && this.nodes.length > 1) {
      this.nodes[1].raws.before = this.nodes[index].raws.before;
    }

    return _Container.prototype.removeChild.call(this, child);
  };

  Root.prototype.normalize = function normalize(child, sample, type) {
    var nodes = _Container.prototype.normalize.call(this, child);

    if (sample) {
      if (type === 'prepend') {
        if (this.nodes.length > 1) {
          sample.raws.before = this.nodes[1].raws.before;
        } else {
          delete sample.raws.before;
        }
      } else if (this.first !== sample) {
        for (var _iterator = nodes, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
          var _ref;

          if (_isArray) {
            if (_i >= _iterator.length) break;
            _ref = _iterator[_i++];
          } else {
            _i = _iterator.next();
            if (_i.done) break;
            _ref = _i.value;
          }

          var node = _ref;

          node.raws.before = sample.raws.before;
        }
      }
    }

    return nodes;
  };

  /**
   * Returns a {@link Result} instance representing the root’s CSS.
   *
   * @param {processOptions} [opts] Options with only `to` and `map` keys.
   *
   * @return {Result} Result with current root’s CSS.
   *
   * @example
   * const root1 = postcss.parse(css1, { from: 'a.css' })
   * const root2 = postcss.parse(css2, { from: 'b.css' })
   * root1.append(root2)
   * const result = root1.toResult({ to: 'all.css', map: true })
   */


  Root.prototype.toResult = function toResult() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var LazyResult = require('./lazy-result');
    var Processor = require('./processor');

    var lazy = new LazyResult(new Processor(), this, opts);
    return lazy.stringify();
  };

  /**
   * @memberof Root#
   * @member {object} raws Information to generate byte-to-byte equal
   *                       node string as it was in the origin input.
   *
   * Every parser saves its own properties,
   * but the default CSS parser uses:
   *
   * * `after`: the space symbols after the last child to the end of file.
   * * `semicolon`: is the last child has an (optional) semicolon.
   *
   * @example
   * postcss.parse('a {}\n').raws //=> { after: '\n' }
   * postcss.parse('a {}').raws   //=> { after: '' }
   */


  return Root;
}(_container2.default);

exports.default = Root;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJvb3QuZXM2Il0sIm5hbWVzIjpbIlJvb3QiLCJkZWZhdWx0cyIsInR5cGUiLCJub2RlcyIsInJlbW92ZUNoaWxkIiwiY2hpbGQiLCJpZ25vcmUiLCJpbmRleCIsImxlbmd0aCIsInJhd3MiLCJiZWZvcmUiLCJub3JtYWxpemUiLCJzYW1wbGUiLCJmaXJzdCIsIm5vZGUiLCJ0b1Jlc3VsdCIsIm9wdHMiLCJMYXp5UmVzdWx0IiwicmVxdWlyZSIsIlByb2Nlc3NvciIsImxhenkiLCJzdHJpbmdpZnkiLCJDb250YWluZXIiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7Ozs7Ozs7Ozs7O0FBRUE7Ozs7Ozs7Ozs7SUFVTUEsSTs7O0FBQ0osZ0JBQWFDLFFBQWIsRUFBdUI7QUFBQTs7QUFBQSxpREFDckIsc0JBQU1BLFFBQU4sQ0FEcUI7O0FBRXJCLFVBQUtDLElBQUwsR0FBWSxNQUFaO0FBQ0EsUUFBSSxDQUFDLE1BQUtDLEtBQVYsRUFBaUIsTUFBS0EsS0FBTCxHQUFhLEVBQWI7QUFISTtBQUl0Qjs7aUJBRURDLFcsd0JBQWFDLEssRUFBT0MsTSxFQUFRO0FBQzFCLFFBQUlDLFFBQVEsS0FBS0EsS0FBTCxDQUFXRixLQUFYLENBQVo7O0FBRUEsUUFBSSxDQUFDQyxNQUFELElBQVdDLFVBQVUsQ0FBckIsSUFBMEIsS0FBS0osS0FBTCxDQUFXSyxNQUFYLEdBQW9CLENBQWxELEVBQXFEO0FBQ25ELFdBQUtMLEtBQUwsQ0FBVyxDQUFYLEVBQWNNLElBQWQsQ0FBbUJDLE1BQW5CLEdBQTRCLEtBQUtQLEtBQUwsQ0FBV0ksS0FBWCxFQUFrQkUsSUFBbEIsQ0FBdUJDLE1BQW5EO0FBQ0Q7O0FBRUQsV0FBTyxxQkFBTU4sV0FBTixZQUFrQkMsS0FBbEIsQ0FBUDtBQUNELEc7O2lCQUVETSxTLHNCQUFXTixLLEVBQU9PLE0sRUFBUVYsSSxFQUFNO0FBQzlCLFFBQUlDLFFBQVEscUJBQU1RLFNBQU4sWUFBZ0JOLEtBQWhCLENBQVo7O0FBRUEsUUFBSU8sTUFBSixFQUFZO0FBQ1YsVUFBSVYsU0FBUyxTQUFiLEVBQXdCO0FBQ3RCLFlBQUksS0FBS0MsS0FBTCxDQUFXSyxNQUFYLEdBQW9CLENBQXhCLEVBQTJCO0FBQ3pCSSxpQkFBT0gsSUFBUCxDQUFZQyxNQUFaLEdBQXFCLEtBQUtQLEtBQUwsQ0FBVyxDQUFYLEVBQWNNLElBQWQsQ0FBbUJDLE1BQXhDO0FBQ0QsU0FGRCxNQUVPO0FBQ0wsaUJBQU9FLE9BQU9ILElBQVAsQ0FBWUMsTUFBbkI7QUFDRDtBQUNGLE9BTkQsTUFNTyxJQUFJLEtBQUtHLEtBQUwsS0FBZUQsTUFBbkIsRUFBMkI7QUFDaEMsNkJBQWlCVCxLQUFqQixrSEFBd0I7QUFBQTs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOztBQUFBLGNBQWZXLElBQWU7O0FBQ3RCQSxlQUFLTCxJQUFMLENBQVVDLE1BQVYsR0FBbUJFLE9BQU9ILElBQVAsQ0FBWUMsTUFBL0I7QUFDRDtBQUNGO0FBQ0Y7O0FBRUQsV0FBT1AsS0FBUDtBQUNELEc7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7OztpQkFhQVksUSx1QkFBc0I7QUFBQSxRQUFaQyxJQUFZLHVFQUFMLEVBQUs7O0FBQ3BCLFFBQUlDLGFBQWFDLFFBQVEsZUFBUixDQUFqQjtBQUNBLFFBQUlDLFlBQVlELFFBQVEsYUFBUixDQUFoQjs7QUFFQSxRQUFJRSxPQUFPLElBQUlILFVBQUosQ0FBZSxJQUFJRSxTQUFKLEVBQWYsRUFBZ0MsSUFBaEMsRUFBc0NILElBQXRDLENBQVg7QUFDQSxXQUFPSSxLQUFLQyxTQUFMLEVBQVA7QUFDRCxHOztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7RUExRGlCQyxtQjs7a0JBMkVKdEIsSSIsImZpbGUiOiJyb290LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IENvbnRhaW5lciBmcm9tICcuL2NvbnRhaW5lcidcblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgQ1NTIGZpbGUgYW5kIGNvbnRhaW5zIGFsbCBpdHMgcGFyc2VkIG5vZGVzLlxuICpcbiAqIEBleHRlbmRzIENvbnRhaW5lclxuICpcbiAqIEBleGFtcGxlXG4gKiBjb25zdCByb290ID0gcG9zdGNzcy5wYXJzZSgnYXtjb2xvcjpibGFja30gYnt6LWluZGV4OjJ9JylcbiAqIHJvb3QudHlwZSAgICAgICAgIC8vPT4gJ3Jvb3QnXG4gKiByb290Lm5vZGVzLmxlbmd0aCAvLz0+IDJcbiAqL1xuY2xhc3MgUm9vdCBleHRlbmRzIENvbnRhaW5lciB7XG4gIGNvbnN0cnVjdG9yIChkZWZhdWx0cykge1xuICAgIHN1cGVyKGRlZmF1bHRzKVxuICAgIHRoaXMudHlwZSA9ICdyb290J1xuICAgIGlmICghdGhpcy5ub2RlcykgdGhpcy5ub2RlcyA9IFtdXG4gIH1cblxuICByZW1vdmVDaGlsZCAoY2hpbGQsIGlnbm9yZSkge1xuICAgIGxldCBpbmRleCA9IHRoaXMuaW5kZXgoY2hpbGQpXG5cbiAgICBpZiAoIWlnbm9yZSAmJiBpbmRleCA9PT0gMCAmJiB0aGlzLm5vZGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHRoaXMubm9kZXNbMV0ucmF3cy5iZWZvcmUgPSB0aGlzLm5vZGVzW2luZGV4XS5yYXdzLmJlZm9yZVxuICAgIH1cblxuICAgIHJldHVybiBzdXBlci5yZW1vdmVDaGlsZChjaGlsZClcbiAgfVxuXG4gIG5vcm1hbGl6ZSAoY2hpbGQsIHNhbXBsZSwgdHlwZSkge1xuICAgIGxldCBub2RlcyA9IHN1cGVyLm5vcm1hbGl6ZShjaGlsZClcblxuICAgIGlmIChzYW1wbGUpIHtcbiAgICAgIGlmICh0eXBlID09PSAncHJlcGVuZCcpIHtcbiAgICAgICAgaWYgKHRoaXMubm9kZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHNhbXBsZS5yYXdzLmJlZm9yZSA9IHRoaXMubm9kZXNbMV0ucmF3cy5iZWZvcmVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgc2FtcGxlLnJhd3MuYmVmb3JlXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGhpcy5maXJzdCAhPT0gc2FtcGxlKSB7XG4gICAgICAgIGZvciAobGV0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICBub2RlLnJhd3MuYmVmb3JlID0gc2FtcGxlLnJhd3MuYmVmb3JlXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZXNcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGEge0BsaW5rIFJlc3VsdH0gaW5zdGFuY2UgcmVwcmVzZW50aW5nIHRoZSByb2904oCZcyBDU1MuXG4gICAqXG4gICAqIEBwYXJhbSB7cHJvY2Vzc09wdGlvbnN9IFtvcHRzXSBPcHRpb25zIHdpdGggb25seSBgdG9gIGFuZCBgbWFwYCBrZXlzLlxuICAgKlxuICAgKiBAcmV0dXJuIHtSZXN1bHR9IFJlc3VsdCB3aXRoIGN1cnJlbnQgcm9vdOKAmXMgQ1NTLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBjb25zdCByb290MSA9IHBvc3Rjc3MucGFyc2UoY3NzMSwgeyBmcm9tOiAnYS5jc3MnIH0pXG4gICAqIGNvbnN0IHJvb3QyID0gcG9zdGNzcy5wYXJzZShjc3MyLCB7IGZyb206ICdiLmNzcycgfSlcbiAgICogcm9vdDEuYXBwZW5kKHJvb3QyKVxuICAgKiBjb25zdCByZXN1bHQgPSByb290MS50b1Jlc3VsdCh7IHRvOiAnYWxsLmNzcycsIG1hcDogdHJ1ZSB9KVxuICAgKi9cbiAgdG9SZXN1bHQgKG9wdHMgPSB7IH0pIHtcbiAgICBsZXQgTGF6eVJlc3VsdCA9IHJlcXVpcmUoJy4vbGF6eS1yZXN1bHQnKVxuICAgIGxldCBQcm9jZXNzb3IgPSByZXF1aXJlKCcuL3Byb2Nlc3NvcicpXG5cbiAgICBsZXQgbGF6eSA9IG5ldyBMYXp5UmVzdWx0KG5ldyBQcm9jZXNzb3IoKSwgdGhpcywgb3B0cylcbiAgICByZXR1cm4gbGF6eS5zdHJpbmdpZnkoKVxuICB9XG5cbiAgLyoqXG4gICAqIEBtZW1iZXJvZiBSb290I1xuICAgKiBAbWVtYmVyIHtvYmplY3R9IHJhd3MgSW5mb3JtYXRpb24gdG8gZ2VuZXJhdGUgYnl0ZS10by1ieXRlIGVxdWFsXG4gICAqICAgICAgICAgICAgICAgICAgICAgICBub2RlIHN0cmluZyBhcyBpdCB3YXMgaW4gdGhlIG9yaWdpbiBpbnB1dC5cbiAgICpcbiAgICogRXZlcnkgcGFyc2VyIHNhdmVzIGl0cyBvd24gcHJvcGVydGllcyxcbiAgICogYnV0IHRoZSBkZWZhdWx0IENTUyBwYXJzZXIgdXNlczpcbiAgICpcbiAgICogKiBgYWZ0ZXJgOiB0aGUgc3BhY2Ugc3ltYm9scyBhZnRlciB0aGUgbGFzdCBjaGlsZCB0byB0aGUgZW5kIG9mIGZpbGUuXG4gICAqICogYHNlbWljb2xvbmA6IGlzIHRoZSBsYXN0IGNoaWxkIGhhcyBhbiAob3B0aW9uYWwpIHNlbWljb2xvbi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogcG9zdGNzcy5wYXJzZSgnYSB7fVxcbicpLnJhd3MgLy89PiB7IGFmdGVyOiAnXFxuJyB9XG4gICAqIHBvc3Rjc3MucGFyc2UoJ2Ege30nKS5yYXdzICAgLy89PiB7IGFmdGVyOiAnJyB9XG4gICAqL1xufVxuXG5leHBvcnQgZGVmYXVsdCBSb290XG4iXX0=
