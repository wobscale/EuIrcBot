var fs = require('fs'),
    path = require('path');


module.exports.getModuleName = function(mpath) {
  var m;
  var stats = fs.statSync(mpath);
  if(stats.isFile()) {
    try {
      m = require(mpath).name;
      if(m) return m;
    } catch(ex) {
      /* not a warning yet. Eventually maybe */
    }
  } else if(stats.isDirectory()) {
    try {
      m = JSON.parse(fs.readFileSync(path.join(mpath, 'package.json'))).name;
      if(m) return m;
    } catch(ex) {
      console.log("Invalid package.json for " + mpath);
      console.log(ex);
    }
  }
  return mpath;
};

module.exports.loadModuleFolder = function(folder, cb) {
  var modules = {};
  var wmodulePaths = {};
  fs.readdir(path.join('.',folder), function(err, modulePaths) {
    if(err) {
      console.log(err);
      // Don't err; it'll stop async from hitting up other module folders
      return cb(null, {modules: {}, modulePaths: {}});
    }
    //Exclude hidden files and folders
    modulePaths = modulePaths.filter(function(i){return i[0] !== '.';});
    for(var i=0;i<modulePaths.length;i++) {
      /* ./ required because of how require works. go figure. */
      var fullPath = './' + path.join('.', folder, modulePaths[i]);
      var moduleName = me.getModuleName(fullPath);
      if(modules[moduleName]) continue;
      try {
        var mod = require(fullPath);
        if(mod.disabled) continue;
        modules[moduleName] = mod;
        wmodulePaths[moduleName] = fullPath;
      } catch(ex) {
        console.error(ex.stack);
        console.error(ex);
      }
    }
    cb(false, {modules: modules, modulePaths: wmodulePaths});
  });
};



var me = module.exports;
