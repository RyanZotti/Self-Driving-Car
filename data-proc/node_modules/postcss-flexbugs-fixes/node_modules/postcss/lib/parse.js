'use strict';

exports.__esModule = true;

var _parser = require('./parser');

var _parser2 = _interopRequireDefault(_parser);

var _input = require('./input');

var _input2 = _interopRequireDefault(_input);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function parse(css, opts) {
  var input = new _input2.default(css, opts);
  var parser = new _parser2.default(input);
  try {
    parser.parse();
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      if (e.name === 'CssSyntaxError' && opts && opts.from) {
        if (/\.scss$/i.test(opts.from)) {
          e.message += '\nYou tried to parse SCSS with ' + 'the standard CSS parser; ' + 'try again with the postcss-scss parser';
        } else if (/\.sass/i.test(opts.from)) {
          e.message += '\nYou tried to parse Sass with ' + 'the standard CSS parser; ' + 'try again with the postcss-sass parser';
        } else if (/\.less$/i.test(opts.from)) {
          e.message += '\nYou tried to parse Less with ' + 'the standard CSS parser; ' + 'try again with the postcss-less parser';
        }
      }
    }
    throw e;
  }

  return parser.root;
}

exports.default = parse;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBhcnNlLmVzNiJdLCJuYW1lcyI6WyJwYXJzZSIsImNzcyIsIm9wdHMiLCJpbnB1dCIsIklucHV0IiwicGFyc2VyIiwiUGFyc2VyIiwiZSIsInByb2Nlc3MiLCJlbnYiLCJOT0RFX0VOViIsIm5hbWUiLCJmcm9tIiwidGVzdCIsIm1lc3NhZ2UiLCJyb290Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7QUFDQTs7Ozs7O0FBRUEsU0FBU0EsS0FBVCxDQUFnQkMsR0FBaEIsRUFBcUJDLElBQXJCLEVBQTJCO0FBQ3pCLE1BQUlDLFFBQVEsSUFBSUMsZUFBSixDQUFVSCxHQUFWLEVBQWVDLElBQWYsQ0FBWjtBQUNBLE1BQUlHLFNBQVMsSUFBSUMsZ0JBQUosQ0FBV0gsS0FBWCxDQUFiO0FBQ0EsTUFBSTtBQUNGRSxXQUFPTCxLQUFQO0FBQ0QsR0FGRCxDQUVFLE9BQU9PLENBQVAsRUFBVTtBQUNWLFFBQUlDLFFBQVFDLEdBQVIsQ0FBWUMsUUFBWixLQUF5QixZQUE3QixFQUEyQztBQUN6QyxVQUFJSCxFQUFFSSxJQUFGLEtBQVcsZ0JBQVgsSUFBK0JULElBQS9CLElBQXVDQSxLQUFLVSxJQUFoRCxFQUFzRDtBQUNwRCxZQUFJLFdBQVdDLElBQVgsQ0FBZ0JYLEtBQUtVLElBQXJCLENBQUosRUFBZ0M7QUFDOUJMLFlBQUVPLE9BQUYsSUFBYSxvQ0FDQSwyQkFEQSxHQUVBLHdDQUZiO0FBR0QsU0FKRCxNQUlPLElBQUksVUFBVUQsSUFBVixDQUFlWCxLQUFLVSxJQUFwQixDQUFKLEVBQStCO0FBQ3BDTCxZQUFFTyxPQUFGLElBQWEsb0NBQ0EsMkJBREEsR0FFQSx3Q0FGYjtBQUdELFNBSk0sTUFJQSxJQUFJLFdBQVdELElBQVgsQ0FBZ0JYLEtBQUtVLElBQXJCLENBQUosRUFBZ0M7QUFDckNMLFlBQUVPLE9BQUYsSUFBYSxvQ0FDQSwyQkFEQSxHQUVBLHdDQUZiO0FBR0Q7QUFDRjtBQUNGO0FBQ0QsVUFBTVAsQ0FBTjtBQUNEOztBQUVELFNBQU9GLE9BQU9VLElBQWQ7QUFDRDs7a0JBRWNmLEsiLCJmaWxlIjoicGFyc2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGFyc2VyIGZyb20gJy4vcGFyc2VyJ1xuaW1wb3J0IElucHV0IGZyb20gJy4vaW5wdXQnXG5cbmZ1bmN0aW9uIHBhcnNlIChjc3MsIG9wdHMpIHtcbiAgbGV0IGlucHV0ID0gbmV3IElucHV0KGNzcywgb3B0cylcbiAgbGV0IHBhcnNlciA9IG5ldyBQYXJzZXIoaW5wdXQpXG4gIHRyeSB7XG4gICAgcGFyc2VyLnBhcnNlKClcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgICBpZiAoZS5uYW1lID09PSAnQ3NzU3ludGF4RXJyb3InICYmIG9wdHMgJiYgb3B0cy5mcm9tKSB7XG4gICAgICAgIGlmICgvXFwuc2NzcyQvaS50ZXN0KG9wdHMuZnJvbSkpIHtcbiAgICAgICAgICBlLm1lc3NhZ2UgKz0gJ1xcbllvdSB0cmllZCB0byBwYXJzZSBTQ1NTIHdpdGggJyArXG4gICAgICAgICAgICAgICAgICAgICAgICd0aGUgc3RhbmRhcmQgQ1NTIHBhcnNlcjsgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICd0cnkgYWdhaW4gd2l0aCB0aGUgcG9zdGNzcy1zY3NzIHBhcnNlcidcbiAgICAgICAgfSBlbHNlIGlmICgvXFwuc2Fzcy9pLnRlc3Qob3B0cy5mcm9tKSkge1xuICAgICAgICAgIGUubWVzc2FnZSArPSAnXFxuWW91IHRyaWVkIHRvIHBhcnNlIFNhc3Mgd2l0aCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgJ3RoZSBzdGFuZGFyZCBDU1MgcGFyc2VyOyAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgJ3RyeSBhZ2FpbiB3aXRoIHRoZSBwb3N0Y3NzLXNhc3MgcGFyc2VyJ1xuICAgICAgICB9IGVsc2UgaWYgKC9cXC5sZXNzJC9pLnRlc3Qob3B0cy5mcm9tKSkge1xuICAgICAgICAgIGUubWVzc2FnZSArPSAnXFxuWW91IHRyaWVkIHRvIHBhcnNlIExlc3Mgd2l0aCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgJ3RoZSBzdGFuZGFyZCBDU1MgcGFyc2VyOyAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgJ3RyeSBhZ2FpbiB3aXRoIHRoZSBwb3N0Y3NzLWxlc3MgcGFyc2VyJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IGVcbiAgfVxuXG4gIHJldHVybiBwYXJzZXIucm9vdFxufVxuXG5leHBvcnQgZGVmYXVsdCBwYXJzZVxuIl19
