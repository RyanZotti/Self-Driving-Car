'use strict';

exports.__esModule = true;

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _tokenize = require('./tokenize');

var _tokenize2 = _interopRequireDefault(_tokenize);

var _input = require('./input');

var _input2 = _interopRequireDefault(_input);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var HIGHLIGHT_THEME = {
  'brackets': _chalk2.default.cyan,
  'at-word': _chalk2.default.cyan,
  'comment': _chalk2.default.gray,
  'string': _chalk2.default.green,
  'class': _chalk2.default.yellow,
  'call': _chalk2.default.cyan,
  'hash': _chalk2.default.magenta,
  '(': _chalk2.default.cyan,
  ')': _chalk2.default.cyan,
  '{': _chalk2.default.yellow,
  '}': _chalk2.default.yellow,
  '[': _chalk2.default.yellow,
  ']': _chalk2.default.yellow,
  ':': _chalk2.default.yellow,
  ';': _chalk2.default.yellow
};

function getTokenType(_ref, processor) {
  var type = _ref[0],
      value = _ref[1];

  if (type === 'word') {
    if (value[0] === '.') {
      return 'class';
    }
    if (value[0] === '#') {
      return 'hash';
    }
  }

  if (!processor.endOfFile()) {
    var next = processor.nextToken();
    processor.back(next);
    if (next[0] === 'brackets' || next[0] === '(') return 'call';
  }

  return type;
}

function terminalHighlight(css) {
  var processor = (0, _tokenize2.default)(new _input2.default(css), { ignoreErrors: true });
  var result = '';

  var _loop = function _loop() {
    var token = processor.nextToken();
    var color = HIGHLIGHT_THEME[getTokenType(token, processor)];
    if (color) {
      result += token[1].split(/\r?\n/).map(function (i) {
        return color(i);
      }).join('\n');
    } else {
      result += token[1];
    }
  };

  while (!processor.endOfFile()) {
    _loop();
  }
  return result;
}

