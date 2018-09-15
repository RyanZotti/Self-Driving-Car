'use strict';

var format = require('./format');

module.exports = {
  implementSetValue: function implementSetValue(valueType) {
    if (typeof valueType === 'undefined') throw new Error();

    return format('If you see this message and you are not\n        a developer adding a new option, please open an issue here:\n        https://github.com/csscomb/core/issues/new\n\n        For option to accept values of type "' + valueType + '"\n        you need to implement custom `setValue()` method.');
  },

  missingName: function missingName() {
    return 'Plugin must have a valid `name` property.';
  },

  missingSetValue: function missingSetValue() {
    return format('Plugin must either implemet `setValue()` method\n        or provide `accepts` object with acceptable values.');
  },

  missingSyntax: function missingSyntax() {
    return 'Plugin must list supported syntaxes.';
  },

  twoPluginsWithSameName: function twoPluginsWithSameName(pluginName) {
    if (typeof pluginName === 'undefined') throw new Error();

    return format('You\'re trying to use one plugin twice:\n        ' + pluginName + '. Please make sure there are not two different\n        plugins with the same name.');
  },

  unacceptableBoolean: function unacceptableBoolean(pattern) {
    if (typeof pattern === 'undefined') throw new Error();

    return 'Value must be one of the following: ' + pattern.join(', ') + '.';
  },

  unacceptableNumber: function unacceptableNumber() {
    return 'Value must be an integer.';
  },

  unacceptableString: function unacceptableString(pattern) {
    if (typeof pattern === 'undefined') throw new Error();

    return 'Value must match pattern ' + pattern + '.';
  },

  unacceptableValueType: function unacceptableValueType(valueType, accepts) {
    if (typeof valueType === 'undefined' || typeof accepts === 'undefined') throw new Error();

    return format('The option does not accept values of type\n        ' + valueType + '.\nValue\'s type must be one the following:\n        ' + Object.keys(accepts).join(', ') + '.');
  }
};