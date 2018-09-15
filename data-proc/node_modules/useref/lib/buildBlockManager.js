'use strict';

var resources = require('./resources'),
  sectionsJoinChar = resources.sectionsJoinChar,
  regend = resources.regend,
  sectionKey;

module.exports = {
  block: false,

  sections: {},

  sectionIndex: 0,

  last: null,

  removeBlockIndex: 0,

  getSectionKey: function (build) {
    var key;

    if (build.attbs) {
      key = [ build.type, build.target, build.attbs ].join(sectionsJoinChar);
    } else if (build.target) {
      key = [ build.type, build.target ].join(sectionsJoinChar);
    } else {
      key = build.type;
    }

    return key;
  },

  setSections: function (build) {
    if (build.type === 'remove') {
      build.target = String(this.removeBlockIndex++);
    }

    sectionKey = this.getSectionKey(build);

    if (this.sections[sectionKey]) {
      sectionKey += this.sectionIndex++;
    }

    this.sections[sectionKey] = this.last = [];
  },

  endbuild: function (line) {
    return regend.test(line);
  }
};
