var fs     = require('fs-extra');
var path   = require('path');
var xml2js = require('xml2js');
var ig     = require('imagemagick');
var colors = require('colors');
var _      = require('underscore');
var Q      = require('q');
var argv   = require('minimist')(process.argv.slice(2));

/**
 * @var {Object} settings - names of the config file and of the icon image
 */
var settings = {};
settings.CONFIG_FILE = argv.config || 'config.xml';
settings.ICON_FILE = argv.icon || 'icon.png';
settings.OLD_XCODE_PATH = argv['xcode-old'] || false;
settings.SPLASH_FILE = argv.splash || 'splash.png';

/**
 * Check which platforms are added to the project and return their icon names and sizes
 *
 * @param  {String} projectName
 * @return {Promise} resolves with an array of platforms
 */
var getPlatforms = function (projectName) {
  var deferred = Q.defer();
  var platforms = [];
  var xcodeFolder = '/Images.xcassets/AppIcon.appiconset/';

  if (settings.OLD_XCODE_PATH) {
    xcodeFolder = '/Resources/icons/';
  }

  platforms.push({
    name : 'ios',
    // TODO: use async fs.exists
    isAdded : fs.existsSync('platforms/ios'),
    iconsPath : 'platforms/ios/' + projectName + xcodeFolder,
    icons : [
      { name : 'icon-40.png',       size : 40  },
      { name : 'icon-40@2x.png',    size : 80  },
      { name : 'icon-50.png',       size : 50  },
      { name : 'icon-50@2x.png',    size : 100 },
      { name : 'icon-60.png',       size : 60  },
      { name : 'icon-60@2x.png',    size : 120 },
      { name : 'icon-60@3x.png',    size : 180 },
      { name : 'icon-72.png',       size : 72  },
      { name : 'icon-72@2x.png',    size : 144 },
      { name : 'icon-76.png',       size : 76  },
      { name : 'icon-76@2x.png',    size : 152 },
      { name : 'icon-small.png',    size : 29  },
      { name : 'icon-small@2x.png', size : 58  },
      { name : 'icon-small@3x.png', size : 87  },
      { name : 'icon.png',          size : 57  },
      { name : 'icon@2x.png',       size : 114 },
      { name : 'icon-83.5@2x.png',  size : 167 }
    ],
    splash : [
      // TODO !!
    ]
  });
  platforms.push({
    name : 'android',
    isAdded : fs.existsSync('platforms/android'),
    iconsPath : 'platforms/android/app/src/main/res/',
    icons : [
      { name : 'drawable/icon.png',       size : 96 },
      { name : 'drawable-hdpi/icon.png',  size : 72 },
      { name : 'drawable-ldpi/icon.png',  size : 36 },
      { name : 'drawable-mdpi/icon.png',  size : 48 },
      { name : 'drawable-xhdpi/icon.png', size : 96 },
      { name : 'drawable-xxhdpi/icon.png', size : 144 },
      { name : 'drawable-xxxhdpi/icon.png', size : 192 },
      { name : 'mipmap-hdpi/icon.png',  size : 72 },
      { name : 'mipmap-ldpi/icon.png',  size : 36 },
      { name : 'mipmap-mdpi/icon.png',  size : 48 },
      { name : 'mipmap-xhdpi/icon.png', size : 96 },
      { name : 'mipmap-xxhdpi/icon.png', size : 144 },
      { name : 'mipmap-xxxhdpi/icon.png', size : 192 },
      // New ones I've noticed as at 25 Aug 2020, Cordova v9.0.0, Android v26
      { name : 'mipmap-hdpi-v26/ic_launcher_foreground.png',  size : 72 },
      { name : 'mipmap-ldpi-v26/ic_launcher_foreground.png',  size : 36 },
      { name : 'mipmap-mdpi-v26/ic_launcher_foreground.png',  size : 48 },
      { name : 'mipmap-xhdpi-v26/ic_launcher_foreground.png',  size : 216 },
      { name : 'mipmap-xxhdpi-v26/ic_launcher_foreground.png',  size : 324 },
      { name : 'mipmap-xxxhdpi-v26/ic_launcher_foreground.png',  size : 432 },
    ],
    splash : [
      { name : 'drawable-land-hdpi/screen.png', size : 800, height : 480  },
      { name : 'drawable-land-ldpi/screen.png', size : 320, height : 200 },
      { name : 'drawable-land-mdpi/screen.png', size : 480, height : 320 },
      { name : 'drawable-land-xhdpi/screen.png', size : 1280, height : 720 },
      { name : 'drawable-land-xxhdpi/screen.png', size : 1600, height : 960 },
      { name : 'drawable-land-xxxhdpi/screen.png', size : 1920, height : 1280 },
      { name : 'drawable-port-hdpi/screen.png', size : 480, height : 800 },
      { name : 'drawable-port-ldpi/screen.png', size : 200, height : 320 },
      { name : 'drawable-port-mdpi/screen.png', size : 320, height : 420 },
      { name : 'drawable-port-xhdpi/screen.png', size : 720, height : 1280 },
      { name : 'drawable-port-xxhdpi/screen.png', size : 960, height : 1600 },
      { name : 'drawable-port-xxxhdpi/screen.png', size : 1920, height : 1280 },
    ]
  });

  deferred.resolve(platforms);
  return deferred.promise;
};

