'use strict';

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _declaration = require('./declaration');

var _declaration2 = _interopRequireDefault(_declaration);

var _comment = require('./comment');

var _comment2 = _interopRequireDefault(_comment);

var _node = require('./node');

var _node2 = _interopRequireDefault(_node);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function cleanSource(nodes) {
  return nodes.map(function (i) {
    if (i.nodes) i.nodes = cleanSource(i.nodes);
    delete i.source;
    return i;
  });
}

/**
 * The {@link Root}, {@link AtRule}, and {@link Rule} container nodes
 * inherit some common methods to help work with their children.
 *
 * Note that all containers can store any content. If you write a rule inside
 * a rule, PostCSS will parse it.
 *
 * @extends Node
 * @abstract
 */

var Container = function (_Node) {
  _inherits(Container, _Node);

  function Container() {
    _classCallCheck(this, Container);

    return _possibleConstructorReturn(this, _Node.apply(this, arguments));
  }

  Container.prototype.push = function push(child) {
    child.parent = this;
    this.nodes.push(child);
    return this;
  };

  /**
   * Iterates through the container’s immediate children,
   * calling `callback` for each child.
   *
   * Returning `false` in the callback will break iteration.
   *
   * This method only iterates through the container’s immediate children.
   * If you need to recursively iterate through all the container’s descendant
   * nodes, use {@link Container#walk}.
   *
   * Unlike the for `{}`-cycle or `Array#forEach` this iterator is safe
   * if you are mutating the array of child nodes during iteration.
   * PostCSS will adjust the current index to match the mutations.
   *
   * @param {childIterator} callback Iterator receives each node and index.
   *
   * @return {false|undefined} Returns `false` if iteration was broke.
   *
   * @example
   * const root = postcss.parse('a { color: black; z-index: 1 }')
   * const rule = root.first
   *
   * for (const decl of rule.nodes) {
   *   decl.cloneBefore({ prop: '-webkit-' + decl.prop })
   *   // Cycle will be infinite, because cloneBefore moves the current node
   *   // to the next index
   * }
   *
   * rule.each(decl => {
   *   decl.cloneBefore({ prop: '-webkit-' + decl.prop })
   *   // Will be executed only for color and z-index
   * })
   */


  Container.prototype.each = function each(callback) {
    if (!this.lastEach) this.lastEach = 0;
    if (!this.indexes) this.indexes = {};

    this.lastEach += 1;
    var id = this.lastEach;
    this.indexes[id] = 0;

    if (!this.nodes) return undefined;

    var index = void 0,
        result = void 0;
    while (this.indexes[id] < this.nodes.length) {
      index = this.indexes[id];
      result = callback(this.nodes[index], index);
      if (result === false) break;

      this.indexes[id] += 1;
    }

    delete this.indexes[id];

    return result;
  };

  /**
   * Traverses the container’s descendant nodes, calling callback
   * for each node.
   *
   * Like container.each(), this method is safe to use
   * if you are mutating arrays during iteration.
   *
   * If you only need to iterate through the container’s immediate children,
   * use {@link Container#each}.
   *
   * @param {childIterator} callback Iterator receives each node and index.
   *
   * @return {false|undefined} Returns `false` if iteration was broke.
   *
   * @example
   * root.walk(node => {
   *   // Traverses all descendant nodes.
   * })
   */


  Container.prototype.walk = function walk(callback) {
    return this.each(function (child, i) {
      var result = void 0;
      try {
        result = callback(child, i);
      } catch (e) {
        e.postcssNode = child;
        if (e.stack && child.source && /\n\s{4}at /.test(e.stack)) {
          var s = child.source;
          e.stack = e.stack.replace(/\n\s{4}at /, '$&' + s.input.from + ':' + s.start.line + ':' + s.start.column + '$&');
        }
        throw e;
      }
      if (result !== false && child.walk) {
        result = child.walk(callback);
      }
      return result;
    });
  };

  /**
   * Traverses the container’s descendant nodes, calling callback
   * for each declaration node.
   *
   * If you pass a filter, iteration will only happen over declarations
   * with matching properties.
   *
   * Like {@link Container#each}, this method is safe
   * to use if you are mutating arrays during iteration.
   *
   * @param {string|RegExp} [prop]   String or regular expression
   *                                 to filter declarations by property name.
   * @param {childIterator} callback Iterator receives each node and index.
   *
   * @return {false|undefined} Returns `false` if iteration was broke.
   *
   * @example
   * root.walkDecls(decl => {
   *   checkPropertySupport(decl.prop)
   * })
   *
   * root.walkDecls('border-radius', decl => {
   *   decl.remove()
   * })
   *
   * root.walkDecls(/^background/, decl => {
   *   decl.value = takeFirstColorFromGradient(decl.value)
   * })
   */


  Container.prototype.walkDecls = function walkDecls(prop, callback) {
    if (!callback) {
      callback = prop;
      return this.walk(function (child, i) {
        if (child.type === 'decl') {
          return callback(child, i);
        }
      });
    } else if (prop instanceof RegExp) {
      return this.walk(function (child, i) {
        if (child.type === 'decl' && prop.test(child.prop)) {
          return callback(child, i);
        }
      });
    } else {
      return this.walk(function (child, i) {
        if (child.type === 'decl' && child.prop === prop) {
          return callback(child, i);
        }
      });
    }
  };

  /**
   * Traverses the container’s descendant nodes, calling callback
   * for each rule node.
   *
   * If you pass a filter, iteration will only happen over rules
   * with matching selectors.
   *
   * Like {@link Container#each}, this method is safe
   * to use if you are mutating arrays during iteration.
   *
   * @param {string|RegExp} [selector] String or regular expression
   *                                   to filter rules by selector.
   * @param {childIterator} callback   Iterator receives each node and index.
   *
   * @return {false|undefined} returns `false` if iteration was broke.
   *
   * @example
   * const selectors = []
   * root.walkRules(rule => {
   *   selectors.push(rule.selector)
   * })
   * console.log(`Your CSS uses ${ selectors.length } selectors`)
   */


  Container.prototype.walkRules = function walkRules(selector, callback) {
    if (!callback) {
      callback = selector;

      return this.walk(function (child, i) {
        if (child.type === 'rule') {
          return callback(child, i);
        }
      });
    } else if (selector instanceof RegExp) {
      return this.walk(function (child, i) {
        if (child.type === 'rule' && selector.test(child.selector)) {
          return callback(child, i);
        }
      });
    } else {
      return this.walk(function (child, i) {
        if (child.type === 'rule' && child.selector === selector) {
          return callback(child, i);
        }
      });
    }
  };

  /**
   * Traverses the container’s descendant nodes, calling callback
   * for each at-rule node.
   *
   * If you pass a filter, iteration will only happen over at-rules
   * that have matching names.
   *
   * Like {@link Container#each}, this method is safe
   * to use if you are mutating arrays during iteration.
   *
   * @param {string|RegExp} [name]   String or regular expression
   *                                 to filter at-rules by name.
   * @param {childIterator} callback Iterator receives each node and index.
   *
   * @return {false|undefined} Returns `false` if iteration was broke.
   *
   * @example
   * root.walkAtRules(rule => {
   *   if (isOld(rule.name)) rule.remove()
   * })
   *
   * let first = false
   * root.walkAtRules('charset', rule => {
   *   if (!first) {
   *     first = true
   *   } else {
   *     rule.remove()
   *   }
   * })
   */


  Container.prototype.walkAtRules = function walkAtRules(name, callback) {
    if (!callback) {
      callback = name;
      return this.walk(function (child, i) {
        if (child.type === 'atrule') {
          return callback(child, i);
        }
      });
    } else if (name instanceof RegExp) {
      return this.walk(function (child, i) {
        if (child.type === 'atrule' && name.test(child.name)) {
          return callback(child, i);
        }
      });
    } else {
      return this.walk(function (child, i) {
        if (child.type === 'atrule' && child.name === name) {
          return callback(child, i);
        }
      });
    }
  };

  /**
   * Traverses the container’s descendant nodes, calling callback
   * for each comment node.
   *
   * Like {@link Container#each}, this method is safe
   * to use if you are mutating arrays during iteration.
   *
   * @param {childIterator} callback Iterator receives each node and index.
   *
   * @return {false|undefined} Returns `false` if iteration was broke.
   *
   * @example
   * root.walkComments(comment => {
   *   comment.remove()
   * })
   */


  Container.prototype.walkComments = function walkComments(callback) {
    return this.walk(function (child, i) {
      if (child.type === 'comment') {
        return callback(child, i);
      }
    });
  };

  /**
   * Inserts new nodes to the end of the container.
   *
   * @param {...(Node|object|string|Node[])} children New nodes.
   *
   * @return {Node} This node for methods chain.
   *
   * @example
   * const decl1 = postcss.decl({ prop: 'color', value: 'black' })
   * const decl2 = postcss.decl({ prop: 'background-color', value: 'white' })
   * rule.append(decl1, decl2)
   *
   * root.append({ name: 'charset', params: '"UTF-8"' })  // at-rule
   * root.append({ selector: 'a' })                       // rule
   * rule.append({ prop: 'color', value: 'black' })       // declaration
   * rule.append({ text: 'Comment' })                     // comment
   *
   * root.append('a {}')
   * root.first.append('color: black; z-index: 1')
   */


  Container.prototype.append = function append() {
    for (var _len = arguments.length, children = Array(_len), _key = 0; _key < _len; _key++) {
      children[_key] = arguments[_key];
    }

    for (var _iterator = children, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref = _i.value;
      }

      var child = _ref;

      var nodes = this.normalize(child, this.last);
      for (var _iterator2 = nodes, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
        var _ref2;

        if (_isArray2) {
          if (_i2 >= _iterator2.length) break;
          _ref2 = _iterator2[_i2++];
        } else {
          _i2 = _iterator2.next();
          if (_i2.done) break;
          _ref2 = _i2.value;
        }

        var node = _ref2;
        this.nodes.push(node);
      }
    }
    return this;
  };

  /**
   * Inserts new nodes to the start of the container.
   *
   * @param {...(Node|object|string|Node[])} children New nodes.
   *
   * @return {Node} This node for methods chain.
   *
   * @example
   * const decl1 = postcss.decl({ prop: 'color', value: 'black' })
   * const decl2 = postcss.decl({ prop: 'background-color', value: 'white' })
   * rule.prepend(decl1, decl2)
   *
   * root.append({ name: 'charset', params: '"UTF-8"' })  // at-rule
   * root.append({ selector: 'a' })                       // rule
   * rule.append({ prop: 'color', value: 'black' })       // declaration
   * rule.append({ text: 'Comment' })                     // comment
   *
   * root.append('a {}')
   * root.first.append('color: black; z-index: 1')
   */


  Container.prototype.prepend = function prepend() {
    for (var _len2 = arguments.length, children = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      children[_key2] = arguments[_key2];
    }

    children = children.reverse();
    for (var _iterator3 = children, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
      var _ref3;

      if (_isArray3) {
        if (_i3 >= _iterator3.length) break;
        _ref3 = _iterator3[_i3++];
      } else {
        _i3 = _iterator3.next();
        if (_i3.done) break;
        _ref3 = _i3.value;
      }

      var child = _ref3;

      var nodes = this.normalize(child, this.first, 'prepend').reverse();
      for (var _iterator4 = nodes, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
        var _ref4;

        if (_isArray4) {
          if (_i4 >= _iterator4.length) break;
          _ref4 = _iterator4[_i4++];
        } else {
          _i4 = _iterator4.next();
          if (_i4.done) break;
          _ref4 = _i4.value;
        }

        var node = _ref4;
        this.nodes.unshift(node);
      }for (var id in this.indexes) {
        this.indexes[id] = this.indexes[id] + nodes.length;
      }
    }
    return this;
  };

  Container.prototype.cleanRaws = function cleanRaws(keepBetween) {
    _Node.prototype.cleanRaws.call(this, keepBetween);
    if (this.nodes) {
      for (var _iterator5 = this.nodes, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
        var _ref5;

        if (_isArray5) {
          if (_i5 >= _iterator5.length) break;
          _ref5 = _iterator5[_i5++];
        } else {
          _i5 = _iterator5.next();
          if (_i5.done) break;
          _ref5 = _i5.value;
        }

        var node = _ref5;
        node.cleanRaws(keepBetween);
      }
    }
  };

  /**
   * Insert new node before old node within the container.
   *
   * @param {Node|number} exist             Child or child’s index.
   * @param {Node|object|string|Node[]} add New node.
   *
   * @return {Node} This node for methods chain.
   *
   * @example
   * rule.insertBefore(decl, decl.clone({ prop: '-webkit-' + decl.prop }))
   */


  Container.prototype.insertBefore = function insertBefore(exist, add) {
    exist = this.index(exist);

    var type = exist === 0 ? 'prepend' : false;
    var nodes = this.normalize(add, this.nodes[exist], type).reverse();
    for (var _iterator6 = nodes, _isArray6 = Array.isArray(_iterator6), _i6 = 0, _iterator6 = _isArray6 ? _iterator6 : _iterator6[Symbol.iterator]();;) {
      var _ref6;

      if (_isArray6) {
        if (_i6 >= _iterator6.length) break;
        _ref6 = _iterator6[_i6++];
      } else {
        _i6 = _iterator6.next();
        if (_i6.done) break;
        _ref6 = _i6.value;
      }

      var node = _ref6;
      this.nodes.splice(exist, 0, node);
    }var index = void 0;
    for (var id in this.indexes) {
      index = this.indexes[id];
      if (exist <= index) {
        this.indexes[id] = index + nodes.length;
      }
    }

    return this;
  };

  /**
   * Insert new node after old node within the container.
   *
   * @param {Node|number} exist             Child or child’s index.
   * @param {Node|object|string|Node[]} add New node.
   *
   * @return {Node} This node for methods chain.
   */


  Container.prototype.insertAfter = function insertAfter(exist, add) {
    exist = this.index(exist);

    var nodes = this.normalize(add, this.nodes[exist]).reverse();
    for (var _iterator7 = nodes, _isArray7 = Array.isArray(_iterator7), _i7 = 0, _iterator7 = _isArray7 ? _iterator7 : _iterator7[Symbol.iterator]();;) {
      var _ref7;

      if (_isArray7) {
        if (_i7 >= _iterator7.length) break;
        _ref7 = _iterator7[_i7++];
      } else {
        _i7 = _iterator7.next();
        if (_i7.done) break;
        _ref7 = _i7.value;
      }

      var node = _ref7;
      this.nodes.splice(exist + 1, 0, node);
    }var index = void 0;
    for (var id in this.indexes) {
      index = this.indexes[id];
      if (exist < index) {
        this.indexes[id] = index + nodes.length;
      }
    }

    return this;
  };

  /**
   * Removes node from the container and cleans the parent properties
   * from the node and its children.
   *
   * @param {Node|number} child Child or child’s index.
   *
   * @return {Node} This node for methods chain
   *
   * @example
   * rule.nodes.length  //=> 5
   * rule.removeChild(decl)
   * rule.nodes.length  //=> 4
   * decl.parent        //=> undefined
   */


  Container.prototype.removeChild = function removeChild(child) {
    child = this.index(child);
    this.nodes[child].parent = undefined;
    this.nodes.splice(child, 1);

    var index = void 0;
    for (var id in this.indexes) {
      index = this.indexes[id];
      if (index >= child) {
        this.indexes[id] = index - 1;
      }
    }

    return this;
  };

  /**
   * Removes all children from the container
   * and cleans their parent properties.
   *
   * @return {Node} This node for methods chain.
   *
   * @example
   * rule.removeAll()
   * rule.nodes.length //=> 0
   */


  Container.prototype.removeAll = function removeAll() {
    for (var _iterator8 = this.nodes, _isArray8 = Array.isArray(_iterator8), _i8 = 0, _iterator8 = _isArray8 ? _iterator8 : _iterator8[Symbol.iterator]();;) {
      var _ref8;

      if (_isArray8) {
        if (_i8 >= _iterator8.length) break;
        _ref8 = _iterator8[_i8++];
      } else {
        _i8 = _iterator8.next();
        if (_i8.done) break;
        _ref8 = _i8.value;
      }

      var node = _ref8;
      node.parent = undefined;
    }this.nodes = [];
    return this;
  };

  /**
   * Passes all declaration values within the container that match pattern
   * through callback, replacing those values with the returned result
   * of callback.
   *
   * This method is useful if you are using a custom unit or function
   * and need to iterate through all values.
   *
   * @param {string|RegExp} pattern      Replace pattern.
   * @param {object} opts                Options to speed up the search.
   * @param {string|string[]} opts.props An array of property names.
   * @param {string} opts.fast           String that’s used to narrow down
   *                                     values and speed up the regexp search.
   * @param {function|string} callback   String to replace pattern or callback
   *                                     that returns a new value. The callback
   *                                     will receive the same arguments
   *                                     as those passed to a function parameter
   *                                     of `String#replace`.
   *
   * @return {Node} This node for methods chain.
   *
   * @example
   * root.replaceValues(/\d+rem/, { fast: 'rem' }, string => {
   *   return 15 * parseInt(string) + 'px'
   * })
   */


  Container.prototype.replaceValues = function replaceValues(pattern, opts, callback) {
    if (!callback) {
      callback = opts;
      opts = {};
    }

    this.walkDecls(function (decl) {
      if (opts.props && opts.props.indexOf(decl.prop) === -1) return;
      if (opts.fast && decl.value.indexOf(opts.fast) === -1) return;

      decl.value = decl.value.replace(pattern, callback);
    });

    return this;
  };

  /**
   * Returns `true` if callback returns `true`
   * for all of the container’s children.
   *
   * @param {childCondition} condition Iterator returns true or false.
   *
   * @return {boolean} Is every child pass condition.
   *
   * @example
   * const noPrefixes = rule.every(i => i.prop[0] !== '-')
   */


  Container.prototype.every = function every(condition) {
    return this.nodes.every(condition);
  };

  /**
   * Returns `true` if callback returns `true` for (at least) one
   * of the container’s children.
   *
   * @param {childCondition} condition Iterator returns true or false.
   *
   * @return {boolean} Is some child pass condition.
   *
   * @example
   * const hasPrefix = rule.some(i => i.prop[0] === '-')
   */


  Container.prototype.some = function some(condition) {
    return this.nodes.some(condition);
  };

  /**
   * Returns a `child`’s index within the {@link Container#nodes} array.
   *
   * @param {Node} child Child of the current container.
   *
   * @return {number} Child index.
   *
   * @example
   * rule.index( rule.nodes[2] ) //=> 2
   */


  Container.prototype.index = function index(child) {
    if (typeof child === 'number') {
      return child;
    } else {
      return this.nodes.indexOf(child);
    }
  };

  /**
   * The container’s first child.
   *
   * @type {Node}
   *
   * @example
   * rule.first === rules.nodes[0]
   */


  Container.prototype.normalize = function normalize(nodes, sample) {
    var _this2 = this;

    if (typeof nodes === 'string') {
      var parse = require('./parse');
      nodes = cleanSource(parse(nodes).nodes);
    } else if (Array.isArray(nodes)) {
      nodes = nodes.slice(0);
      for (var _iterator9 = nodes, _isArray9 = Array.isArray(_iterator9), _i9 = 0, _iterator9 = _isArray9 ? _iterator9 : _iterator9[Symbol.iterator]();;) {
        var _ref9;

        if (_isArray9) {
          if (_i9 >= _iterator9.length) break;
          _ref9 = _iterator9[_i9++];
        } else {
          _i9 = _iterator9.next();
          if (_i9.done) break;
          _ref9 = _i9.value;
        }

        var i = _ref9;

        if (i.parent) i.parent.removeChild(i, 'ignore');
      }
    } else if (nodes.type === 'root') {
      nodes = nodes.nodes.slice(0);
      for (var _iterator10 = nodes, _isArray10 = Array.isArray(_iterator10), _i11 = 0, _iterator10 = _isArray10 ? _iterator10 : _iterator10[Symbol.iterator]();;) {
        var _ref10;

        if (_isArray10) {
          if (_i11 >= _iterator10.length) break;
          _ref10 = _iterator10[_i11++];
        } else {
          _i11 = _iterator10.next();
          if (_i11.done) break;
          _ref10 = _i11.value;
        }

        var _i10 = _ref10;

        if (_i10.parent) _i10.parent.removeChild(_i10, 'ignore');
      }
    } else if (nodes.type) {
      nodes = [nodes];
    } else if (nodes.prop) {
      if (typeof nodes.value === 'undefined') {
        throw new Error('Value field is missed in node creation');
      } else if (typeof nodes.value !== 'string') {
        nodes.value = String(nodes.value);
      }
      nodes = [new _declaration2.default(nodes)];
    } else if (nodes.selector) {
      var Rule = require('./rule');
      nodes = [new Rule(nodes)];
    } else if (nodes.name) {
      var AtRule = require('./at-rule');
      nodes = [new AtRule(nodes)];
    } else if (nodes.text) {
      nodes = [new _comment2.default(nodes)];
    } else {
      throw new Error('Unknown node type in node creation');
    }

    var processed = nodes.map(function (i) {
      if (i.parent) i.parent.removeChild(i);
      if (typeof i.raws.before === 'undefined') {
        if (sample && typeof sample.raws.before !== 'undefined') {
          i.raws.before = sample.raws.before.replace(/[^\s]/g, '');
        }
      }
      i.parent = _this2;
      return i;
    });

    return processed;
  };

  /**
   * @memberof Container#
   * @member {Node[]} nodes An array containing the container’s children.
   *
   * @example
   * const root = postcss.parse('a { color: black }')
   * root.nodes.length           //=> 1
   * root.nodes[0].selector      //=> 'a'
   * root.nodes[0].nodes[0].prop //=> 'color'
   */


  _createClass(Container, [{
    key: 'first',
    get: function get() {
      if (!this.nodes) return undefined;
      return this.nodes[0];
    }

    /**
     * The container’s last child.
     *
     * @type {Node}
     *
     * @example
     * rule.last === rule.nodes[rule.nodes.length - 1]
     */

  }, {
    key: 'last',
    get: function get() {
      if (!this.nodes) return undefined;
      return this.nodes[this.nodes.length - 1];
    }
  }]);

  return Container;
}(_node2.default);

