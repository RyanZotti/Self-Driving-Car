'use strict';

exports.__esModule = true;
/**
 * Contains helpers for working with vendor prefixes.
 *
 * @example
 * const vendor = postcss.vendor
 *
 * @namespace vendor
 */
var vendor = {

  /**
   * Returns the vendor prefix extracted from an input string.
   *
   * @param {string} prop String with or without vendor prefix.
   *
   * @return {string} vendor prefix or empty string
   *
   * @example
   * postcss.vendor.prefix('-moz-tab-size') //=> '-moz-'
   * postcss.vendor.prefix('tab-size')      //=> ''
   */
  prefix: function prefix(prop) {
    var match = prop.match(/^(-\w+-)/);
    if (match) {
      return match[0];
    } else {
      return '';
    }
  },


  /**
     * Returns the input string stripped of its vendor prefix.
     *
     * @param {string} prop String with or without vendor prefix.
     *
     * @return {string} String name without vendor prefixes.
     *
     * @example
     * postcss.vendor.unprefixed('-moz-tab-size') //=> 'tab-size'
     */
  unprefixed: function unprefixed(prop) {
    return prop.replace(/^-\w+-/, '');
  }
};

exports.default = vendor;
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInZlbmRvci5lczYiXSwibmFtZXMiOlsidmVuZG9yIiwicHJlZml4IiwicHJvcCIsIm1hdGNoIiwidW5wcmVmaXhlZCIsInJlcGxhY2UiXSwibWFwcGluZ3MiOiI7OztBQUFBOzs7Ozs7OztBQVFBLElBQUlBLFNBQVM7O0FBRVg7Ozs7Ozs7Ozs7O0FBV0FDLFFBYlcsa0JBYUhDLElBYkcsRUFhRztBQUNaLFFBQUlDLFFBQVFELEtBQUtDLEtBQUwsQ0FBVyxVQUFYLENBQVo7QUFDQSxRQUFJQSxLQUFKLEVBQVc7QUFDVCxhQUFPQSxNQUFNLENBQU4sQ0FBUDtBQUNELEtBRkQsTUFFTztBQUNMLGFBQU8sRUFBUDtBQUNEO0FBQ0YsR0FwQlU7OztBQXNCWDs7Ozs7Ozs7OztBQVVBQyxZQWhDVyxzQkFnQ0NGLElBaENELEVBZ0NPO0FBQ2hCLFdBQU9BLEtBQUtHLE9BQUwsQ0FBYSxRQUFiLEVBQXVCLEVBQXZCLENBQVA7QUFDRDtBQWxDVSxDQUFiOztrQkFzQ2VMLE0iLCJmaWxlIjoidmVuZG9yLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDb250YWlucyBoZWxwZXJzIGZvciB3b3JraW5nIHdpdGggdmVuZG9yIHByZWZpeGVzLlxuICpcbiAqIEBleGFtcGxlXG4gKiBjb25zdCB2ZW5kb3IgPSBwb3N0Y3NzLnZlbmRvclxuICpcbiAqIEBuYW1lc3BhY2UgdmVuZG9yXG4gKi9cbmxldCB2ZW5kb3IgPSB7XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHZlbmRvciBwcmVmaXggZXh0cmFjdGVkIGZyb20gYW4gaW5wdXQgc3RyaW5nLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvcCBTdHJpbmcgd2l0aCBvciB3aXRob3V0IHZlbmRvciBwcmVmaXguXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ30gdmVuZG9yIHByZWZpeCBvciBlbXB0eSBzdHJpbmdcbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogcG9zdGNzcy52ZW5kb3IucHJlZml4KCctbW96LXRhYi1zaXplJykgLy89PiAnLW1vei0nXG4gICAqIHBvc3Rjc3MudmVuZG9yLnByZWZpeCgndGFiLXNpemUnKSAgICAgIC8vPT4gJydcbiAgICovXG4gIHByZWZpeCAocHJvcCkge1xuICAgIGxldCBtYXRjaCA9IHByb3AubWF0Y2goL14oLVxcdystKS8pXG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICByZXR1cm4gbWF0Y2hbMF1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICcnXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGlucHV0IHN0cmluZyBzdHJpcHBlZCBvZiBpdHMgdmVuZG9yIHByZWZpeC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wIFN0cmluZyB3aXRoIG9yIHdpdGhvdXQgdmVuZG9yIHByZWZpeC5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gU3RyaW5nIG5hbWUgd2l0aG91dCB2ZW5kb3IgcHJlZml4ZXMuXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIHBvc3Rjc3MudmVuZG9yLnVucHJlZml4ZWQoJy1tb3otdGFiLXNpemUnKSAvLz0+ICd0YWItc2l6ZSdcbiAgICAgKi9cbiAgdW5wcmVmaXhlZCAocHJvcCkge1xuICAgIHJldHVybiBwcm9wLnJlcGxhY2UoL14tXFx3Ky0vLCAnJylcbiAgfVxuXG59XG5cbmV4cG9ydCBkZWZhdWx0IHZlbmRvclxuIl19