/**
 * @var {Object} console utils
 */
var display = {};
display.success = function (str) {
  str = '✓  '.green + str;
  console.log('  ' + str);
};
display.error = function (str) {
  str = '✗  '.red + str;
  console.log('  ' + str);
};
display.header = function (str) {
  console.log('');
  console.log(' ' + str.cyan.underline);
  console.log('');
};

/**
 * read the config file and get the project name
 *
 * @return {Promise} resolves to a string - the project's name
 */
var getProjectName = function () {
  var deferred = Q.defer();
  var parser = new xml2js.Parser();
  fs.readFile(settings.CONFIG_FILE, function (err, data) {
    if (err) {
      deferred.reject(err);
    }
    parser.parseString(data, function (err, result) {
      if (err) {
        deferred.reject(err);
      }
      var projectName = result.widget.name[0];
      deferred.resolve(projectName);
    });
  });
  return deferred.promise;
};

/**
 * Resizes, crops (if needed) and creates a new icon in the platform's folder.
 *
 * @param  {Object} platform
 * @param  {Object} icon
 * @return {Promise}
 */
var generateIconOrSplash = function (isIcon, platform, icon) {
  var deferred = Q.defer();
  var srcPath = (isIcon) ? settings.ICON_FILE : settings.SPLASH_FILE;
  var platformPath = srcPath.replace(/\.png$/, '-' + platform.name + '.png');
  if (fs.existsSync(platformPath)) {
    srcPath = platformPath;
  }
  var dstPath = platform.iconsPath + icon.name;
  var dst = path.dirname(dstPath);
  if (!fs.existsSync(dst)) {
    fs.mkdirsSync(dst);
  }
  ig.resize({
    srcPath: srcPath,
    dstPath: dstPath,
    quality: 1,
    format: 'png',
    width: icon.size,
    height: icon.size
  } , function(err, stdout, stderr){
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve();
      display.success(icon.name + ' created');
    }
  });
  if (icon.height) {
    ig.crop({
      srcPath: srcPath,
      dstPath: dstPath,
      quality: 1,
      format: 'png',
      width: icon.size,
      height: icon.height
    } , function(err, stdout, stderr){
      if (err) {
        deferred.reject(err);
      } else {
        deferred.resolve();
        display.success(icon.name + ' cropped');
      }
    });
  }
  return deferred.promise;
};

/**
 * Generates icons based on the platform object
 *
 * @param  {Object} platform
 * @return {Promise}
 */