exports.default = Container;

/**
 * @callback childCondition
 * @param {Node} node    Container child.
 * @param {number} index Child index.
 * @param {Node[]} nodes All container children.
 * @return {boolean}
 */

/**
 * @callback childIterator
 * @param {Node} node    Container child.
 * @param {number} index Child index.
 * @return {false|undefined} Returning `false` will break iteration.
 */

module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbnRhaW5lci5lczYiXSwibmFtZXMiOlsiY2xlYW5Tb3VyY2UiLCJub2RlcyIsIm1hcCIsImkiLCJzb3VyY2UiLCJDb250YWluZXIiLCJwdXNoIiwiY2hpbGQiLCJwYXJlbnQiLCJlYWNoIiwiY2FsbGJhY2siLCJsYXN0RWFjaCIsImluZGV4ZXMiLCJpZCIsInVuZGVmaW5lZCIsImluZGV4IiwicmVzdWx0IiwibGVuZ3RoIiwid2FsayIsImUiLCJwb3N0Y3NzTm9kZSIsInN0YWNrIiwidGVzdCIsInMiLCJyZXBsYWNlIiwiaW5wdXQiLCJmcm9tIiwic3RhcnQiLCJsaW5lIiwiY29sdW1uIiwid2Fsa0RlY2xzIiwicHJvcCIsInR5cGUiLCJSZWdFeHAiLCJ3YWxrUnVsZXMiLCJzZWxlY3RvciIsIndhbGtBdFJ1bGVzIiwibmFtZSIsIndhbGtDb21tZW50cyIsImFwcGVuZCIsImNoaWxkcmVuIiwibm9ybWFsaXplIiwibGFzdCIsIm5vZGUiLCJwcmVwZW5kIiwicmV2ZXJzZSIsImZpcnN0IiwidW5zaGlmdCIsImNsZWFuUmF3cyIsImtlZXBCZXR3ZWVuIiwiaW5zZXJ0QmVmb3JlIiwiZXhpc3QiLCJhZGQiLCJzcGxpY2UiLCJpbnNlcnRBZnRlciIsInJlbW92ZUNoaWxkIiwicmVtb3ZlQWxsIiwicmVwbGFjZVZhbHVlcyIsInBhdHRlcm4iLCJvcHRzIiwicHJvcHMiLCJpbmRleE9mIiwiZGVjbCIsImZhc3QiLCJ2YWx1ZSIsImV2ZXJ5IiwiY29uZGl0aW9uIiwic29tZSIsInNhbXBsZSIsInBhcnNlIiwicmVxdWlyZSIsIkFycmF5IiwiaXNBcnJheSIsInNsaWNlIiwiRXJyb3IiLCJTdHJpbmciLCJEZWNsYXJhdGlvbiIsIlJ1bGUiLCJBdFJ1bGUiLCJ0ZXh0IiwiQ29tbWVudCIsInByb2Nlc3NlZCIsInJhd3MiLCJiZWZvcmUiLCJOb2RlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7Ozs7OztBQUVBLFNBQVNBLFdB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Ozs7Ozs7Ozs7Ozt3QkFRWTtBQUNWLFVBQUksQ0FBQyxLQUFLQSxLQUFWLEVBQWlCLE9BQU9hLFNBQVA7QUFDakIsYUFBTyxLQUFLYixLQUFMLENBQVcsS0FBS0EsS0FBTCxDQUFXZ0IsTUFBWCxHQUFvQixDQUEvQixDQUFQO0FBQ0Q7Ozs7RUFqakJxQm1FLGM7O2tCQWduQlQvRSxTOztBQUVmOzs7Ozs7OztBQVFBIiwiZmlsZSI6ImNvbnRhaW5lci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBEZWNsYXJhdGlvbiBmcm9tICcuL2RlY2xhcmF0aW9uJ1xuaW1wb3J0IENvbW1lbnQgZnJvbSAnLi9jb21tZW50J1xuaW1wb3J0IE5vZGUgZnJvbSAnLi9ub2RlJ1xuXG5mdW5jdGlvbiBjbGVhblNvdXJjZSAobm9kZXMpIHtcbiAgcmV0dXJuIG5vZGVzLm1hcChpID0+IHtcbiAgICBpZiAoaS5ub2RlcykgaS5ub2RlcyA9IGNsZWFuU291cmNlKGkubm9kZXMpXG4gICAgZGVsZXRlIGkuc291cmNlXG4gICAgcmV0dXJuIGlcbiAgfSlcbn1cblxuLyoqXG4gKiBUaGUge0BsaW5rIFJvb3R9LCB7QGxpbmsgQXRSdWxlfSwgYW5kIHtAbGluayBSdWxlfSBjb250YWluZXIgbm9kZXNcbiAqIGluaGVyaXQgc29tZSBjb21tb24gbWV0aG9kcyB0byBoZWxwIHdvcmsgd2l0aCB0aGVpciBjaGlsZHJlbi5cbiAqXG4gKiBOb3RlIHRoYXQgYWxsIGNvbnRhaW5lcnMgY2FuIHN0b3JlIGFueSBjb250ZW50LiBJZiB5b3Ugd3JpdGUgYSBydWxlIGluc2lkZVxuICogYSBydWxlLCBQb3N0Q1NTIHdpbGwgcGFyc2UgaXQuXG4gKlxuICogQGV4dGVuZHMgTm9kZVxuICogQGFic3RyYWN0XG4gKi9cbmNsYXNzIENvbnRhaW5lciBleHRlbmRzIE5vZGUge1xuICBwdXNoIChjaGlsZCkge1xuICAgIGNoaWxkLnBhcmVudCA9IHRoaXNcbiAgICB0aGlzLm5vZGVzLnB1c2goY2hpbGQpXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIC8qKlxuICAgKiBJdGVyYXRlcyB0aHJvdWdoIHRoZSBjb250YWluZXLigJlzIGltbWVkaWF0ZSBjaGlsZHJlbixcbiAgICogY2FsbGluZyBgY2FsbGJhY2tgIGZvciBlYWNoIGNoaWxkLlxuICAgKlxuICAgKiBSZXR1cm5pbmcgYGZhbHNlYCBpbiB0aGUgY2FsbGJhY2sgd2lsbCBicmVhayBpdGVyYXRpb24uXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIG9ubHkgaXRlcmF0ZXMgdGhyb3VnaCB0aGUgY29udGFpbmVy4oCZcyBpbW1lZGlhdGUgY2hpbGRyZW4uXG4gICAqIElmIHlvdSBuZWVkIHRvIHJlY3Vyc2l2ZWx5IGl0ZXJhdGUgdGhyb3VnaCBhbGwgdGhlIGNvbnRhaW5lcuKAmXMgZGVzY2VuZGFudFxuICAgKiBub2RlcywgdXNlIHtAbGluayBDb250YWluZXIjd2Fsa30uXG4gICAqXG4gICAqIFVubGlrZSB0aGUgZm9yIGB7fWAtY3ljbGUgb3IgYEFycmF5I2ZvckVhY2hgIHRoaXMgaXRlcmF0b3IgaXMgc2FmZVxuICAgKiBpZiB5b3UgYXJlIG11dGF0aW5nIHRoZSBhcnJheSBvZiBjaGlsZCBub2RlcyBkdXJpbmcgaXRlcmF0aW9uLlxuICAgKiBQb3N0Q1NTIHdpbGwgYWRqdXN0IHRoZSBjdXJyZW50IGluZGV4IHRvIG1hdGNoIHRoZSBtdXRhdGlvbnMuXG4gICAqXG4gICAqIEBwYXJhbSB7Y2hpbGRJdGVyYXRvcn0gY2FsbGJhY2sgSXRlcmF0b3IgcmVjZWl2ZXMgZWFjaCBub2RlIGFuZCBpbmRleC5cbiAgICpcbiAgICogQHJldHVybiB7ZmFsc2V8dW5kZWZpbmVkfSBSZXR1cm5zIGBmYWxzZWAgaWYgaXRlcmF0aW9uIHdhcyBicm9rZS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogY29uc3Qgcm9vdCA9IHBvc3Rjc3MucGFyc2UoJ2EgeyBjb2xvcjogYmxhY2s7IHotaW5kZXg6IDEgfScpXG4gICAqIGNvbnN0IHJ1bGUgPSByb290LmZpcnN0XG4gICAqXG4gICAqIGZvciAoY29uc3QgZGVjbCBvZiBydWxlLm5vZGVzKSB7XG4gICAqICAgZGVjbC5jbG9uZUJlZm9yZSh7IHByb3A6ICctd2Via2l0LScgKyBkZWNsLnByb3AgfSlcbiAgICogICAvLyBDeWNsZSB3aWxsIGJlIGluZmluaXRlLCBiZWNhdXNlIGNsb25lQmVmb3JlIG1vdmVzIHRoZSBjdXJyZW50IG5vZGVcbiAgICogICAvLyB0byB0aGUgbmV4dCBpbmRleFxuICAgKiB9XG4gICAqXG4gICAqIHJ1bGUuZWFjaChkZWNsID0+IHtcbiAgICogICBkZWNsLmNsb25lQmVmb3JlKHsgcHJvcDogJy13ZWJraXQtJyArIGRlY2wucHJvcCB9KVxuICAgKiAgIC8vIFdpbGwgYmUgZXhlY3V0ZWQgb25seSBmb3IgY29sb3IgYW5kIHotaW5kZXhcbiAgICogfSlcbiAgICovXG4gIGVhY2ggKGNhbGxiYWNrKSB7XG4gICAgaWYgKCF0aGlzLmxhc3RFYWNoKSB0aGlzLmxhc3RFYWNoID0gMFxuICAgIGlmICghdGhpcy5pbmRleGVzKSB0aGlzLmluZGV4ZXMgPSB7IH1cblxuICAgIHRoaXMubGFzdEVhY2ggKz0gMVxuICAgIGxldCBpZCA9IHRoaXMubGFzdEVhY2hcbiAgICB0aGlzLmluZGV4ZXNbaWRdID0gMFxuXG4gICAgaWYgKCF0aGlzLm5vZGVzKSByZXR1cm4gdW5kZWZpbmVkXG5cbiAgICBsZXQgaW5kZXgsIHJlc3VsdFxuICAgIHdoaWxlICh0aGlzLmluZGV4ZXNbaWRdIDwgdGhpcy5ub2Rlcy5sZW5ndGgpIHtcbiAgICAgIGluZGV4ID0gdGhpcy5pbmRleGVzW2lkXVxuICAgICAgcmVzdWx0ID0gY2FsbGJhY2sodGhpcy5ub2Rlc1tpbmRleF0sIGluZGV4KVxuICAgICAgaWYgKHJlc3VsdCA9PT0gZmFsc2UpIGJyZWFrXG5cbiAgICAgIHRoaXMuaW5kZXhlc1tpZF0gKz0gMVxuICAgIH1cblxuICAgIGRlbGV0ZSB0aGlzLmluZGV4ZXNbaWRdXG5cbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICAvKipcbiAgICogVHJhdmVyc2VzIHRoZSBjb250YWluZXLigJlzIGRlc2NlbmRhbnQgbm9kZXMsIGNhbGxpbmcgY2FsbGJhY2tcbiAgICogZm9yIGVhY2ggbm9kZS5cbiAgICpcbiAgICogTGlrZSBjb250YWluZXIuZWFjaCgpLCB0aGlzIG1ldGhvZCBpcyBzYWZlIHRvIHVzZVxuICAgKiBpZiB5b3UgYXJlIG11dGF0aW5nIGFycmF5cyBkdXJpbmcgaXRlcmF0aW9uLlxuICAgKlxuICAgKiBJZiB5b3Ugb25seSBuZWVkIHRvIGl0ZXJhdGUgdGhyb3VnaCB0aGUgY29udGFpbmVy4oCZcyBpbW1lZGlhdGUgY2hpbGRyZW4sXG4gICAqIHVzZSB7QGxpbmsgQ29udGFpbmVyI2VhY2h9LlxuICAgKlxuICAgKiBAcGFyYW0ge2NoaWxkSXRlcmF0b3J9IGNhbGxiYWNrIEl0ZXJhdG9yIHJlY2VpdmVzIGVhY2ggbm9kZSBhbmQgaW5kZXguXG4gICAqXG4gICAqIEByZXR1cm4ge2ZhbHNlfHVuZGVmaW5lZH0gUmV0dXJucyBgZmFsc2VgIGlmIGl0ZXJhdGlvbiB3YXMgYnJva2UuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHJvb3Qud2Fsayhub2RlID0+IHtcbiAgICogICAvLyBUcmF2ZXJzZXMgYWxsIGRlc2NlbmRhbnQgbm9kZXMuXG4gICAqIH0pXG4gICAqL1xuICB3YWxrIChjYWxsYmFjaykge1xuICAgIHJldHVybiB0aGlzLmVhY2goKGNoaWxkLCBpKSA9PiB7XG4gICAgICBsZXQgcmVzdWx0XG4gICAgICB0cnkge1xuICAgICAgICByZXN1bHQgPSBjYWxsYmFjayhjaGlsZCwgaSlcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZS5wb3N0Y3NzTm9kZSA9IGNoaWxkXG4gICAgICAgIGlmIChlLnN0YWNrICYmIGNoaWxkLnNvdXJjZSAmJiAvXFxuXFxzezR9YXQgLy50ZXN0KGUuc3RhY2spKSB7XG4gICAgICAgICAgbGV0IHMgPSBjaGlsZC5zb3VyY2VcbiAgICAgICAgICBlLnN0YWNrID0gZS5zdGFjay5yZXBsYWNlKC9cXG5cXHN7NH1hdCAvLFxuICAgICAgICAgICAgYCQmJHsgcy5pbnB1dC5mcm9tIH06JHsgcy5zdGFydC5saW5lIH06JHsgcy5zdGFydC5jb2x1bW4gfSQmYClcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBlXG4gICAgICB9XG4gICAgICBpZiAocmVzdWx0ICE9PSBmYWxzZSAmJiBjaGlsZC53YWxrKSB7XG4gICAgICAgIHJlc3VsdCA9IGNoaWxkLndhbGsoY2FsbGJhY2spXG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0XG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmF2ZXJzZXMgdGhlIGNvbnRhaW5lcuKAmXMgZGVzY2VuZGFudCBub2RlcywgY2FsbGluZyBjYWxsYmFja1xuICAgKiBmb3IgZWFjaCBkZWNsYXJhdGlvbiBub2RlLlxuICAgKlxuICAgKiBJZiB5b3UgcGFzcyBhIGZpbHRlciwgaXRlcmF0aW9uIHdpbGwgb25seSBoYXBwZW4gb3ZlciBkZWNsYXJhdGlvbnNcbiAgICogd2l0aCBtYXRjaGluZyBwcm9wZXJ0aWVzLlxuICAgKlxuICAgKiBMaWtlIHtAbGluayBDb250YWluZXIjZWFjaH0sIHRoaXMgbWV0aG9kIGlzIHNhZmVcbiAgICogdG8gdXNlIGlmIHlvdSBhcmUgbXV0YXRpbmcgYXJyYXlzIGR1cmluZyBpdGVyYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfFJlZ0V4cH0gW3Byb3BdICAgU3RyaW5nIG9yIHJlZ3VsYXIgZXhwcmVzc2lvblxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvIGZpbHRlciBkZWNsYXJhdGlvbnMgYnkgcHJvcGVydHkgbmFtZS5cbiAgICogQHBhcmFtIHtjaGlsZEl0ZXJhdG9yfSBjYWxsYmFjayBJdGVyYXRvciByZWNlaXZlcyBlYWNoIG5vZGUgYW5kIGluZGV4LlxuICAgKlxuICAgKiBAcmV0dXJuIHtmYWxzZXx1bmRlZmluZWR9IFJldHVybnMgYGZhbHNlYCBpZiBpdGVyYXRpb24gd2FzIGJyb2tlLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiByb290LndhbGtEZWNscyhkZWNsID0+IHtcbiAgICogICBjaGVja1Byb3BlcnR5U3VwcG9ydChkZWNsLnByb3ApXG4gICAqIH0pXG4gICAqXG4gICAqIHJvb3Qud2Fsa0RlY2xzKCdib3JkZXItcmFkaXVzJywgZGVjbCA9PiB7XG4gICAqICAgZGVjbC5yZW1vdmUoKVxuICAgKiB9KVxuICAgKlxuICAgKiByb290LndhbGtEZWNscygvXmJhY2tncm91bmQvLCBkZWNsID0+IHtcbiAgICogICBkZWNsLnZhbHVlID0gdGFrZUZpcnN0Q29sb3JGcm9tR3JhZGllbnQoZGVjbC52YWx1ZSlcbiAgICogfSlcbiAgICovXG4gIHdhbGtEZWNscyAocHJvcCwgY2FsbGJhY2spIHtcbiAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayA9IHByb3BcbiAgICAgIHJldHVybiB0aGlzLndhbGsoKGNoaWxkLCBpKSA9PiB7XG4gICAgICAgIGlmIChjaGlsZC50eXBlID09PSAnZGVjbCcpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soY2hpbGQsIGkpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSBlbHNlIGlmIChwcm9wIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICByZXR1cm4gdGhpcy53YWxrKChjaGlsZCwgaSkgPT4ge1xuICAgICAgICBpZiAoY2hpbGQudHlwZSA9PT0gJ2RlY2wnICYmIHByb3AudGVzdChjaGlsZC5wcm9wKSkge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhjaGlsZCwgaSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMud2FsaygoY2hpbGQsIGkpID0+IHtcbiAgICAgICAgaWYgKGNoaWxkLnR5cGUgPT09ICdkZWNsJyAmJiBjaGlsZC5wcm9wID09PSBwcm9wKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGNoaWxkLCBpKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUcmF2ZXJzZXMgdGhlIGNvbnRhaW5lcuKAmXMgZGVzY2VuZGFudCBub2RlcywgY2FsbGluZyBjYWxsYmFja1xuICAgKiBmb3IgZWFjaCBydWxlIG5vZGUuXG4gICAqXG4gICAqIElmIHlvdSBwYXNzIGEgZmlsdGVyLCBpdGVyYXRpb24gd2lsbCBvbmx5IGhhcHBlbiBvdmVyIHJ1bGVzXG4gICAqIHdpdGggbWF0Y2hpbmcgc2VsZWN0b3JzLlxuICAgKlxuICAgKiBMaWtlIHtAbGluayBDb250YWluZXIjZWFjaH0sIHRoaXMgbWV0aG9kIGlzIHNhZmVcbiAgICogdG8gdXNlIGlmIHlvdSBhcmUgbXV0YXRpbmcgYXJyYXlzIGR1cmluZyBpdGVyYXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfFJlZ0V4cH0gW3NlbGVjdG9yXSBTdHJpbmcgb3IgcmVndWxhciBleHByZXNzaW9uXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0byBmaWx0ZXIgcnVsZXMgYnkgc2VsZWN0b3IuXG4gICAqIEBwYXJhbSB7Y2hpbGRJdGVyYXRvcn0gY2FsbGJhY2sgICBJdGVyYXRvciByZWNlaXZlcyBlYWNoIG5vZGUgYW5kIGluZGV4LlxuICAgKlxuICAgKiBAcmV0dXJuIHtmYWxzZXx1bmRlZmluZWR9IHJldHVybnMgYGZhbHNlYCBpZiBpdGVyYXRpb24gd2FzIGJyb2tlLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBjb25zdCBzZWxlY3RvcnMgPSBbXVxuICAgKiByb290LndhbGtSdWxlcyhydWxlID0+IHtcbiAgICogICBzZWxlY3RvcnMucHVzaChydWxlLnNlbGVjdG9yKVxuICAgKiB9KVxuICAgKiBjb25zb2xlLmxvZyhgWW91ciBDU1MgdXNlcyAkeyBzZWxlY3RvcnMubGVuZ3RoIH0gc2VsZWN0b3JzYClcbiAgICovXG4gIHdhbGtSdWxlcyAoc2VsZWN0b3IsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2sgPSBzZWxlY3RvclxuXG4gICAgICByZXR1cm4gdGhpcy53YWxrKChjaGlsZCwgaSkgPT4ge1xuICAgICAgICBpZiAoY2hpbGQudHlwZSA9PT0gJ3J1bGUnKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGNoaWxkLCBpKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0gZWxzZSBpZiAoc2VsZWN0b3IgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAgIHJldHVybiB0aGlzLndhbGsoKGNoaWxkLCBpKSA9PiB7XG4gICAgICAgIGlmIChjaGlsZC50eXBlID09PSAncnVsZScgJiYgc2VsZWN0b3IudGVzdChjaGlsZC5zZWxlY3RvcikpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soY2hpbGQsIGkpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLndhbGsoKGNoaWxkLCBpKSA9PiB7XG4gICAgICAgIGlmIChjaGlsZC50eXBlID09PSAncnVsZScgJiYgY2hpbGQuc2VsZWN0b3IgPT09IHNlbGVjdG9yKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGNoaWxkLCBpKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUcmF2ZXJzZXMgdGhlIGNvbnRhaW5lcuKAmXMgZGVzY2VuZGFudCBub2RlcywgY2FsbGluZyBjYWxsYmFja1xuICAgKiBmb3IgZWFjaCBhdC1ydWxlIG5vZGUuXG4gICAqXG4gICAqIElmIHlvdSBwYXNzIGEgZmlsdGVyLCBpdGVyYXRpb24gd2lsbCBvbmx5IGhhcHBlbiBvdmVyIGF0LXJ1bGVzXG4gICAqIHRoYXQgaGF2ZSBtYXRjaGluZyBuYW1lcy5cbiAgICpcbiAgICogTGlrZSB7QGxpbmsgQ29udGFpbmVyI2VhY2h9LCB0aGlzIG1ldGhvZCBpcyBzYWZlXG4gICAqIHRvIHVzZSBpZiB5b3UgYXJlIG11dGF0aW5nIGFycmF5cyBkdXJpbmcgaXRlcmF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ3xSZWdFeHB9IFtuYW1lXSAgIFN0cmluZyBvciByZWd1bGFyIGV4cHJlc3Npb25cbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0byBmaWx0ZXIgYXQtcnVsZXMgYnkgbmFtZS5cbiAgICogQHBhcmFtIHtjaGlsZEl0ZXJhdG9yfSBjYWxsYmFjayBJdGVyYXRvciByZWNlaXZlcyBlYWNoIG5vZGUgYW5kIGluZGV4LlxuICAgKlxuICAgKiBAcmV0dXJuIHtmYWxzZXx1bmRlZmluZWR9IFJldHVybnMgYGZhbHNlYCBpZiBpdGVyYXRpb24gd2FzIGJyb2tlLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiByb290LndhbGtBdFJ1bGVzKHJ1bGUgPT4ge1xuICAgKiAgIGlmIChpc09sZChydWxlLm5hbWUpKSBydWxlLnJlbW92ZSgpXG4gICAqIH0pXG4gICAqXG4gICAqIGxldCBmaXJzdCA9IGZhbHNlXG4gICAqIHJvb3Qud2Fsa0F0UnVsZXMoJ2NoYXJzZXQnLCBydWxlID0+IHtcbiAgICogICBpZiAoIWZpcnN0KSB7XG4gICAqICAgICBmaXJzdCA9IHRydWVcbiAgICogICB9IGVsc2Uge1xuICAgKiAgICAgcnVsZS5yZW1vdmUoKVxuICAgKiAgIH1cbiAgICogfSlcbiAgICovXG4gIHdhbGtBdFJ1bGVzIChuYW1lLCBjYWxsYmFjaykge1xuICAgIGlmICghY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrID0gbmFtZVxuICAgICAgcmV0dXJuIHRoaXMud2FsaygoY2hpbGQsIGkpID0+IHtcbiAgICAgICAgaWYgKGNoaWxkLnR5cGUgPT09ICdhdHJ1bGUnKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGNoaWxkLCBpKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0gZWxzZSBpZiAobmFtZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgcmV0dXJuIHRoaXMud2FsaygoY2hpbGQsIGkpID0+IHtcbiAgICAgICAgaWYgKGNoaWxkLnR5cGUgPT09ICdhdHJ1bGUnICYmIG5hbWUudGVzdChjaGlsZC5uYW1lKSkge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhjaGlsZCwgaSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMud2FsaygoY2hpbGQsIGkpID0+IHtcbiAgICAgICAgaWYgKGNoaWxkLnR5cGUgPT09ICdhdHJ1bGUnICYmIGNoaWxkLm5hbWUgPT09IG5hbWUpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soY2hpbGQsIGkpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRyYXZlcnNlcyB0aGUgY29udGFpbmVy4oCZcyBkZXNjZW5kYW50IG5vZGVzLCBjYWxsaW5nIGNhbGxiYWNrXG4gICAqIGZvciBlYWNoIGNvbW1lbnQgbm9kZS5cbiAgICpcbiAgICogTGlrZSB7QGxpbmsgQ29udGFpbmVyI2VhY2h9LCB0aGlzIG1ldGhvZCBpcyBzYWZlXG4gICAqIHRvIHVzZSBpZiB5b3UgYXJlIG11dGF0aW5nIGFycmF5cyBkdXJpbmcgaXRlcmF0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0ge2NoaWxkSXRlcmF0b3J9IGNhbGxiYWNrIEl0ZXJhdG9yIHJlY2VpdmVzIGVhY2ggbm9kZSBhbmQgaW5kZXguXG4gICAqXG4gICAqIEByZXR1cm4ge2ZhbHNlfHVuZGVmaW5lZH0gUmV0dXJucyBgZmFsc2VgIGlmIGl0ZXJhdGlvbiB3YXMgYnJva2UuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHJvb3Qud2Fsa0NvbW1lbnRzKGNvbW1lbnQgPT4ge1xuICAgKiAgIGNvbW1lbnQucmVtb3ZlKClcbiAgICogfSlcbiAgICovXG4gIHdhbGtDb21tZW50cyAoY2FsbGJhY2spIHtcbiAgICByZXR1cm4gdGhpcy53YWxrKChjaGlsZCwgaSkgPT4ge1xuICAgICAgaWYgKGNoaWxkLnR5cGUgPT09ICdjb21tZW50Jykge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soY2hpbGQsIGkpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBJbnNlcnRzIG5ldyBub2RlcyB0byB0aGUgZW5kIG9mIHRoZSBjb250YWluZXIuXG4gICAqXG4gICAqIEBwYXJhbSB7Li4uKE5vZGV8b2JqZWN0fHN0cmluZ3xOb2RlW10pfSBjaGlsZHJlbiBOZXcgbm9kZXMuXG4gICAqXG4gICAqIEByZXR1cm4ge05vZGV9IFRoaXMgbm9kZSBmb3IgbWV0aG9kcyBjaGFpbi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogY29uc3QgZGVjbDEgPSBwb3N0Y3NzLmRlY2woeyBwcm9wOiAnY29sb3InLCB2YWx1ZTogJ2JsYWNrJyB9KVxuICAgKiBjb25zdCBkZWNsMiA9IHBvc3Rjc3MuZGVjbCh7IHByb3A6ICdiYWNrZ3JvdW5kLWNvbG9yJywgdmFsdWU6ICd3aGl0ZScgfSlcbiAgICogcnVsZS5hcHBlbmQoZGVjbDEsIGRlY2wyKVxuICAgKlxuICAgKiByb290LmFwcGVuZCh7IG5hbWU6ICdjaGFyc2V0JywgcGFyYW1zOiAnXCJVVEYtOFwiJyB9KSAgLy8gYXQtcnVsZVxuICAgKiByb290LmFwcGVuZCh7IHNlbGVjdG9yOiAnYScgfSkgICAgICAgICAgICAgICAgICAgICAgIC8vIHJ1bGVcbiAgICogcnVsZS5hcHBlbmQoeyBwcm9wOiAnY29sb3InLCB2YWx1ZTogJ2JsYWNrJyB9KSAgICAgICAvLyBkZWNsYXJhdGlvblxuICAgKiBydWxlLmFwcGVuZCh7IHRleHQ6ICdDb21tZW50JyB9KSAgICAgICAgICAgICAgICAgICAgIC8vIGNvbW1lbnRcbiAgICpcbiAgICogcm9vdC5hcHBlbmQoJ2Ege30nKVxuICAgKiByb290LmZpcnN0LmFwcGVuZCgnY29sb3I6IGJsYWNrOyB6LWluZGV4OiAxJylcbiAgICovXG4gIGFwcGVuZCAoLi4uY2hpbGRyZW4pIHtcbiAgICBmb3IgKGxldCBjaGlsZCBvZiBjaGlsZHJlbikge1xuICAgICAgbGV0IG5vZGVzID0gdGhpcy5ub3JtYWxpemUoY2hpbGQsIHRoaXMubGFzdClcbiAgICAgIGZvciAobGV0IG5vZGUgb2Ygbm9kZXMpIHRoaXMubm9kZXMucHVzaChub2RlKVxuICAgIH1cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIEluc2VydHMgbmV3IG5vZGVzIHRvIHRoZSBzdGFydCBvZiB0aGUgY29udGFpbmVyLlxuICAgKlxuICAgKiBAcGFyYW0gey4uLihOb2RlfG9iamVjdHxzdHJpbmd8Tm9kZVtdKX0gY2hpbGRyZW4gTmV3IG5vZGVzLlxuICAgKlxuICAgKiBAcmV0dXJuIHtOb2RlfSBUaGlzIG5vZGUgZm9yIG1ldGhvZHMgY2hhaW4uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnN0IGRlY2wxID0gcG9zdGNzcy5kZWNsKHsgcHJvcDogJ2NvbG9yJywgdmFsdWU6ICdibGFjaycgfSlcbiAgICogY29uc3QgZGVjbDIgPSBwb3N0Y3NzLmRlY2woeyBwcm9wOiAnYmFja2dyb3VuZC1jb2xvcicsIHZhbHVlOiAnd2hpdGUnIH0pXG4gICAqIHJ1bGUucHJlcGVuZChkZWNsMSwgZGVjbDIpXG4gICAqXG4gICAqIHJvb3QuYXBwZW5kKHsgbmFtZTogJ2NoYXJzZXQnLCBwYXJhbXM6ICdcIlVURi04XCInIH0pICAvLyBhdC1ydWxlXG4gICAqIHJvb3QuYXBwZW5kKHsgc2VsZWN0b3I6ICdhJyB9KSAgICAgICAgICAgICAgICAgICAgICAgLy8gcnVsZVxuICAgKiBydWxlLmFwcGVuZCh7IHByb3A6ICdjb2xvcicsIHZhbHVlOiAnYmxhY2snIH0pICAgICAgIC8vIGRlY2xhcmF0aW9uXG4gICAqIHJ1bGUuYXBwZW5kKHsgdGV4dDogJ0NvbW1lbnQnIH0pICAgICAgICAgICAgICAgICAgICAgLy8gY29tbWVudFxuICAgKlxuICAgKiByb290LmFwcGVuZCgnYSB7fScpXG4gICAqIHJvb3QuZmlyc3QuYXBwZW5kKCdjb2xvcjogYmxhY2s7IHotaW5kZXg6IDEnKVxuICAgKi9cbiAgcHJlcGVuZCAoLi4uY2hpbGRyZW4pIHtcbiAgICBjaGlsZHJlbiA9IGNoaWxkcmVuLnJldmVyc2UoKVxuICAgIGZvciAobGV0IGNoaWxkIG9mIGNoaWxkcmVuKSB7XG4gICAgICBsZXQgbm9kZXMgPSB0aGlzLm5vcm1hbGl6ZShjaGlsZCwgdGhpcy5maXJzdCwgJ3ByZXBlbmQnKS5yZXZlcnNlKClcbiAgICAgIGZvciAobGV0IG5vZGUgb2Ygbm9kZXMpIHRoaXMubm9kZXMudW5zaGlmdChub2RlKVxuICAgICAgZm9yIChsZXQgaWQgaW4gdGhpcy5pbmRleGVzKSB7XG4gICAgICAgIHRoaXMuaW5kZXhlc1tpZF0gPSB0aGlzLmluZGV4ZXNbaWRdICsgbm9kZXMubGVuZ3RoXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBjbGVhblJhd3MgKGtlZXBCZXR3ZWVuKSB7XG4gICAgc3VwZXIuY2xlYW5SYXdzKGtlZXBCZXR3ZWVuKVxuICAgIGlmICh0aGlzLm5vZGVzKSB7XG4gICAgICBmb3IgKGxldCBub2RlIG9mIHRoaXMubm9kZXMpIG5vZGUuY2xlYW5SYXdzKGtlZXBCZXR3ZWVuKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbnNlcnQgbmV3IG5vZGUgYmVmb3JlIG9sZCBub2RlIHdpdGhpbiB0aGUgY29udGFpbmVyLlxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV8bnVtYmVyfSBleGlzdCAgICAgICAgICAgICBDaGlsZCBvciBjaGlsZOKAmXMgaW5kZXguXG4gICAqIEBwYXJhbSB7Tm9kZXxvYmplY3R8c3RyaW5nfE5vZGVbXX0gYWRkIE5ldyBub2RlLlxuICAgKlxuICAgKiBAcmV0dXJuIHtOb2RlfSBUaGlzIG5vZGUgZm9yIG1ldGhvZHMgY2hhaW4uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIHJ1bGUuaW5zZXJ0QmVmb3JlKGRlY2wsIGRlY2wuY2xvbmUoeyBwcm9wOiAnLXdlYmtpdC0nICsgZGVjbC5wcm9wIH0pKVxuICAgKi9cbiAgaW5zZXJ0QmVmb3JlIChleGlzdCwgYWRkKSB7XG4gICAgZXhpc3QgPSB0aGlzLmluZGV4KGV4aXN0KVxuXG4gICAgbGV0IHR5cGUgPSBleGlzdCA9PT0gMCA/ICdwcmVwZW5kJyA6IGZhbHNlXG4gICAgbGV0IG5vZGVzID0gdGhpcy5ub3JtYWxpemUoYWRkLCB0aGlzLm5vZGVzW2V4aXN0XSwgdHlwZSkucmV2ZXJzZSgpXG4gICAgZm9yIChsZXQgbm9kZSBvZiBub2RlcykgdGhpcy5ub2Rlcy5zcGxpY2UoZXhpc3QsIDAsIG5vZGUpXG5cbiAgICBsZXQgaW5kZXhcbiAgICBmb3IgKGxldCBpZCBpbiB0aGlzLmluZGV4ZXMpIHtcbiAgICAgIGluZGV4ID0gdGhpcy5pbmRleGVzW2lkXVxuICAgICAgaWYgKGV4aXN0IDw9IGluZGV4KSB7XG4gICAgICAgIHRoaXMuaW5kZXhlc1tpZF0gPSBpbmRleCArIG5vZGVzLmxlbmd0aFxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICogSW5zZXJ0IG5ldyBub2RlIGFmdGVyIG9sZCBub2RlIHdpdGhpbiB0aGUgY29udGFpbmVyLlxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV8bnVtYmVyfSBleGlzdCAgICAgICAgICAgICBDaGlsZCBvciBjaGlsZOKAmXMgaW5kZXguXG4gICAqIEBwYXJhbSB7Tm9kZXxvYmplY3R8c3RyaW5nfE5vZGVbXX0gYWRkIE5ldyBub2RlLlxuICAgKlxuICAgKiBAcmV0dXJuIHtOb2RlfSBUaGlzIG5vZGUgZm9yIG1ldGhvZHMgY2hhaW4uXG4gICAqL1xuICBpbnNlcnRBZnRlciAoZXhpc3QsIGFkZCkge1xuICAgIGV4aXN0ID0gdGhpcy5pbmRleChleGlzdClcblxuICAgIGxldCBub2RlcyA9IHRoaXMubm9ybWFsaXplKGFkZCwgdGhpcy5ub2Rlc1tleGlzdF0pLnJldmVyc2UoKVxuICAgIGZvciAobGV0IG5vZGUgb2Ygbm9kZXMpIHRoaXMubm9kZXMuc3BsaWNlKGV4aXN0ICsgMSwgMCwgbm9kZSlcblxuICAgIGxldCBpbmRleFxuICAgIGZvciAobGV0IGlkIGluIHRoaXMuaW5kZXhlcykge1xuICAgICAgaW5kZXggPSB0aGlzLmluZGV4ZXNbaWRdXG4gICAgICBpZiAoZXhpc3QgPCBpbmRleCkge1xuICAgICAgICB0aGlzLmluZGV4ZXNbaWRdID0gaW5kZXggKyBub2Rlcy5sZW5ndGhcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgbm9kZSBmcm9tIHRoZSBjb250YWluZXIgYW5kIGNsZWFucyB0aGUgcGFyZW50IHByb3BlcnRpZXNcbiAgICogZnJvbSB0aGUgbm9kZSBhbmQgaXRzIGNoaWxkcmVuLlxuICAgKlxuICAgKiBAcGFyYW0ge05vZGV8bnVtYmVyfSBjaGlsZCBDaGlsZCBvciBjaGlsZOKAmXMgaW5kZXguXG4gICAqXG4gICAqIEByZXR1cm4ge05vZGV9IFRoaXMgbm9kZSBmb3IgbWV0aG9kcyBjaGFpblxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBydWxlLm5vZGVzLmxlbmd0aCAgLy89PiA1XG4gICAqIHJ1bGUucmVtb3ZlQ2hpbGQoZGVjbClcbiAgICogcnVsZS5ub2Rlcy5sZW5ndGggIC8vPT4gNFxuICAgKiBkZWNsLnBhcmVudCAgICAgICAgLy89PiB1bmRlZmluZWRcbiAgICovXG4gIHJlbW92ZUNoaWxkIChjaGlsZCkge1xuICAgIGNoaWxkID0gdGhpcy5pbmRleChjaGlsZClcbiAgICB0aGlzLm5vZGVzW2NoaWxkXS5wYXJlbnQgPSB1bmRlZmluZWRcbiAgICB0aGlzLm5vZGVzLnNwbGljZShjaGlsZCwgMSlcblxuICAgIGxldCBpbmRleFxuICAgIGZvciAobGV0IGlkIGluIHRoaXMuaW5kZXhlcykge1xuICAgICAgaW5kZXggPSB0aGlzLmluZGV4ZXNbaWRdXG4gICAgICBpZiAoaW5kZXggPj0gY2hpbGQpIHtcbiAgICAgICAgdGhpcy5pbmRleGVzW2lkXSA9IGluZGV4IC0gMVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBhbGwgY2hpbGRyZW4gZnJvbSB0aGUgY29udGFpbmVyXG4gICAqIGFuZCBjbGVhbnMgdGhlaXIgcGFyZW50IHByb3BlcnRpZXMuXG4gICAqXG4gICAqIEByZXR1cm4ge05vZGV9IFRoaXMgbm9kZSBmb3IgbWV0aG9kcyBjaGFpbi5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogcnVsZS5yZW1vdmVBbGwoKVxuICAgKiBydWxlLm5vZGVzLmxlbmd0aCAvLz0+IDBcbiAgICovXG4gIHJlbW92ZUFsbCAoKSB7XG4gICAgZm9yIChsZXQgbm9kZSBvZiB0aGlzLm5vZGVzKSBub2RlLnBhcmVudCA9IHVuZGVmaW5lZFxuICAgIHRoaXMubm9kZXMgPSBbXVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvKipcbiAgICogUGFzc2VzIGFsbCBkZWNsYXJhdGlvbiB2YWx1ZXMgd2l0aGluIHRoZSBjb250YWluZXIgdGhhdCBtYXRjaCBwYXR0ZXJuXG4gICAqIHRocm91Z2ggY2FsbGJhY2ssIHJlcGxhY2luZyB0aG9zZSB2YWx1ZXMgd2l0aCB0aGUgcmV0dXJuZWQgcmVzdWx0XG4gICAqIG9mIGNhbGxiYWNrLlxuICAgKlxuICAgKiBUaGlzIG1ldGhvZCBpcyB1c2VmdWwgaWYgeW91IGFyZSB1c2luZyBhIGN1c3RvbSB1bml0IG9yIGZ1bmN0aW9uXG4gICAqIGFuZCBuZWVkIHRvIGl0ZXJhdGUgdGhyb3VnaCBhbGwgdmFsdWVzLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ3xSZWdFeHB9IHBhdHRlcm4gICAgICBSZXBsYWNlIHBhdHRlcm4uXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRzICAgICAgICAgICAgICAgIE9wdGlvbnMgdG8gc3BlZWQgdXAgdGhlIHNlYXJjaC5cbiAgICogQHBhcmFtIHtzdHJpbmd8c3RyaW5nW119IG9wdHMucHJvcHMgQW4gYXJyYXkgb2YgcHJvcGVydHkgbmFtZXMuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRzLmZhc3QgICAgICAgICAgIFN0cmluZyB0aGF04oCZcyB1c2VkIHRvIG5hcnJvdyBkb3duXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlcyBhbmQgc3BlZWQgdXAgdGhlIHJlZ2V4cCBzZWFyY2guXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb258c3RyaW5nfSBjYWxsYmFjayAgIFN0cmluZyB0byByZXBsYWNlIHBhdHRlcm4gb3IgY2FsbGJhY2tcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdCByZXR1cm5zIGEgbmV3IHZhbHVlLiBUaGUgY2FsbGJhY2tcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2lsbCByZWNlaXZlIHRoZSBzYW1lIGFyZ3VtZW50c1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcyB0aG9zZSBwYXNzZWQgdG8gYSBmdW5jdGlvbiBwYXJhbWV0ZXJcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2YgYFN0cmluZyNyZXBsYWNlYC5cbiAgICpcbiAgICogQHJldHVybiB7Tm9kZX0gVGhpcyBub2RlIGZvciBtZXRob2RzIGNoYWluLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiByb290LnJlcGxhY2VWYWx1ZXMoL1xcZCtyZW0vLCB7IGZhc3Q6ICdyZW0nIH0sIHN0cmluZyA9PiB7XG4gICAqICAgcmV0dXJuIDE1ICogcGFyc2VJbnQoc3RyaW5nKSArICdweCdcbiAgICogfSlcbiAgICovXG4gIHJlcGxhY2VWYWx1ZXMgKHBhdHRlcm4sIG9wdHMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2sgPSBvcHRzXG4gICAgICBvcHRzID0geyB9XG4gICAgfVxuXG4gICAgdGhpcy53YWxrRGVjbHMoZGVjbCA9PiB7XG4gICAgICBpZiAob3B0cy5wcm9wcyAmJiBvcHRzLnByb3BzLmluZGV4T2YoZGVjbC5wcm9wKSA9PT0gLTEpIHJldHVyblxuICAgICAgaWYgKG9wdHMuZmFzdCAmJiBkZWNsLnZhbHVlLmluZGV4T2Yob3B0cy5mYXN0KSA9PT0gLTEpIHJldHVyblxuXG4gICAgICBkZWNsLnZhbHVlID0gZGVjbC52YWx1ZS5yZXBsYWNlKHBhdHRlcm4sIGNhbGxiYWNrKVxuICAgIH0pXG5cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYHRydWVgIGlmIGNhbGxiYWNrIHJldHVybnMgYHRydWVgXG4gICAqIGZvciBhbGwgb2YgdGhlIGNvbnRhaW5lcuKAmXMgY2hpbGRyZW4uXG4gICAqXG4gICAqIEBwYXJhbSB7Y2hpbGRDb25kaXRpb259IGNvbmRpdGlvbiBJdGVyYXRvciByZXR1cm5zIHRydWUgb3IgZmFsc2UuXG4gICAqXG4gICAqIEByZXR1cm4ge2Jvb2xlYW59IElzIGV2ZXJ5IGNoaWxkIHBhc3MgY29uZGl0aW9uLlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBjb25zdCBub1ByZWZpeGVzID0gcnVsZS5ldmVyeShpID0+IGkucHJvcFswXSAhPT0gJy0nKVxuICAgKi9cbiAgZXZlcnkgKGNvbmRpdGlvbikge1xuICAgIHJldHVybiB0aGlzLm5vZGVzLmV2ZXJ5KGNvbmRpdGlvbilcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGB0cnVlYCBpZiBjYWxsYmFjayByZXR1cm5zIGB0cnVlYCBmb3IgKGF0IGxlYXN0KSBvbmVcbiAgICogb2YgdGhlIGNvbnRhaW5lcuKAmXMgY2hpbGRyZW4uXG4gICAqXG4gICAqIEBwYXJhbSB7Y2hpbGRDb25kaXRpb259IGNvbmRpdGlvbiBJdGVyYXRvciByZXR1cm5zIHRydWUgb3IgZmFsc2UuXG4gICAqXG4gICAqIEByZXR1cm4ge2Jvb2xlYW59IElzIHNvbWUgY2hpbGQgcGFzcyBjb25kaXRpb24uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnN0IGhhc1ByZWZpeCA9IHJ1bGUuc29tZShpID0+IGkucHJvcFswXSA9PT0gJy0nKVxuICAgKi9cbiAgc29tZSAoY29uZGl0aW9uKSB7XG4gICAgcmV0dXJuIHRoaXMubm9kZXMuc29tZShjb25kaXRpb24pXG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIGBjaGlsZGDigJlzIGluZGV4IHdpdGhpbiB0aGUge0BsaW5rIENvbnRhaW5lciNub2Rlc30gYXJyYXkuXG4gICAqXG4gICAqIEBwYXJhbSB7Tm9kZX0gY2hpbGQgQ2hpbGQgb2YgdGhlIGN1cnJlbnQgY29udGFpbmVyLlxuICAgKlxuICAgKiBAcmV0dXJuIHtudW1iZXJ9IENoaWxkIGluZGV4LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiBydWxlLmluZGV4KCBydWxlLm5vZGVzWzJdICkgLy89PiAyXG4gICAqL1xuICBpbmRleCAoY2hpbGQpIHtcbiAgICBpZiAodHlwZW9mIGNoaWxkID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIGNoaWxkXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLm5vZGVzLmluZGV4T2YoY2hpbGQpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBjb250YWluZXLigJlzIGZpcnN0IGNoaWxkLlxuICAgKlxuICAgKiBAdHlwZSB7Tm9kZX1cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogcnVsZS5maXJzdCA9PT0gcnVsZXMubm9kZXNbMF1cbiAgICovXG4gIGdldCBmaXJzdCAoKSB7XG4gICAgaWYgKCF0aGlzLm5vZGVzKSByZXR1cm4gdW5kZWZpbmVkXG4gICAgcmV0dXJuIHRoaXMubm9kZXNbMF1cbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgY29udGFpbmVy4oCZcyBsYXN0IGNoaWxkLlxuICAgKlxuICAgKiBAdHlwZSB7Tm9kZX1cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogcnVsZS5sYXN0ID09PSBydWxlLm5vZGVzW3J1bGUubm9kZXMubGVuZ3RoIC0gMV1cbiAgICovXG4gIGdldCBsYXN0ICgpIHtcbiAgICBpZiAoIXRoaXMubm9kZXMpIHJldHVybiB1bmRlZmluZWRcbiAgICByZXR1cm4gdGhpcy5ub2Rlc1t0aGlzLm5vZGVzLmxlbmd0aCAtIDFdXG4gIH1cblxuICBub3JtYWxpemUgKG5vZGVzLCBzYW1wbGUpIHtcbiAgICBpZiAodHlwZW9mIG5vZGVzID09PSAnc3RyaW5nJykge1xuICAgICAgbGV0IHBhcnNlID0gcmVxdWlyZSgnLi9wYXJzZScpXG4gICAgICBub2RlcyA9IGNsZWFuU291cmNlKHBhcnNlKG5vZGVzKS5ub2RlcylcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkobm9kZXMpKSB7XG4gICAgICBub2RlcyA9IG5vZGVzLnNsaWNlKDApXG4gICAgICBmb3IgKGxldCBpIG9mIG5vZGVzKSB7XG4gICAgICAgIGlmIChpLnBhcmVudCkgaS5wYXJlbnQucmVtb3ZlQ2hpbGQoaSwgJ2lnbm9yZScpXG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChub2Rlcy50eXBlID09PSAncm9vdCcpIHtcbiAgICAgIG5vZGVzID0gbm9kZXMubm9kZXMuc2xpY2UoMClcbiAgICAgIGZvciAobGV0IGkgb2Ygbm9kZXMpIHtcbiAgICAgICAgaWYgKGkucGFyZW50KSBpLnBhcmVudC5yZW1vdmVDaGlsZChpLCAnaWdub3JlJylcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG5vZGVzLnR5cGUpIHtcbiAgICAgIG5vZGVzID0gW25vZGVzXVxuICAgIH0gZWxzZSBpZiAobm9kZXMucHJvcCkge1xuICAgICAgaWYgKHR5cGVvZiBub2Rlcy52YWx1ZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWYWx1ZSBmaWVsZCBpcyBtaXNzZWQgaW4gbm9kZSBjcmVhdGlvbicpXG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBub2Rlcy52YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgbm9kZXMudmFsdWUgPSBTdHJpbmcobm9kZXMudmFsdWUpXG4gICAgICB9XG4gICAgICBub2RlcyA9IFtuZXcgRGVjbGFyYXRpb24obm9kZXMpXVxuICAgIH0gZWxzZSBpZiAobm9kZXMuc2VsZWN0b3IpIHtcbiAgICAgIGxldCBSdWxlID0gcmVxdWlyZSgnLi9ydWxlJylcbiAgICAgIG5vZGVzID0gW25ldyBSdWxlKG5vZGVzKV1cbiAgICB9IGVsc2UgaWYgKG5vZGVzLm5hbWUpIHtcbiAgICAgIGxldCBBdFJ1bGUgPSByZXF1aXJlKCcuL2F0LXJ1bGUnKVxuICAgICAgbm9kZXMgPSBbbmV3IEF0UnVsZShub2RlcyldXG4gICAgfSBlbHNlIGlmIChub2Rlcy50ZXh0KSB7XG4gICAgICBub2RlcyA9IFtuZXcgQ29tbWVudChub2RlcyldXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBub2RlIHR5cGUgaW4gbm9kZSBjcmVhdGlvbicpXG4gICAgfVxuXG4gICAgbGV0IHByb2Nlc3NlZCA9IG5vZGVzLm1hcChpID0+IHtcbiAgICAgIGlmIChpLnBhcmVudCkgaS5wYXJlbnQucmVtb3ZlQ2hpbGQoaSlcbiAgICAgIGlmICh0eXBlb2YgaS5yYXdzLmJlZm9yZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgaWYgKHNhbXBsZSAmJiB0eXBlb2Ygc2FtcGxlLnJhd3MuYmVmb3JlICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIGkucmF3cy5iZWZvcmUgPSBzYW1wbGUucmF3cy5iZWZvcmUucmVwbGFjZSgvW15cXHNdL2csICcnKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpLnBhcmVudCA9IHRoaXNcbiAgICAgIHJldHVybiBpXG4gICAgfSlcblxuICAgIHJldHVybiBwcm9jZXNzZWRcbiAgfVxuXG4gIC8qKlxuICAgKiBAbWVtYmVyb2YgQ29udGFpbmVyI1xuICAgKiBAbWVtYmVyIHtOb2RlW119IG5vZGVzIEFuIGFycmF5IGNvbnRhaW5pbmcgdGhlIGNvbnRhaW5lcuKAmXMgY2hpbGRyZW4uXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqIGNvbnN0IHJvb3QgPSBwb3N0Y3NzLnBhcnNlKCdhIHsgY29sb3I6IGJsYWNrIH0nKVxuICAgKiByb290Lm5vZGVzLmxlbmd0aCAgICAgICAgICAgLy89PiAxXG4gICAqIHJvb3Qubm9kZXNbMF0uc2VsZWN0b3IgICAgICAvLz0+ICdhJ1xuICAgKiByb290Lm5vZGVzWzBdLm5vZGVzWzBdLnByb3AgLy89PiAnY29sb3InXG4gICAqL1xufVxuXG5leHBvcnQgZGVmYXVsdCBDb250YWluZXJcblxuLyoqXG4gKiBAY2FsbGJhY2sgY2hpbGRDb25kaXRpb25cbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSAgICBDb250YWluZXIgY2hpbGQuXG4gKiBAcGFyYW0ge251bWJlcn0gaW5kZXggQ2hpbGQgaW5kZXguXG4gKiBAcGFyYW0ge05vZGVbXX0gbm9kZXMgQWxsIGNvbnRhaW5lciBjaGlsZHJlbi5cbiAqIEByZXR1cm4ge2Jvb2xlYW59XG4gKi9cblxuLyoqXG4gKiBAY2FsbGJhY2sgY2hpbGRJdGVyYXRvclxuICogQHBhcmFtIHtOb2RlfSBub2RlICAgIENvbnRhaW5lciBjaGlsZC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCBDaGlsZCBpbmRleC5cbiAqIEByZXR1cm4ge2ZhbHNlfHVuZGVmaW5lZH0gUmV0dXJuaW5nIGBmYWxzZWAgd2lsbCBicmVhayBpdGVyYXRpb24uXG4gKi9cbiJdfQ==
