'use strict';

exports.__esModule = true;

var _declaration = require('./declaration');

var _declaration2 = _interopRequireDefault(_declaration);

var _tokenize = require('./tokenize');

var _tokenize2 = _interopRequireDefault(_tokenize);

var _comment = require('./comment');

var _comment2 = _interopRequireDefault(_comment);

var _atRule = require('./at-rule');

var _atRule2 = _interopRequireDefault(_atRule);

var _root = require('./root');

var _root2 = _interopRequireDefault(_root);

var _rule = require('./rule');

var _rule2 = _interopRequireDefault(_rule);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Parser = function () {
  function Parser(input) {
    _classCallCheck(this, Parser);

    this.input = input;

    this.root = new _root2.default();
    this.current = this.root;
    this.spaces = '';
    this.semicolon = false;

    this.createTokenizer();
    this.root.source = { input: input, start: { line: 1, column: 1 } };
  }

  Parser.prototype.createTokenizer = function createTokenizer() {
    this.tokenizer = (0, _tokenize2.default)(this.input);
  };

  Parser.prototype.parse = function parse() {
    var token = void 0;
    while (!this.tokenizer.endOfFile()) {
      token = this.tokenizer.nextToken();

      switch (token[0]) {
        case 'space':
          this.spaces += token[1];
          break;

        case ';':
          this.freeSemicolon(token);
          break;

        case '}':
          this.end(token);
          break;

        case 'comment':
          this.comment(token);
          break;

        case 'at-word':
          this.atrule(token);
          break;

        case '{':
          this.emptyRule(token);
          break;

        default:
          this.other(token);
          break;
      }
    }
    this.endFile();
  };

  Parser.prototype.comment = function comment(token) {
    var node = new _comment2.default();
    this.init(node, token[2], token[3]);
    node.source.end = { line: token[4], column: token[5] };

    var text = token[1].slice(2, -2);
    if (/^\s*$/.test(text)) {
      node.text = '';
      node.raws.left = text;
      node.raws.right = '';
    } else {
      var match = text.match(/^(\s*)([^]*[^\s])(\s*)$/);
      node.text = match[2];
      node.raws.left = match[1];
      node.raws.right = match[3];
    }
  };

  Parser.prototype.emptyRule = function emptyRule(token) {
    var node = new _rule2.default();
    this.init(node, token[2], token[3]);
    node.selector = '';
    node.raws.between = '';
    this.current = node;
  };

  Parser.prototype.other = function other(start) {
    var end = false;
    var type = null;
    var colon = false;
    var bracket = null;
    var brackets = [];

    var tokens = [];
    var token = start;
    while (token) {
      type = token[0];
      tokens.push(token);

      if (type === '(' || type === '[') {
        if (!bracket) bracket = token;
        brackets.push(type === '(' ? ')' : ']');
      } else if (brackets.length === 0) {
        if (type === ';') {
          if (colon) {
            this.decl(tokens);
            return;
          } else {
            break;
          }
        } else if (type === '{') {
          this.rule(tokens);
          return;
        } else if (type === '}') {
          this.tokenizer.back(tokens.pop());
          end = true;
          break;
        } else if (type === ':') {
          colon = true;
        }
      } else if (type === brackets[brackets.length - 1]) {
        brackets.pop();
        if (brackets.length === 0) bracket = null;
      }

      token = this.tokenizer.nextToken();
    }

    if (this.tokenizer.endOfFile()) end = true;
    if (brackets.length > 0) this.unclosedBracket(bracket);

    if (end && colon) {
      while (tokens.length) {
        token = tokens[tokens.length - 1][0];
        if (token !== 'space' && token !== 'comment') break;
        this.tokenizer.back(tokens.pop());
      }
      this.decl(tokens);
    } else {
      this.unknownWord(tokens);
    }
  };

  Parser.prototype.rule = function rule(tokens) {
    tokens.pop();

    var node = new _rule2.default();
    this.init(node, tokens[0][2], tokens[0][3]);

    node.raws.between = this.spacesAndCommentsFromEnd(tokens);
    this.raw(node, 'selector', tokens);
    this.current = node;
  };

  Parser.prototype.decl = function decl(tokens) {
    var node = new _declaration2.default();
    this.init(node);

    var last = tokens[tokens.length - 1];
    if (last[0] === ';') {
      this.semicolon = true;
      tokens.pop();
    }
    if (last[4]) {
      node.source.end = { line: last[4], column: last[5] };
    } else {
      node.source.end = { line: last[2], column: last[3] };
    }

    while (tokens[0][0] !== 'word') {
      if (tokens.length === 1) this.unknownWord(tokens);
      node.raws.before += tokens.shift()[1];
    }
    node.source.start = { line: tokens[0][2], column: tokens[0][3] };

    node.prop = '';
    while (tokens.length) {
      var type = tokens[0][0];
      if (type === ':' || type === 'space' || type === 'comment') {
        break;
      }
      node.prop += tokens.shift()[1];
    }

    node.raws.between = '';

    var token = void 0;
    while (tokens.length) {
      token = tokens.shift();

      if (token[0] === ':') {
        node.raws.between += token[1];
        break;
      } else {
        node.raws.between += token[1];
      }
    }

    if (node.prop[0] === '_' || node.prop[0] === '*') {
      node.raws.before += node.prop[0];
      node.prop = node.prop.slice(1);
    }
    node.raws.between += this.spacesAndCommentsFromStart(tokens);
    this.precheckMissedSemicolon(tokens);

    for (var i = tokens.length - 1; i > 0; i--) {
      token = tokens[i];
      if (token[1].toLowerCase() === '!important') {
        node.important = true;
        var string = this.stringFrom(tokens, i);
        string = this.spacesFromEnd(tokens) + string;
        if (string !== ' !important') node.raws.important = string;
        break;
      } else if (token[1].toLowerCase() === 'important') {
        var cache = tokens.slice(0);
        var str = '';
        for (var j = i; j > 0; j--) {
          var _type = cache[j][0];
          if (str.trim().indexOf('!') === 0 && _type !== 'space') {
            break;
          }
          str = cache.pop()[1] + str;
        }
        if (str.trim().indexOf('!') === 0) {
          node.important = true;
          node.raws.important = str;
          tokens = cache;
        }
      }

      if (token[0] !== 'space' && token[0] !== 'comment') {
        break;
      }
    }

    this.raw(node, 'value', tokens);

    if (node.value.indexOf(':') !== -1) this.checkMissedSemicolon(tokens);
  };

  Parser.prototype.atrule = function atrule(token) {
    var node = new _atRule2.default();
    node.name = token[1].slice(1);
    if (node.name === '') {
      this.unnamedAtrule(node, token);
    }
    this.init(node, token[2], token[3]);

    var prev = void 0;
    var shift = void 0;
    var last = false;
    var open = false;
    var params = [];

    while (!this.tokenizer.endOfFile()) {
      token = this.tokenizer.nextToken();

      if (token[0] === ';') {
        node.source.end = { line: token[2], column: token[3] };
        this.semicolon = true;
        break;
      } else if (token[0] === '{') {
        open = true;
        break;
      } else if (token[0] === '}') {
        if (params.length > 0) {
          shift = params.length - 1;
          prev = params[shift];
          while (prev && prev[0] === 'space') {
            prev = params[--shift];
          }
          if (prev) {
            node.source.end = { line: prev[4], column: prev[5] };
          }
        }
        this.end(token);
        break;
      } else {
        params.push(token);
      }

      if (this.tokenizer.endOfFile()) {
        last = true;
        break;
      }
    }

    node.raws.between = this.spacesAndCommentsFromEnd(params);
    if (params.length) {
      node.raws.afterName = this.spacesAndCommentsFromStart(params);
      this.raw(node, 'params', params);
      if (last) {
        token = params[params.length - 1];
        node.source.end = { line: token[4], column: token[5] };
        this.spaces = node.raws.between;
        node.raws.between = '';
      }
    } else {
      node.raws.afterName = '';
      node.params = '';
    }

    if (open) {
      node.nodes = [];
      this.current = node;
    }
  };

  Parser.prototype.end = function end(token) {
    if (this.current.nodes && this.current.nodes.length) {
      this.current.raws.semicolon = this.semicolon;
    }
    this.semicolon = false;

    this.current.raws.after = (this.current.raws.after || '') + this.spaces;
    this.spaces = '';

    if (this.current.parent) {
      this.current.source.end = { line: token[2], column: token[3] };
      this.current = this.current.parent;
    } else {
      this.unexpectedClose(token);
    }
  };

  Parser.prototype.endFile = function endFile() {
    if (this.current.parent) this.unclosedBlock();
    if (this.current.nodes && this.current.nodes.length) {
      this.current.raws.semicolon = this.semicolon;
    }
    this.current.raws.after = (this.current.raws.after || '') + this.spaces;
  };

  Parser.prototype.freeSemicolon = function freeSemicolon(token) {
    this.spaces += token[1];
    if (this.current.nodes) {
      var prev = this.current.nodes[this.current.nodes.length - 1];
      if (prev && prev.type === 'rule' && !prev.raws.ownSemicolon) {
        prev.raws.ownSemicolon = this.spaces;
        this.spaces = '';
      }
    }
  };

  // Helpers

  Parser.prototype.init = function init(node, line, column) {
    this.current.push(node);

    node.source = { start: { line: line, column: column }, input: this.input };
    node.raws.before = this.spaces;
    this.spaces = '';
    if (node.type !== 'comment') this.semicolon = false;
  };

  Parser.prototype.raw = function raw(node, prop, tokens) {
    var token = void 0,
        type = void 0;
    var length = tokens.length;
    var value = '';
    var clean = true;
    var next = void 0,
        prev = void 0;
    var pattern = /^([.|#])?([\w])+/i;

    for (var i = 0; i < length; i += 1) {
      token = tokens[i];
      type = token[0];

      if (type === 'comment' && node.type === 'rule') {
        prev = tokens[i - 1];
        next = tokens[i + 1];

        if (prev[0] !== 'space' && next[0] !== 'space' && pattern.test(prev[1]) && pattern.test(next[1])) {
          value += token[1];
        } else {
          clean = false;
        }

        continue;
      }

      if (type === 'comment' || type === 'space' && i === length - 1) {
        clean = false;
      } else {
        value += token[1];
      }
    }
    if (!clean) {
      var raw = tokens.reduce(function (all, i) {
        return all + i[1];
      }, '');
      node.raws[prop] = { value: value, raw: raw };
    }
    node[prop] = value;
  };

  Parser.prototype.spacesAndCommentsFromEnd = function spacesAndCommentsFromEnd(tokens) {
    var lastTokenType = void 0;
    var spaces = '';
    while (tokens.length) {
      lastTokenType = tokens[tokens.length - 1][0];
      if (lastTokenType !== 'space' && lastTokenType !== 'comment') break;
      spaces = tokens.pop()[1] + spaces;
    }
    return spaces;
  };

  Parser.prototype.spacesAndCommentsFromStart = function spacesAndCommentsFromStart(tokens) {
    var next = void 0;
    var spaces = '';
    while (tokens.length) {
      next = tokens[0][0];
      if (next !== 'space' && next !== 'comment') break;
      spaces += tokens.shift()[1];
    }
    return spaces;
  };

  Parser.prototype.spacesFromEnd = function spacesFromEnd(tokens) {
    var lastTokenType = void 0;
    var spaces = '';
    while (tokens.length) {
      lastTokenType = tokens[tokens.length - 1][0];
      if (lastTokenType !== 'space') break;
      spaces = tokens.pop()[1] + spaces;
    }
    return spaces;
  };

  Parser.prototype.stringFrom = function stringFrom(tokens, from) {
    var result = '';
    for (var i = from; i < tokens.length; i++) {
      result += tokens[i][1];
    }
    tokens.splice(from, tokens.length - from);
    return result;
  };

  Parser.prototype.colon = function colon(tokens) {
    var brackets = 0;
    var token = void 0,
        type = void 0,
        prev = void 0;
    for (var i = 0; i < tokens.length; i++) {
      token = tokens[i];
      type = token[0];

      if (type === '(') {
        brackets += 1;
      } else if (type === ')') {
        brackets -= 1;
      } else if (brackets === 0 && type === ':') {
        if (!prev) {
          this.doubleColon(token);
        } else if (prev[0] === 'word' && prev[1] === 'progid') {
          continue;
        } else {
          return i;
        }
      }

      prev = token;
    }
    return false;
  };

  // Errors

  Parser.prototype.unclosedBracket = function unclosedBracket(bracket) {
    throw this.input.error('Unclosed bracket', bracket[2], bracket[3]);
  };

  Parser.prototype.unknownWord = function unknownWord(tokens) {
    throw this.input.error('Unknown word', tokens[0][2], tokens[0][3]);
  };

  Parser.prototype.unexpectedClose = function unexpectedClose(token) {
    throw this.input.error('Unexpected }', token[2], token[3]);
  };

  Parser.prototype.unclosedBlock = function unclosedBlock() {
    var pos = this.current.source.start;
    throw this.input.error('Unclosed block', pos.line, pos.column);
  };

  Parser.prototype.doubleColon = function doubleColon(token) {
    throw this.input.error('Double colon', token[2], token[3]);
  };

  Parser.prototype.unnamedAtrule = function unnamedAtrule(node, token) {
    throw this.input.error('At-rule without name', token[2], token[3]);
  };

  Parser.prototype.precheckMissedSemicolon = function precheckMissedSemicolon() /* tokens */{
    // Hook for Safe Parser
  };

  Parser.prototype.checkMissedSemicolon = function checkMissedSemicolon(tokens) {
    var colon = this.colon(tokens);
    if (colon === false) return;

    var founded = 0;
    var token = void 0;
    for (var j = colon - 1; j >= 0; j--) {
      token = tokens[j];
      if (token[0] !== 'space') {
        founded += 1;
        if (founded === 2) break;
      }
    }
    throw this.input.error('Missed semicolon', token[2], token[3]);
  };

  return Parser;
}();

exports.default = Parser;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBhcnNlci5lczYiXSwibmFtZXMiOlsiUGFyc2VyIiwiaW5wdXQiLCJyb290IiwiUm9vdCIsImN1cnJlbnQiLCJzcGFjZXMiLCJzZW1pY29sb24iLCJjcmVhdGVUb2tlbml6ZXIiLCJzb3VyY2UiLCJzdGFydCIsImxpbmUiLCJjb2x1bW4iLCJ0b2tlbml6ZXIiLCJwYXJzZSIsInRva2VuIiwiZW5kT2ZGaWxlIiwibmV4dFRva2VuIiwiZnJlZVNlbWljb2xvbiIsImVuZCIsImNvbW1lbnQiLCJhdHJ1bGUiLCJlbXB0eVJ1bGUiLCJvdGhlciIsImVuZEZpbGUiLCJub2RlIiwiQ29tbWVudCIsImluaXQiLCJ0ZXh0Iiwic2xpY2UiLCJ0ZXN0IiwicmF3cyIsImxlZnQiLCJyaWdodCIsIm1hdGNoIiwiUnVsZSIsInNlbGVjdG9yIiwiYmV0d2VlbiIsInR5cGUiLCJjb2xvbiIsImJyYWNrZXQiLCJicmFja2V0cyIsInRva2VucyIsInB1c2giLCJsZW5ndGgiLCJkZWNsIiwicnVsZSIsImJhY2siLCJwb3AiLCJ1bmNsb3NlZEJyYWNrZXQiLCJ1bmtub3duV29yZCIsInNwYWNlc0FuZENvbW1lbnRzRnJvbUVuZCIsInJhdyIsIkRlY2xhcmF0aW9uIiwibGFzdCIsImJlZm9yZSIsInNoaWZ0IiwicHJvcCIsInNwYWNlc0FuZENvbW1lbnRzRnJvbVN0YXJ0IiwicHJlY2hlY2tNaXNzZWRTZW1pY29sb24iLCJpIiwidG9Mb3dlckNhc2UiLCJpbXBvcnRhbnQiLCJzdHJpbmciLCJzdHJpbmdGcm9tIiwic3BhY2VzRnJvbUVuZCIsImNhY2hlIiwic3RyIiwiaiIsInRyaW0iLCJpbmRleE9mIiwidmFsdWUiLCJjaGVja01pc3NlZFNlbWljb2xvbiIsIkF0UnVsZSIsIm5hbWUiLCJ1bm5hbWVkQXRydWxlIiwicHJldiIsIm9wZW4iLCJwYXJhbXMiLCJhZnRlck5hbWUiLCJub2RlcyIsImFmdGVyIiwicGFyZW50IiwidW5leHBlY3RlZENsb3NlIiwidW5jbG9zZWRCbG9jayIsIm93blNlbWljb2xvbiIsImNsZWFuIiwibmV4dCIsInBhdHRlcm4iLCJyZWR1Y2UiLCJhbGwiLCJsYXN0VG9rZW5UeXBlIiwiZnJvbSIsInJlc3VsdCIsInNwbGljZSIsImRvdWJsZUNvbG9uIiwiZXJyb3IiLCJwb3MiLCJmb3VuZGVkIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7OztJQUVxQkEsTTtBQUNuQixrQkFBYUMsS0FBYixFQUFvQjtBQUFBOztBQUNsQixTQUFLQSxLQUFMLEdBQWFBLEtBQWI7O0FBRUEsU0FBS0MsSUFBTCxHQUFZLElBQUlDLGNBQUosRUFBWjtBQUNBLFNBQUtDLE9BQUwsR0FBZSxLQUFLRixJQUFwQjtBQUNBLFNBQUtHLE1BQUwsR0FBYyxFQUFkO0FBQ0EsU0FBS0MsU0FBTCxHQUFpQixLQUFqQjs7QUFFQSxTQUFLQyxlQUFMO0FBQ0EsU0FBS0wsSUFBTCxDQUFVTSxNQUFWLEdBQW1CLEVBQUVQLFlBQUYsRUFBU1EsT0FBTyxFQUFFQyxNQUFNLENBQVIsRUFBV0MsUUFBUSxDQUFuQixFQUFoQixFQUFuQjtBQUNEOzttQkFFREosZSw4QkFBbUI7QUFDakIsU0FBS0ssU0FBTCxHQUFpQix3QkFBVSxLQUFLWCxLQUFmLENBQWpCO0FBQ0QsRzs7bUJBRURZLEssb0JBQVM7QUFDUCxRQUFJQyxjQUFKO0FBQ0EsV0FBTyxDQUFDLEtBQUtGLFNBQUwsQ0FBZUcsU0FBZixFQUFSLEVBQW9DO0FBQ2xDRCxjQUFRLEtBQUtGLFNBQUwsQ0FBZUksU0FBZixFQUFSOztBQUVBLGNBQVFGLE1BQU0sQ0FBTixDQUFSO0FBQ0UsYUFBSyxPQUFMO0FBQ0UsZUFBS1QsTUFBTCxJQUFlUyxNQUFNLENBQU4sQ0FBZjtBQUNBOztBQUVGLGFBQUssR0FBTDtBQUNFLGVBQUtHLGFBQUwsQ0FBbUJILEtBQW5CO0FBQ0E7O0FBRUYsYUFBSyxHQUFMO0FBQ0UsZUFBS0ksR0FBTCxDQUFTSixLQUFUO0FBQ0E7O0FBRUYsYUFBSyxT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QW1DQyxJQUFJdEYsSUFBdkMsRUFBNkNzRixJQUFJckYsTUFBakQsQ0FBTjtBQUNELEc7O21CQUVEbUYsVyx3QkFBYWhGLEssRUFBTztBQUNsQixVQUFNLEtBQUtiLEtBQUwsQ0FBVzhGLEtBQVgsQ0FBaUIsY0FBakIsRUFBaUNqRixNQUFNLENBQU4sQ0FBakMsRUFBMkNBLE1BQU0sQ0FBTixDQUEzQyxDQUFOO0FBQ0QsRzs7bUJBRUQ0RCxhLDBCQUFlbEQsSSxFQUFNVixLLEVBQU87QUFDMUIsVUFBTSxLQUFLYixLQUFMLENBQVc4RixLQUFYLENBQWlCLHNCQUFqQixFQUF5Q2pGLE1BQU0sQ0FBTixDQUF6QyxFQUFtREEsTUFBTSxDQUFOLENBQW5ELENBQU47QUFDRCxHOzttQkFFRDRDLHVCLHNDQUF5QixZQUFjO0FBQ3JDO0FBQ0QsRzs7bUJBRURhLG9CLGlDQUFzQjlCLE0sRUFBUTtBQUM1QixRQUFJSCxRQUFRLEtBQUtBLEtBQUwsQ0FBV0csTUFBWCxDQUFaO0FBQ0EsUUFBSUgsVUFBVSxLQUFkLEVBQXFCOztBQUVyQixRQUFJMkQsVUFBVSxDQUFkO0FBQ0EsUUFBSW5GLGNBQUo7QUFDQSxTQUFLLElBQUlxRCxJQUFJN0IsUUFBUSxDQUFyQixFQUF3QjZCLEtBQUssQ0FBN0IsRUFBZ0NBLEdBQWhDLEVBQXFDO0FBQ25DckQsY0FBUTJCLE9BQU8wQixDQUFQLENBQVI7QUFDQSxVQUFJckQsTUFBTSxDQUFOLE1BQWEsT0FBakIsRUFBMEI7QUFDeEJtRixtQkFBVyxDQUFYO0FBQ0EsWUFBSUEsWUFBWSxDQUFoQixFQUFtQjtBQUNwQjtBQUNGO0FBQ0QsVUFBTSxLQUFLaEcsS0FBTCxDQUFXOEYsS0FBWCxDQUFpQixrQkFBakIsRUFBcUNqRixNQUFNLENBQU4sQ0FBckMsRUFBK0NBLE1BQU0sQ0FBTixDQUEvQyxDQUFOO0FBQ0QsRzs7Ozs7a0JBMWZrQmQsTSIsImZpbGUiOiJwYXJzZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgRGVjbGFyYXRpb24gZnJvbSAnLi9kZWNsYXJhdGlvbidcbmltcG9ydCB0b2tlbml6ZXIgZnJvbSAnLi90b2tlbml6ZSdcbmltcG9ydCBDb21tZW50IGZyb20gJy4vY29tbWVudCdcbmltcG9ydCBBdFJ1bGUgZnJvbSAnLi9hdC1ydWxlJ1xuaW1wb3J0IFJvb3QgZnJvbSAnLi9yb290J1xuaW1wb3J0IFJ1bGUgZnJvbSAnLi9ydWxlJ1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBQYXJzZXIge1xuICBjb25zdHJ1Y3RvciAoaW5wdXQpIHtcbiAgICB0aGlzLmlucHV0ID0gaW5wdXRcblxuICAgIHRoaXMucm9vdCA9IG5ldyBSb290KClcbiAgICB0aGlzLmN1cnJlbnQgPSB0aGlzLnJvb3RcbiAgICB0aGlzLnNwYWNlcyA9ICcnXG4gICAgdGhpcy5zZW1pY29sb24gPSBmYWxzZVxuXG4gICAgdGhpcy5jcmVhdGVUb2tlbml6ZXIoKVxuICAgIHRoaXMucm9vdC5zb3VyY2UgPSB7IGlucHV0LCBzdGFydDogeyBsaW5lOiAxLCBjb2x1bW46IDEgfSB9XG4gIH1cblxuICBjcmVhdGVUb2tlbml6ZXIgKCkge1xuICAgIHRoaXMudG9rZW5pemVyID0gdG9rZW5pemVyKHRoaXMuaW5wdXQpXG4gIH1cblxuICBwYXJzZSAoKSB7XG4gICAgbGV0IHRva2VuXG4gICAgd2hpbGUgKCF0aGlzLnRva2VuaXplci5lbmRPZkZpbGUoKSkge1xuICAgICAgdG9rZW4gPSB0aGlzLnRva2VuaXplci5uZXh0VG9rZW4oKVxuXG4gICAgICBzd2l0Y2ggKHRva2VuWzBdKSB7XG4gICAgICAgIGNhc2UgJ3NwYWNlJzpcbiAgICAgICAgICB0aGlzLnNwYWNlcyArPSB0b2tlblsxXVxuICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgY2FzZSAnOyc6XG4gICAgICAgICAgdGhpcy5mcmVlU2VtaWNvbG9uKHRva2VuKVxuICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgY2FzZSAnfSc6XG4gICAgICAgICAgdGhpcy5lbmQodG9rZW4pXG4gICAgICAgICAgYnJlYWtcblxuICAgICAgICBjYXNlICdjb21tZW50JzpcbiAgICAgICAgICB0aGlzLmNvbW1lbnQodG9rZW4pXG4gICAgICAgICAgYnJlYWtcblxuICAgICAgICBjYXNlICdhdC13b3JkJzpcbiAgICAgICAgICB0aGlzLmF0cnVsZSh0b2tlbilcbiAgICAgICAgICBicmVha1xuXG4gICAgICAgIGNhc2UgJ3snOlxuICAgICAgICAgIHRoaXMuZW1wdHlSdWxlKHRva2VuKVxuICAgICAgICAgIGJyZWFrXG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aGlzLm90aGVyKHRva2VuKVxuICAgICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuZW5kRmlsZSgpXG4gIH1cblxuICBjb21tZW50ICh0b2tlbikge1xuICAgIGxldCBub2RlID0gbmV3IENvbW1lbnQoKVxuICAgIHRoaXMuaW5pdChub2RlLCB0b2tlblsyXSwgdG9rZW5bM10pXG4gICAgbm9kZS5zb3VyY2UuZW5kID0geyBsaW5lOiB0b2tlbls0XSwgY29sdW1uOiB0b2tlbls1XSB9XG5cbiAgICBsZXQgdGV4dCA9IHRva2VuWzFdLnNsaWNlKDIsIC0yKVxuICAgIGlmICgvXlxccyokLy50ZXN0KHRleHQpKSB7XG4gICAgICBub2RlLnRleHQgPSAnJ1xuICAgICAgbm9kZS5yYXdzLmxlZnQgPSB0ZXh0XG4gICAgICBub2RlLnJhd3MucmlnaHQgPSAnJ1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgbWF0Y2ggPSB0ZXh0Lm1hdGNoKC9eKFxccyopKFteXSpbXlxcc10pKFxccyopJC8pXG4gICAgICBub2RlLnRleHQgPSBtYXRjaFsyXVxuICAgICAgbm9kZS5yYXdzLmxlZnQgPSBtYXRjaFsxXVxuICAgICAgbm9kZS5yYXdzLnJpZ2h0ID0gbWF0Y2hbM11cbiAgICB9XG4gIH1cblxuICBlbXB0eVJ1bGUgKHRva2VuKSB7XG4gICAgbGV0IG5vZGUgPSBuZXcgUnVsZSgpXG4gICAgdGhpcy5pbml0KG5vZGUsIHRva2VuWzJdLCB0b2tlblszXSlcbiAgICBub2RlLnNlbGVjdG9yID0gJydcbiAgICBub2RlLnJhd3MuYmV0d2VlbiA9ICcnXG4gICAgdGhpcy5jdXJyZW50ID0gbm9kZVxuICB9XG5cbiAgb3RoZXIgKHN0YXJ0KSB7XG4gICAgbGV0IGVuZCA9IGZhbHNlXG4gICAgbGV0IHR5cGUgPSBudWxsXG4gICAgbGV0IGNvbG9uID0gZmFsc2VcbiAgICBsZXQgYnJhY2tldCA9IG51bGxcbiAgICBsZXQgYnJhY2tldHMgPSBbXVxuXG4gICAgbGV0IHRva2VucyA9IFtdXG4gICAgbGV0IHRva2VuID0gc3RhcnRcbiAgICB3aGlsZSAodG9rZW4pIHtcbiAgICAgIHR5cGUgPSB0b2tlblswXVxuICAgICAgdG9rZW5zLnB1c2godG9rZW4pXG5cbiAgICAgIGlmICh0eXBlID09PSAnKCcgfHwgdHlwZSA9PT0gJ1snKSB7XG4gICAgICAgIGlmICghYnJhY2tldCkgYnJhY2tldCA9IHRva2VuXG4gICAgICAgIGJyYWNrZXRzLnB1c2godHlwZSA9PT0gJygnID8gJyknIDogJ10nKVxuICAgICAgfSBlbHNlIGlmIChicmFja2V0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgaWYgKHR5cGUgPT09ICc7Jykge1xuICAgICAgICAgIGlmIChjb2xvbikge1xuICAgICAgICAgICAgdGhpcy5kZWNsKHRva2VucylcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAneycpIHtcbiAgICAgICAgICB0aGlzLnJ1bGUodG9rZW5zKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICd9Jykge1xuICAgICAgICAgIHRoaXMudG9rZW5pemVyLmJhY2sodG9rZW5zLnBvcCgpKVxuICAgICAgICAgIGVuZCA9IHRydWVcbiAgICAgICAgICBicmVha1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICc6Jykge1xuICAgICAgICAgIGNvbG9uID0gdHJ1ZVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09IGJyYWNrZXRzW2JyYWNrZXRzLmxlbmd0aCAtIDFdKSB7XG4gICAgICAgIGJyYWNrZXRzLnBvcCgpXG4gICAgICAgIGlmIChicmFja2V0cy5sZW5ndGggPT09IDApIGJyYWNrZXQgPSBudWxsXG4gICAgICB9XG5cbiAgICAgIHRva2VuID0gdGhpcy50b2tlbml6ZXIubmV4dFRva2VuKClcbiAgICB9XG5cbiAgICBpZiAodGhpcy50b2tlbml6ZXIuZW5kT2ZGaWxlKCkpIGVuZCA9IHRydWVcbiAgICBpZiAoYnJhY2tldHMubGVuZ3RoID4gMCkgdGhpcy51bmNsb3NlZEJyYWNrZXQoYnJhY2tldClcblxuICAgIGlmIChlbmQgJiYgY29sb24pIHtcbiAgICAgIHdoaWxlICh0b2tlbnMubGVuZ3RoKSB7XG4gICAgICAgIHRva2VuID0gdG9rZW5zW3Rva2Vucy5sZW5ndGggLSAxXVswXVxuICAgICAgICBpZiAodG9rZW4gIT09ICdzcGFjZScgJiYgdG9rZW4gIT09ICdjb21tZW50JykgYnJlYWtcbiAgICAgICAgdGhpcy50b2tlbml6ZXIuYmFjayh0b2tlbnMucG9wKCkpXG4gICAgICB9XG4gICAgICB0aGlzLmRlY2wodG9rZW5zKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVua25vd25Xb3JkKHRva2VucylcbiAgICB9XG4gIH1cblxuICBydWxlICh0b2tlbnMpIHtcbiAgICB0b2tlbnMucG9wKClcblxuICAgIGxldCBub2RlID0gbmV3IFJ1bGUoKVxuICAgIHRoaXMuaW5pdChub2RlLCB0b2tlbnNbMF1bMl0sIHRva2Vuc1swXVszXSlcblxuICAgIG5vZGUucmF3cy5iZXR3ZWVuID0gdGhpcy5zcGFjZXNBbmRDb21tZW50c0Zyb21FbmQodG9rZW5zKVxuICAgIHRoaXMucmF3KG5vZGUsICdzZWxlY3RvcicsIHRva2VucylcbiAgICB0aGlzLmN1cnJlbnQgPSBub2RlXG4gIH1cblxuICBkZWNsICh0b2tlbnMpIHtcbiAgICBsZXQgbm9kZSA9IG5ldyBEZWNsYXJhdGlvbigpXG4gICAgdGhpcy5pbml0KG5vZGUpXG5cbiAgICBsZXQgbGFzdCA9IHRva2Vuc1t0b2tlbnMubGVuZ3RoIC0gMV1cbiAgICBpZiAobGFzdFswXSA9PT0gJzsnKSB7XG4gICAgICB0aGlzLnNlbWljb2xvbiA9IHRydWVcbiAgICAgIHRva2Vucy5wb3AoKVxuICAgIH1cbiAgICBpZiAobGFzdFs0XSkge1xuICAgICAgbm9kZS5zb3VyY2UuZW5kID0geyBsaW5lOiBsYXN0WzRdLCBjb2x1bW46IGxhc3RbNV0gfVxuICAgIH0gZWxzZSB7XG4gICAgICBub2RlLnNvdXJjZS5lbmQgPSB7IGxpbmU6IGxhc3RbMl0sIGNvbHVtbjogbGFzdFszXSB9XG4gICAgfVxuXG4gICAgd2hpbGUgKHRva2Vuc1swXVswXSAhPT0gJ3dvcmQnKSB7XG4gICAgICBpZiAodG9rZW5zLmxlbmd0aCA9PT0gMSkgdGhpcy51bmtub3duV29yZCh0b2tlbnMpXG4gICAgICBub2RlLnJhd3MuYmVmb3JlICs9IHRva2Vucy5zaGlmdCgpWzFdXG4gICAgfVxuICAgIG5vZGUuc291cmNlLnN0YXJ0ID0geyBsaW5lOiB0b2tlbnNbMF1bMl0sIGNvbHVtbjogdG9rZW5zWzBdWzNdIH1cblxuICAgIG5vZGUucHJvcCA9ICcnXG4gICAgd2hpbGUgKHRva2Vucy5sZW5ndGgpIHtcbiAgICAgIGxldCB0eXBlID0gdG9rZW5zWzBdWzBdXG4gICAgICBpZiAodHlwZSA9PT0gJzonIHx8IHR5cGUgPT09ICdzcGFjZScgfHwgdHlwZSA9PT0gJ2NvbW1lbnQnKSB7XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBub2RlLnByb3AgKz0gdG9rZW5zLnNoaWZ0KClbMV1cbiAgICB9XG5cbiAgICBub2RlLnJhd3MuYmV0d2VlbiA9ICcnXG5cbiAgICBsZXQgdG9rZW5cbiAgICB3aGlsZSAodG9rZW5zLmxlbmd0aCkge1xuICAgICAgdG9rZW4gPSB0b2tlbnMuc2hpZnQoKVxuXG4gICAgICBpZiAodG9rZW5bMF0gPT09ICc6Jykge1xuICAgICAgICBub2RlLnJhd3MuYmV0d2VlbiArPSB0b2tlblsxXVxuICAgICAgICBicmVha1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZS5yYXdzLmJldHdlZW4gKz0gdG9rZW5bMV1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobm9kZS5wcm9wWzBdID09PSAnXycgfHwgbm9kZS5wcm9wWzBdID09PSAnKicpIHtcbiAgICAgIG5vZGUucmF3cy5iZWZvcmUgKz0gbm9kZS5wcm9wWzBdXG4gICAgICBub2RlLnByb3AgPSBub2RlLnByb3Auc2xpY2UoMSlcbiAgICB9XG4gICAgbm9kZS5yYXdzLmJldHdlZW4gKz0gdGhpcy5zcGFjZXNBbmRDb21tZW50c0Zyb21TdGFydCh0b2tlbnMpXG4gICAgdGhpcy5wcmVjaGVja01pc3NlZFNlbWljb2xvbih0b2tlbnMpXG5cbiAgICBmb3IgKGxldCBpID0gdG9rZW5zLmxlbmd0aCAtIDE7IGkgPiAwOyBpLS0pIHtcbiAgICAgIHRva2VuID0gdG9rZW5zW2ldXG4gICAgICBpZiAodG9rZW5bMV0udG9Mb3dlckNhc2UoKSA9PT0gJyFpbXBvcnRhbnQnKSB7XG4gICAgICAgIG5vZGUuaW1wb3J0YW50ID0gdHJ1ZVxuICAgICAgICBsZXQgc3RyaW5nID0gdGhpcy5zdHJpbmdGcm9tKHRva2VucywgaSlcbiAgICAgICAgc3RyaW5nID0gdGhpcy5zcGFjZXNGcm9tRW5kKHRva2VucykgKyBzdHJpbmdcbiAgICAgICAgaWYgKHN0cmluZyAhPT0gJyAhaW1wb3J0YW50Jykgbm9kZS5yYXdzLmltcG9ydGFudCA9IHN0cmluZ1xuICAgICAgICBicmVha1xuICAgICAgfSBlbHNlIGlmICh0b2tlblsxXS50b0xvd2VyQ2FzZSgpID09PSAnaW1wb3J0YW50Jykge1xuICAgICAgICBsZXQgY2FjaGUgPSB0b2tlbnMuc2xpY2UoMClcbiAgICAgICAgbGV0IHN0ciA9ICcnXG4gICAgICAgIGZvciAobGV0IGogPSBpOyBqID4gMDsgai0tKSB7XG4gICAgICAgICAgbGV0IHR5cGUgPSBjYWNoZVtqXVswXVxuICAgICAgICAgIGlmIChzdHIudHJpbSgpLmluZGV4T2YoJyEnKSA9PT0gMCAmJiB0eXBlICE9PSAnc3BhY2UnKSB7XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgICBzdHIgPSBjYWNoZS5wb3AoKVsxXSArIHN0clxuICAgICAgICB9XG4gICAgICAgIGlmIChzdHIudHJpbSgpLmluZGV4T2YoJyEnKSA9PT0gMCkge1xuICAgICAgICAgIG5vZGUuaW1wb3J0YW50ID0gdHJ1ZVxuICAgICAgICAgIG5vZGUucmF3cy5pbXBvcnRhbnQgPSBzdHJcbiAgICAgICAgICB0b2tlbnMgPSBjYWNoZVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0b2tlblswXSAhPT0gJ3NwYWNlJyAmJiB0b2tlblswXSAhPT0gJ2NvbW1lbnQnKSB7XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5yYXcobm9kZSwgJ3ZhbHVlJywgdG9rZW5zKVxuXG4gICAgaWYgKG5vZGUudmFsdWUuaW5kZXhPZignOicpICE9PSAtMSkgdGhpcy5jaGVja01pc3NlZFNlbWljb2xvbih0b2tlbnMpXG4gIH1cblxuICBhdHJ1bGUgKHRva2VuKSB7XG4gICAgbGV0IG5vZGUgPSBuZXcgQXRSdWxlKClcbiAgICBub2RlLm5hbWUgPSB0b2tlblsxXS5zbGljZSgxKVxuICAgIGlmIChub2RlLm5hbWUgPT09ICcnKSB7XG4gICAgICB0aGlzLnVubmFtZWRBdHJ1bGUobm9kZSwgdG9rZW4pXG4gICAgfVxuICAgIHRoaXMuaW5pdChub2RlLCB0b2tlblsyXSwgdG9rZW5bM10pXG5cbiAgICBsZXQgcHJldlxuICAgIGxldCBzaGlmdFxuICAgIGxldCBsYXN0ID0gZmFsc2VcbiAgICBsZXQgb3BlbiA9IGZhbHNlXG4gICAgbGV0IHBhcmFtcyA9IFtdXG5cbiAgICB3aGlsZSAoIXRoaXMudG9rZW5pemVyLmVuZE9mRmlsZSgpKSB7XG4gICAgICB0b2tlbiA9IHRoaXMudG9rZW5pemVyLm5leHRUb2tlbigpXG5cbiAgICAgIGlmICh0b2tlblswXSA9PT0gJzsnKSB7XG4gICAgICAgIG5vZGUuc291cmNlLmVuZCA9IHsgbGluZTogdG9rZW5bMl0sIGNvbHVtbjogdG9rZW5bM10gfVxuICAgICAgICB0aGlzLnNlbWljb2xvbiA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH0gZWxzZSBpZiAodG9rZW5bMF0gPT09ICd7Jykge1xuICAgICAgICBvcGVuID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgfSBlbHNlIGlmICh0b2tlblswXSA9PT0gJ30nKSB7XG4gICAgICAgIGlmIChwYXJhbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHNoaWZ0ID0gcGFyYW1zLmxlbmd0aCAtIDFcbiAgICAgICAgICBwcmV2ID0gcGFyYW1zW3NoaWZ0XVxuICAgICAgICAgIHdoaWxlIChwcmV2ICYmIHByZXZbMF0gPT09ICdzcGFjZScpIHtcbiAgICAgICAgICAgIHByZXYgPSBwYXJhbXNbLS1zaGlmdF1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKHByZXYpIHtcbiAgICAgICAgICAgIG5vZGUuc291cmNlLmVuZCA9IHsgbGluZTogcHJldls0XSwgY29sdW1uOiBwcmV2WzVdIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5lbmQodG9rZW4pXG4gICAgICAgIGJyZWFrXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJhbXMucHVzaCh0b2tlbilcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMudG9rZW5pemVyLmVuZE9mRmlsZSgpKSB7XG4gICAgICAgIGxhc3QgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuXG4gICAgbm9kZS5yYXdzLmJldHdlZW4gPSB0aGlzLnNwYWNlc0FuZENvbW1lbnRzRnJvbUVuZChwYXJhbXMpXG4gICAgaWYgKHBhcmFtcy5sZW5ndGgpIHtcbiAgICAgIG5vZGUucmF3cy5hZnRlck5hbWUgPSB0aGlzLnNwYWNlc0FuZENvbW1lbnRzRnJvbVN0YXJ0KHBhcmFtcylcbiAgICAgIHRoaXMucmF3KG5vZGUsICdwYXJhbXMnLCBwYXJhbXMpXG4gICAgICBpZiAobGFzdCkge1xuICAgICAgICB0b2tlbiA9IHBhcmFtc1twYXJhbXMubGVuZ3RoIC0gMV1cbiAgICAgICAgbm9kZS5zb3VyY2UuZW5kID0geyBsaW5lOiB0b2tlbls0XSwgY29sdW1uOiB0b2tlbls1XSB9XG4gICAgICAgIHRoaXMuc3BhY2VzID0gbm9kZS5yYXdzLmJldHdlZW5cbiAgICAgICAgbm9kZS5yYXdzLmJldHdlZW4gPSAnJ1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBub2RlLnJhd3MuYWZ0ZXJOYW1lID0gJydcbiAgICAgIG5vZGUucGFyYW1zID0gJydcbiAgICB9XG5cbiAgICBpZiAob3Blbikge1xuICAgICAgbm9kZS5ub2RlcyA9IFtdXG4gICAgICB0aGlzLmN1cnJlbnQgPSBub2RlXG4gICAgfVxuICB9XG5cbiAgZW5kICh0b2tlbikge1xuICAgIGlmICh0aGlzLmN1cnJlbnQubm9kZXMgJiYgdGhpcy5jdXJyZW50Lm5vZGVzLmxlbmd0aCkge1xuICAgICAgdGhpcy5jdXJyZW50LnJhd3Muc2VtaWNvbG9uID0gdGhpcy5zZW1pY29sb25cbiAgICB9XG4gICAgdGhpcy5zZW1pY29sb24gPSBmYWxzZVxuXG4gICAgdGhpcy5jdXJyZW50LnJhd3MuYWZ0ZXIgPSAodGhpcy5jdXJyZW50LnJhd3MuYWZ0ZXIgfHwgJycpICsgdGhpcy5zcGFjZXNcbiAgICB0aGlzLnNwYWNlcyA9ICcnXG5cbiAgICBpZiAodGhpcy5jdXJyZW50LnBhcmVudCkge1xuICAgICAgdGhpcy5jdXJyZW50LnNvdXJjZS5lbmQgPSB7IGxpbmU6IHRva2VuWzJdLCBjb2x1bW46IHRva2VuWzNdIH1cbiAgICAgIHRoaXMuY3VycmVudCA9IHRoaXMuY3VycmVudC5wYXJlbnRcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51bmV4cGVjdGVkQ2xvc2UodG9rZW4pXG4gICAgfVxuICB9XG5cbiAgZW5kRmlsZSAoKSB7XG4gICAgaWYgKHRoaXMuY3VycmVudC5wYXJlbnQpIHRoaXMudW5jbG9zZWRCbG9jaygpXG4gICAgaWYgKHRoaXMuY3VycmVudC5ub2RlcyAmJiB0aGlzLmN1cnJlbnQubm9kZXMubGVuZ3RoKSB7XG4gICAgICB0aGlzLmN1cnJlbnQucmF3cy5zZW1pY29sb24gPSB0aGlzLnNlbWljb2xvblxuICAgIH1cbiAgICB0aGlzLmN1cnJlbnQucmF3cy5hZnRlciA9ICh0aGlzLmN1cnJlbnQucmF3cy5hZnRlciB8fCAnJykgKyB0aGlzLnNwYWNlc1xuICB9XG5cbiAgZnJlZVNlbWljb2xvbiAodG9rZW4pIHtcbiAgICB0aGlzLnNwYWNlcyArPSB0b2tlblsxXVxuICAgIGlmICh0aGlzLmN1cnJlbnQubm9kZXMpIHtcbiAgICAgIGxldCBwcmV2ID0gdGhpcy5jdXJyZW50Lm5vZGVzW3RoaXMuY3VycmVudC5ub2Rlcy5sZW5ndGggLSAxXVxuICAgICAgaWYgKHByZXYgJiYgcHJldi50eXBlID09PSAncnVsZScgJiYgIXByZXYucmF3cy5vd25TZW1pY29sb24pIHtcbiAgICAgICAgcHJldi5yYXdzLm93blNlbWljb2xvbiA9IHRoaXMuc3BhY2VzXG4gICAgICAgIHRoaXMuc3BhY2VzID0gJydcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBIZWxwZXJzXG5cbiAgaW5pdCAobm9kZSwgbGluZSwgY29sdW1uKSB7XG4gICAgdGhpcy5jdXJyZW50LnB1c2gobm9kZSlcblxuICAgIG5vZGUuc291cmNlID0geyBzdGFydDogeyBsaW5lLCBjb2x1bW4gfSwgaW5wdXQ6IHRoaXMuaW5wdXQgfVxuICAgIG5vZGUucmF3cy5iZWZvcmUgPSB0aGlzLnNwYWNlc1xuICAgIHRoaXMuc3BhY2VzID0gJydcbiAgICBpZiAobm9kZS50eXBlICE9PSAnY29tbWVudCcpIHRoaXMuc2VtaWNvbG9uID0gZmFsc2VcbiAgfVxuXG4gIHJhdyAobm9kZSwgcHJvcCwgdG9rZW5zKSB7XG4gICAgbGV0IHRva2VuLCB0eXBlXG4gICAgbGV0IGxlbmd0aCA9IHRva2Vucy5sZW5ndGhcbiAgICBsZXQgdmFsdWUgPSAnJ1xuICAgIGxldCBjbGVhbiA9IHRydWVcbiAgICBsZXQgbmV4dCwgcHJldlxuICAgIGxldCBwYXR0ZXJuID0gL14oWy58I10pPyhbXFx3XSkrL2lcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHRva2VuID0gdG9rZW5zW2ldXG4gICAgICB0eXBlID0gdG9rZW5bMF1cblxuICAgICAgaWYgKHR5cGUgPT09ICdjb21tZW50JyAmJiBub2RlLnR5cGUgPT09ICdydWxlJykge1xuICAgICAgICBwcmV2ID0gdG9rZW5zW2kgLSAxXVxuICAgICAgICBuZXh0ID0gdG9rZW5zW2kgKyAxXVxuXG4gICAgICAgIGlmIChcbiAgICAgICAgICBwcmV2WzBdICE9PSAnc3BhY2UnICYmXG4gICAgICAgICAgbmV4dFswXSAhPT0gJ3NwYWNlJyAmJlxuICAgICAgICAgIHBhdHRlcm4udGVzdChwcmV2WzFdKSAmJlxuICAgICAgICAgIHBhdHRlcm4udGVzdChuZXh0WzFdKVxuICAgICAgICApIHtcbiAgICAgICAgICB2YWx1ZSArPSB0b2tlblsxXVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNsZWFuID0gZmFsc2VcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlID09PSAnY29tbWVudCcgfHwgKHR5cGUgPT09ICdzcGFjZScgJiYgaSA9PT0gbGVuZ3RoIC0gMSkpIHtcbiAgICAgICAgY2xlYW4gPSBmYWxzZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsdWUgKz0gdG9rZW5bMV1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFjbGVhbikge1xuICAgICAgbGV0IHJhdyA9IHRva2Vucy5yZWR1Y2UoKGFsbCwgaSkgPT4gYWxsICsgaVsxXSwgJycpXG4gICAgICBub2RlLnJhd3NbcHJvcF0gPSB7IHZhbHVlLCByYXcgfVxuICAgIH1cbiAgICBub2RlW3Byb3BdID0gdmFsdWVcbiAgfVxuXG4gIHNwYWNlc0FuZENvbW1lbnRzRnJvbUVuZCAodG9rZW5zKSB7XG4gICAgbGV0IGxhc3RUb2tlblR5cGVcbiAgICBsZXQgc3BhY2VzID0gJydcbiAgICB3aGlsZSAodG9rZW5zLmxlbmd0aCkge1xuICAgICAgbGFzdFRva2VuVHlwZSA9IHRva2Vuc1t0b2tlbnMubGVuZ3RoIC0gMV1bMF1cbiAgICAgIGlmIChsYXN0VG9rZW5UeXBlICE9PSAnc3BhY2UnICYmIGxhc3RUb2tlblR5cGUgIT09ICdjb21tZW50JykgYnJlYWtcbiAgICAgIHNwYWNlcyA9IHRva2Vucy5wb3AoKVsxXSArIHNwYWNlc1xuICAgIH1cbiAgICByZXR1cm4gc3BhY2VzXG4gIH1cblxuICBzcGFjZXNBbmRDb21tZW50c0Zyb21TdGFydCAodG9rZW5zKSB7XG4gICAgbGV0IG5leHRcbiAgICBsZXQgc3BhY2VzID0gJydcbiAgICB3aGlsZSAodG9rZW5zLmxlbmd0aCkge1xuICAgICAgbmV4dCA9IHRva2Vuc1swXVswXVxuICAgICAgaWYgKG5leHQgIT09ICdzcGFjZScgJiYgbmV4dCAhPT0gJ2NvbW1lbnQnKSBicmVha1xuICAgICAgc3BhY2VzICs9IHRva2Vucy5zaGlmdCgpWzFdXG4gICAgfVxuICAgIHJldHVybiBzcGFjZXNcbiAgfVxuXG4gIHNwYWNlc0Zyb21FbmQgKHRva2Vucykge1xuICAgIGxldCBsYXN0VG9rZW5UeXBlXG4gICAgbGV0IHNwYWNlcyA9ICcnXG4gICAgd2hpbGUgKHRva2Vucy5sZW5ndGgpIHtcbiAgICAgIGxhc3RUb2tlblR5cGUgPSB0b2tlbnNbdG9rZW5zLmxlbmd0aCAtIDFdWzBdXG4gICAgICBpZiAobGFzdFRva2VuVHlwZSAhPT0gJ3NwYWNlJykgYnJlYWtcbiAgICAgIHNwYWNlcyA9IHRva2Vucy5wb3AoKVsxXSArIHNwYWNlc1xuICAgIH1cbiAgICByZXR1cm4gc3BhY2VzXG4gIH1cblxuICBzdHJpbmdGcm9tICh0b2tlbnMsIGZyb20pIHtcbiAgICBsZXQgcmVzdWx0ID0gJydcbiAgICBmb3IgKGxldCBpID0gZnJvbTsgaSA8IHRva2Vucy5sZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0ICs9IHRva2Vuc1tpXVsxXVxuICAgIH1cbiAgICB0b2tlbnMuc3BsaWNlKGZyb20sIHRva2Vucy5sZW5ndGggLSBmcm9tKVxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIGNvbG9uICh0b2tlbnMpIHtcbiAgICBsZXQgYnJhY2tldHMgPSAwXG4gICAgbGV0IHRva2VuLCB0eXBlLCBwcmV2XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b2tlbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRva2VuID0gdG9rZW5zW2ldXG4gICAgICB0eXBlID0gdG9rZW5bMF1cblxuICAgICAgaWYgKHR5cGUgPT09ICcoJykge1xuICAgICAgICBicmFja2V0cyArPSAxXG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICcpJykge1xuICAgICAgICBicmFja2V0cyAtPSAxXG4gICAgICB9IGVsc2UgaWYgKGJyYWNrZXRzID09PSAwICYmIHR5cGUgPT09ICc6Jykge1xuICAgICAgICBpZiAoIXByZXYpIHtcbiAgICAgICAgICB0aGlzLmRvdWJsZUNvbG9uKHRva2VuKVxuICAgICAgICB9IGVsc2UgaWYgKHByZXZbMF0gPT09ICd3b3JkJyAmJiBwcmV2WzFdID09PSAncHJvZ2lkJykge1xuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBwcmV2ID0gdG9rZW5cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBFcnJvcnNcblxuICB1bmNsb3NlZEJyYWNrZXQgKGJyYWNrZXQpIHtcbiAgICB0aHJvdyB0aGlzLmlucHV0LmVycm9yKCdVbmNsb3NlZCBicmFja2V0JywgYnJhY2tldFsyXSwgYnJhY2tldFszXSlcbiAgfVxuXG4gIHVua25vd25Xb3JkICh0b2tlbnMpIHtcbiAgICB0aHJvdyB0aGlzLmlucHV0LmVycm9yKCdVbmtub3duIHdvcmQnLCB0b2tlbnNbMF1bMl0sIHRva2Vuc1swXVszXSlcbiAgfVxuXG4gIHVuZXhwZWN0ZWRDbG9zZSAodG9rZW4pIHtcbiAgICB0aHJvdyB0aGlzLmlucHV0LmVycm9yKCdVbmV4cGVjdGVkIH0nLCB0b2tlblsyXSwgdG9rZW5bM10pXG4gIH1cblxuICB1bmNsb3NlZEJsb2NrICgpIHtcbiAgICBsZXQgcG9zID0gdGhpcy5jdXJyZW50LnNvdXJjZS5zdGFydFxuICAgIHRocm93IHRoaXMuaW5wdXQuZXJyb3IoJ1VuY2xvc2VkIGJsb2NrJywgcG9zLmxpbmUsIHBvcy5jb2x1bW4pXG4gIH1cblxuICBkb3VibGVDb2xvbiAodG9rZW4pIHtcbiAgICB0aHJvdyB0aGlzLmlucHV0LmVycm9yKCdEb3VibGUgY29sb24nLCB0b2tlblsyXSwgdG9rZW5bM10pXG4gIH1cblxuICB1bm5hbWVkQXRydWxlIChub2RlLCB0b2tlbikge1xuICAgIHRocm93IHRoaXMuaW5wdXQuZXJyb3IoJ0F0LXJ1bGUgd2l0aG91dCBuYW1lJywgdG9rZW5bMl0sIHRva2VuWzNdKVxuICB9XG5cbiAgcHJlY2hlY2tNaXNzZWRTZW1pY29sb24gKC8qIHRva2VucyAqLykge1xuICAgIC8vIEhvb2sgZm9yIFNhZmUgUGFyc2VyXG4gIH1cblxuICBjaGVja01pc3NlZFNlbWljb2xvbiAodG9rZW5zKSB7XG4gICAgbGV0IGNvbG9uID0gdGhpcy5jb2xvbih0b2tlbnMpXG4gICAgaWYgKGNvbG9uID09PSBmYWxzZSkgcmV0dXJuXG5cbiAgICBsZXQgZm91bmRlZCA9IDBcbiAgICBsZXQgdG9rZW5cbiAgICBmb3IgKGxldCBqID0gY29sb24gLSAxOyBqID49IDA7IGotLSkge1xuICAgICAgdG9rZW4gPSB0b2tlbnNbal1cbiAgICAgIGlmICh0b2tlblswXSAhPT0gJ3NwYWNlJykge1xuICAgICAgICBmb3VuZGVkICs9IDFcbiAgICAgICAgaWYgKGZvdW5kZWQgPT09IDIpIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IHRoaXMuaW5wdXQuZXJyb3IoJ01pc3NlZCBzZW1pY29sb24nLCB0b2tlblsyXSwgdG9rZW5bM10pXG4gIH1cbn1cbiJdfQ==