var generateIconsForPlatform = function (platform) {
  display.header('Generating Icons for ' + platform.name);
  var all = [];
  var icons = platform.icons;
  icons.forEach(function (icon) {
    all.push(generateIconOrSplash(true, platform, icon));
  });
  return Promise.all(all);
};

var generateSplashForPlatform = function (platform) {
  display.header('Generating Splash for ' + platform.name);
  var all = [];
  var splash = platform.splash;
  splash.forEach(function (splash) {
    all.push(generateIconOrSplash(false, platform, splash));
  });
  return Promise.all(all);
};

/**
 * Goes over all the platforms and triggers icon generation
 *
 * @param  {Array} platforms
 * @return {Promise}
 */
var generateIcons = function (platforms) {
  var deferred = Q.defer();
  var sequence = Q();
  var all = [];
  _(platforms).where({ isAdded : true }).forEach(function (platform) {
    sequence = sequence.then(function () {
      return generateIconsForPlatform(platform);
    });
    all.push(sequence);
  });
  _(platforms).where({ isAdded : true }).forEach(function (platform) {
    sequence = sequence.then(function () {
      return generateSplashForPlatform(platform);
    });
    all.push(sequence);
  });

  Q.all(all).then(function () {
    deferred.resolve();
  });
  return deferred.promise;
};

/**
 * Checks if at least one platform was added to the project
 *
 * @return {Promise} resolves if at least one platform was found, rejects otherwise
 */
var atLeastOnePlatformFound = function () {
  var deferred = Q.defer();
  getPlatforms().then(function (platforms) {
    var activePlatforms = _(platforms).where({ isAdded : true });
    if (activePlatforms.length > 0) {
      display.success('platforms found: ' + _(activePlatforms).pluck('name').join(', '));
      deferred.resolve();
    } else {
      display.error('No cordova platforms found. ' +
                    'Make sure you are in the root folder of your Cordova project ' +
                    'and add platforms with \'cordova platform add\'');
      deferred.reject();
    }
  });
  return deferred.promise;
};

/**
 * Checks if a valid icon file exists
 *
 * @return {Promise} resolves if exists, rejects otherwise
 */
var validIconExists = function () {
  var deferred = Q.defer();
  fs.exists(settings.ICON_FILE, function (exists) {
    if (exists) {
      display.success(settings.ICON_FILE + ' exists');
      deferred.resolve();
    } else {
      display.error(settings.ICON_FILE + ' does not exist');
      deferred.reject();
    }
  });
  return deferred.promise;
};

/**
 * Checks if a valid icon file exists
 *
 * @return {Promise} resolves if exists, rejects otherwise
 */
var validSplashExists = function () {
  var deferred = Q.defer();
  fs.exists(settings.SPLASH_FILE, function (exists) {
    if (exists) {
      display.success(settings.SPLASH_FILE + ' exists');
      deferred.resolve();
    } else {
      display.error(settings.SPLASH_FILE + ' does not exist');
      deferred.reject();
    }
  });
  return deferred.promise;
};

/**
 * Checks if a config.xml file exists
 *
 * @return {Promise} resolves if exists, rejects otherwise
 */
var configFileExists = function () {
  var deferred = Q.defer();
  fs.exists(settings.CONFIG_FILE, function (exists) {
    if (exists) {
      display.success(settings.CONFIG_FILE + ' exists');
      deferred.resolve();
    } else {
      display.error('cordova\'s ' + settings.CONFIG_FILE + ' does not exist');
      deferred.reject();
    }
  });
  return deferred.promise;
};

display.header('Checking Project & Icon');

atLeastOnePlatformFound()
  .then(validIconExists)
  .then(validSplashExists)
  .then(configFileExists)
  .then(getProjectName)
  .then(getPlatforms)
  .then(generateIcons)
  .catch(function (err) {
    if (err) {
      console.log(err);
    }
  }).then(function () {
    console.log('');
  });
