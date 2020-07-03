const fs = require('fs');
const ini = require('ini');

class Utils {
  constructor() {
    this.isEmpty = this.isEmpty.bind(this);
    this.getConfig = this.getConfig.bind(this);
    this.getPathFromSettings = this.getPathFromSettings.bind(this);
    this.extendObject = this.extendObject.bind(this);
    this.pad = this.pad.bind(this);
    this.checkPropertiesExist = this.checkPropertiesExist.bind(this);
  }

  isEmpty(obj) {
    for(var key in obj) {
      if(obj.hasOwnProperty(key))
        return false;
    }
    return true;
  }

  /**
   * @description reads and parses a config.ini file
   * @param {String} path path to ini file
   * @returns {Object} parsed ini file object
   */
  getConfig(path) {
    return ini.parse(fs.readFileSync(path, 'utf-8'));
  }

  /**
   * @description returns the current working folder, incl trailing delimiter
   * @param {Request} req 
   */
  getPathFromSettings(req) {
    let leadDelim = req.config.site.path.charAt(0) === req.config.setup.pathDelim;
    let parts = req.config.site.path.split(req.config.setup.pathDelim);
    parts = parts.concat(req.settings.remotePath.split('/'));
    parts = parts.filter(item=>item!='');
    
    return (leadDelim ? req.config.setup.pathDelim : '') + parts.join(req.config.setup.pathDelim) + req.config.setup.pathDelim;
  }

  /**
   * @description Merges src into obj. Only top levels keys are considered.
   * @param {Object} obj required, target object for the merge
   * @param {Object} args 0 or more source argument objects
   * @returns {Object} merged object
   */
  extendObject(obj) {
    if (arguments.length > 1)  {
      for (let i=1; i<arguments.length; i++) {
        let src = arguments[i];
        if (src === null) 
          continue;

        for (let key in src) {
          obj[key] = src[key];
        }
      }
    }
    return obj;
  }

/**
   * @description validates if obj contains all params in passed array
   * @param {Object} obj the object to check for properties
   * @param {String[]} properties list of properties to check
   */
  checkPropertiesExist(obj, properties) {
    for (let i=0; i< properties.length; i++) {
      if (!obj.hasOwnProperty(properties[i]))
        return false;
    }
    return true;
  }

  /**
   * @description pads a string, works by providing the pad string entirely
   * @param {String} pad 
   * @param {String} str 
   * @param {Boolean} padLeft
   */
  pad(pad, str, padLeft) {
    if (typeof str === 'undefined') 
      return pad;
    if (padLeft) {
      return (pad + str).slice(-pad.length);
    } else {
      return (str + pad).substring(0, pad.length);
    }
  }
}

module.exports = new Utils();