exports.default = terminalHighlight;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInRlcm1pbmFsLWhpZ2hsaWdodC5lczYiXSwibmFtZXMiOlsiSElHSExJR0hUX1RIRU1FIiwiY2hhbGsiLCJjeWFuIiwiZ3JheSIsImdyZWVuIiwieWVsbG93IiwibWFnZW50YSIsImdldFRva2VuVHlwZSIsInByb2Nlc3NvciIsInR5cGUiLCJ2YWx1ZSIsImVuZE9mRmlsZSIsIm5leHQiLCJuZXh0VG9rZW4iLCJiYWNrIiwidGVybWluYWxIaWdobGlnaHQiLCJjc3MiLCJJbnB1dCIsImlnbm9yZUVycm9ycyIsInJlc3VsdCIsInRva2VuIiwiY29sb3IiLCJzcGxpdCIsIm1hcCIsImkiLCJqb2luIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7Ozs7QUFFQTs7OztBQUNBOzs7Ozs7QUFFQSxJQUFNQSxrQkFBa0I7QUFDdEIsY0FBWUMsZ0JBQU1DLElBREk7QUFFdEIsYUFBV0QsZ0JBQU1DLElBRks7QUFHdEIsYUFBV0QsZ0JBQU1FLElBSEs7QUFJdEIsWUFBVUYsZ0JBQU1HLEtBSk07QUFLdEIsV0FBU0gsZ0JBQU1JLE1BTE87QUFNdEIsVUFBUUosZ0JBQU1DLElBTlE7QUFPdEIsVUFBUUQsZ0JBQU1LLE9BUFE7QUFRdEIsT0FBS0wsZ0JBQU1DLElBUlc7QUFTdEIsT0FBS0QsZ0JBQU1DLElBVFc7QUFVdEIsT0FBS0QsZ0JBQU1JLE1BVlc7QUFXdEIsT0FBS0osZ0JBQU1JLE1BWFc7QUFZdEIsT0FBS0osZ0JBQU1JLE1BWlc7QUFhdEIsT0FBS0osZ0JBQU1JLE1BYlc7QUFjdEIsT0FBS0osZ0JBQU1JLE1BZFc7QUFldEIsT0FBS0osZ0JBQU1JO0FBZlcsQ0FBeEI7O0FBa0JBLFNBQVNFLFlBQVQsT0FBc0NDLFNBQXRDLEVBQWlEO0FBQUEsTUFBekJDLElBQXlCO0FBQUEsTUFBbkJDLEtBQW1COztBQUMvQyxNQUFJRCxTQUFTLE1BQWIsRUFBcUI7QUFDbkIsUUFBSUMsTUFBTSxDQUFOLE1BQWEsR0FBakIsRUFBc0I7QUFDcEIsYUFBTyxPQUFQO0FBQ0Q7QUFDRCxRQUFJQSxNQUFNLENBQU4sTUFBYSxHQUFqQixFQUFzQjtBQUNwQixhQUFPLE1BQVA7QUFDRDtBQUNGOztBQUVELE1BQUksQ0FBQ0YsVUFBVUcsU0FBVixFQUFMLEVBQTRCO0FBQzFCLFFBQUlDLE9BQU9KLFVBQVVLLFNBQVYsRUFBWDtBQUNBTCxjQUFVTSxJQUFWLENBQWVGLElBQWY7QUFDQSxRQUFJQSxLQUFLLENBQUwsTUFBWSxVQUFaLElBQTBCQSxLQUFLLENBQUwsTUFBWSxHQUExQyxFQUErQyxPQUFPLE1BQVA7QUFDaEQ7O0FBRUQsU0FBT0gsSUFBUDtBQUNEOztBQUVELFNBQVNNLGlCQUFULENBQTRCQyxHQUE1QixFQUFpQztBQUMvQixNQUFJUixZQUFZLHdCQUFVLElBQUlTLGVBQUosQ0FBVUQsR0FBVixDQUFWLEVBQTBCLEVBQUVFLGNBQWMsSUFBaEIsRUFBMUIsQ0FBaEI7QUFDQSxNQUFJQyxTQUFTLEVBQWI7O0FBRitCO0FBSTdCLFFBQUlDLFFBQVFaLFVBQVVLLFNBQVYsRUFBWjtBQUNBLFFBQUlRLFFBQVFyQixnQkFBZ0JPLGFBQWFhLEtBQWIsRUFBb0JaLFNBQXBCLENBQWhCLENBQVo7QUFDQSxRQUFJYSxLQUFKLEVBQVc7QUFDVEYsZ0JBQVVDLE1BQU0sQ0FBTixFQUFTRSxLQUFULENBQWUsT0FBZixFQUNQQyxHQURPLENBQ0g7QUFBQSxlQUFLRixNQUFNRyxDQUFOLENBQUw7QUFBQSxPQURHLEVBRVBDLElBRk8sQ0FFRixJQUZFLENBQVY7QUFHRCxLQUpELE1BSU87QUFDTE4sZ0JBQVVDLE1BQU0sQ0FBTixDQUFWO0FBQ0Q7QUFaNEI7O0FBRy9CLFNBQU8sQ0FBQ1osVUFBVUcsU0FBVixFQUFSLEVBQStCO0FBQUE7QUFVOUI7QUFDRCxTQUFPUSxNQUFQO0FBQ0Q7O2tCQUVjSixpQiIsImZpbGUiOiJ0ZXJtaW5hbC1oaWdobGlnaHQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnXG5cbmltcG9ydCB0b2tlbml6ZXIgZnJvbSAnLi90b2tlbml6ZSdcbmltcG9ydCBJbnB1dCBmcm9tICcuL2lucHV0J1xuXG5jb25zdCBISUdITElHSFRfVEhFTUUgPSB7XG4gICdicmFja2V0cyc6IGNoYWxrLmN5YW4sXG4gICdhdC13b3JkJzogY2hhbGsuY3lhbixcbiAgJ2NvbW1lbnQnOiBjaGFsay5ncmF5LFxuICAnc3RyaW5nJzogY2hhbGsuZ3JlZW4sXG4gICdjbGFzcyc6IGNoYWxrLnllbGxvdyxcbiAgJ2NhbGwnOiBjaGFsay5jeWFuLFxuICAnaGFzaCc6IGNoYWxrLm1hZ2VudGEsXG4gICcoJzogY2hhbGsuY3lhbixcbiAgJyknOiBjaGFsay5jeWFuLFxuICAneyc6IGNoYWxrLnllbGxvdyxcbiAgJ30nOiBjaGFsay55ZWxsb3csXG4gICdbJzogY2hhbGsueWVsbG93LFxuICAnXSc6IGNoYWxrLnllbGxvdyxcbiAgJzonOiBjaGFsay55ZWxsb3csXG4gICc7JzogY2hhbGsueWVsbG93XG59XG5cbmZ1bmN0aW9uIGdldFRva2VuVHlwZSAoW3R5cGUsIHZhbHVlXSwgcHJvY2Vzc29yKSB7XG4gIGlmICh0eXBlID09PSAnd29yZCcpIHtcbiAgICBpZiAodmFsdWVbMF0gPT09ICcuJykge1xuICAgICAgcmV0dXJuICdjbGFzcydcbiAgICB9XG4gICAgaWYgKHZhbHVlWzBdID09PSAnIycpIHtcbiAgICAgIHJldHVybiAnaGFzaCdcbiAgICB9XG4gIH1cblxuICBpZiAoIXByb2Nlc3Nvci5lbmRPZkZpbGUoKSkge1xuICAgIGxldCBuZXh0ID0gcHJvY2Vzc29yLm5leHRUb2tlbigpXG4gICAgcHJvY2Vzc29yLmJhY2sobmV4dClcbiAgICBpZiAobmV4dFswXSA9PT0gJ2JyYWNrZXRzJyB8fCBuZXh0WzBdID09PSAnKCcpIHJldHVybiAnY2FsbCdcbiAgfVxuXG4gIHJldHVybiB0eXBlXG59XG5cbmZ1bmN0aW9uIHRlcm1pbmFsSGlnaGxpZ2h0IChjc3MpIHtcbiAgbGV0IHByb2Nlc3NvciA9IHRva2VuaXplcihuZXcgSW5wdXQoY3NzKSwgeyBpZ25vcmVFcnJvcnM6IHRydWUgfSlcbiAgbGV0IHJlc3VsdCA9ICcnXG4gIHdoaWxlICghcHJvY2Vzc29yLmVuZE9mRmlsZSgpKSB7XG4gICAgbGV0IHRva2VuID0gcHJvY2Vzc29yLm5leHRUb2tlbigpXG4gICAgbGV0IGNvbG9yID0gSElHSExJR0hUX1RIRU1FW2dldFRva2VuVHlwZSh0b2tlbiwgcHJvY2Vzc29yKV1cbiAgICBpZiAoY29sb3IpIHtcbiAgICAgIHJlc3VsdCArPSB0b2tlblsxXS5zcGxpdCgvXFxyP1xcbi8pXG4gICAgICAgIC5tYXAoaSA9PiBjb2xvcihpKSlcbiAgICAgICAgLmpvaW4oJ1xcbicpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCArPSB0b2tlblsxXVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbmV4cG9ydCBkZWZhdWx0IHRlcm1pbmFsSGlnaGxpZ2h0XG4iXX0=
