'use strict';

var Errors = require('./errors');

var Plugin = function Plugin(methods) {
  for (var method in methods) {
    this[method] = typeof method === 'function' ? methods[method].bind(this) : methods[method];
  }

  this.validate();
};

Plugin.prototype = Object.defineProperties({
  /**
   * Plugin's name.
   * @type {String}
   */
  name: null,

  /**
   * List of supported syntaxes.
   * @type {Array}
   */
  syntax: null,

  /**
   * @type {Object}
   */
  accepts: null,

  /**
   * @type {Function}
   */
  process: null,

  /**
   * @type {Function}
   */
  lint: null,

  value_: null,

  validate: function validate() {
    if (typeof this.name !== 'string' || !this.name) throw new Error(Errors.missingName());

    if (!Array.isArray(this.syntax) || this.syntax.length === 0) throw new Error(Errors.missingSyntax());

    if (typeof this.accepts !== 'object' && typeof this.setValue !== 'function') throw new Error(Errors.missingSetValue());
  }
}, {
  value: {
    get: function get() {
      return this.value_;
    },
    set: function set(value) {
      var valueType = typeof value;
      var pattern = this.accepts && this.accepts[valueType];

      if (this.setValue) {
        this.value_ = this.setValue(value);
        return this.value_;
      }

      if (!pattern) throw new Error(Errors.unacceptableValueType(valueType, this.accepts));

      if (valueType === 'boolean') {
        if (pattern.indexOf(value) < 0) throw new Error(Errors.unacceptableBoolean(pattern));
        this.value_ = value;
        return this.value_;
      }

      if (valueType === 'number') {
        if (value !== parseInt(value)) throw new Error(Errors.unacceptableNumber());
        this.value_ = new Array(value + 1).join(' ');
        return this.value_;
      }

      if (valueType = 'string') {
        if (!value.match(pattern)) throw new Error(Errors.unacceptableString(pattern));
        this.value_ = value;
        return this.value_;
      }

      throw new Error(Errors.implementSetValue(valueType));
    },
    configurable: true,
    enumerable: true
  }
});

module.exports = Plugin;