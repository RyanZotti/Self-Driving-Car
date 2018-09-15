var fs = require('fs');

var excludePatterns = [
  '*.map',
  'src/',
  'src/**/*',
  'examples/',
  'examples/**/*',
  'example/',
  'example/**/*',
  'demo/**/*',
  'spec/',
  'spec/**/*',
  'docs/',
  'docs/**/*',
  'tests/',
  'tests/**/*',
  'test/',
  'test/**/*',
  'Gruntfile.js',
  'gulpfile.js',
  'package.json',
  'package-lock.json',
  'bower.json',
  'composer.json',
  'yarn.lock',
  'webpack.config.js',
  'README',
  'LICENSE',
  'CHANGELOG',
  '*.yml',
  '*.md',
  '*.coffee',
  '*.ts',
  '*.scss',
  '*.less'
];

module.exports = function (config) {
  config = config || {};

  var copyUnminified = config.copyUnminified || false;
  var replaceDefaultExcludes = config.replaceDefaultExcludes || false;
  var excludes = excludePatterns;

  var buffer = fs.readFileSync('./package.json');
  var packageJson = JSON.parse(buffer.toString());
  var packages = [];

  if (replaceDefaultExcludes) {
    excludes = config.excludes;
  } else {
    excludes = excludePatterns.concat(config.excludes);
  }

  for (lib in packageJson.dependencies) {
    var mainFileDir = './node_modules/' + lib;
    var libFiles = [];

    if (fs.existsSync(mainFileDir + '/dist')) {
      mainFileDir = mainFileDir + '/dist';
    } else {
      var depPackageBuffer = fs.readFileSync('./node_modules/' + lib + '/package.json');
      var depPackage = JSON.parse(depPackageBuffer.toString());

      if (depPackage.main) {
        var mainFile = mainFileDir + '/' + depPackage.main;
        var distDirPos;

        distDirPos = mainFile.lastIndexOf('/dist/');

        if (distDirPos !== -1) {
          mainFileDir = mainFile.substring(0, distDirPos) + '/dist';
        }
      }
    }

    function readLibFilesRecursively(target) {
      try {
        fs.readdirSync(target).forEach(function (path) {
          var fullPath = target + '/' + path;
          if (fs.lstatSync(fullPath).isDirectory()) {
            readLibFilesRecursively(fullPath);
          }
          libFiles.push(fullPath);
        });
      } catch (err) {
        console.log(err);
      }
    }

    readLibFilesRecursively(mainFileDir);

    // Includes
    packages.push(mainFileDir + '/**/*');

    //Excludes
    excludes.map(function (value) {
      packages.push('!' + mainFileDir + '/**/' + value);
    });

    if (copyUnminified === false) {
      // Delete unminified versions
      for (var i = 0; i < libFiles.length; i++) {
        var target;
        if (libFiles[i].indexOf('.min.js') > -1) {
          target = libFiles[i].replace(/\.min\.js/, '.js');
          packages.push('!' + libFiles[libFiles.indexOf(target)]);
        }
        if (libFiles[i].indexOf('.min.css') > -1) {
          target = libFiles[i].replace(/\.min\.css/, '.css');
          packages.push('!' + libFiles[libFiles.indexOf(target)]);
        }
      }
    }

  }

  return packages;
};
