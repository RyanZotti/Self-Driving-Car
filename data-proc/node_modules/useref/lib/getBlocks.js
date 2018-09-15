'use strict';

var buildBlockManager = require('./buildBlockManager'),
  parse = require('./parseBuildBlock'),
  resources = require('./resources');

// Returns a hash object of all the directives for the given html. Results is
// of the following form:
//
//     {
//        'css/site.css ':[
//          '  <!-- build:css css/site.css -->',
//          '  <link rel="stylesheet" href="css/style.css">',
//          '  <!-- endbuild -->'
//        ],
//        'js/head.js ': [
//          '  <!-- build:js js/head.js -->',
//          '  <script src="js/libs/modernizr-2.5.3.min.js"></script>',
//          '  <!-- endbuild -->'
//        ],
//        'js/site.js ': [
//          '  <!-- build:js js/site.js -->',
//          '  <script src="js/plugins.js"></script>',
//          '  <script src="js/script.js"></script>',
//          '  <!-- endbuild -->'
//        ]
//     }
//

module.exports = function (body) {
  var lines = body.replace(/\r\n/g, '\n').split(/\n/),
    bbm = Object.create(buildBlockManager);

  bbm.sections = {};

  lines.forEach(function (l) {
    if (resources.regbuild.test(l)) {
      bbm.block = true;

      bbm.setSections(parse(l));
    }

    if (bbm.block && bbm.last) {
      bbm.last.push(l);
    }

    // switch back block flag when endbuild
    if (bbm.block && bbm.endbuild(l)) {
      bbm.block = false;
    }
  });

  // sections is an array of lines starting with the build block comment opener,
  // including all the references and including the build block comment closer.
  return bbm.sections;
};
