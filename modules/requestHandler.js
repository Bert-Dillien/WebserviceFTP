/**
 * @description Describes methods for validating the initial request
 */
const fs = require('fs');
const ApiError = require('./apiError');
const Utils = require('./utils');

class RequestHandler {
  constructor() {
    // bind this scope to function calls
    this.addSettings = this.addSettings.bind(this);
    this.addSiteConfig = this.addSiteConfig.bind(this);
    this.getRequestParams = this.getRequestParams.bind(this);
    this.logRequest = this.logRequest.bind(this);
    this.sendResponse = this.sendResponse.bind(this);
    this.startRequest = this.startRequest.bind(this);
    this.validate = this.validate.bind(this);
    this.validateParams = this.validateParams.bind(this);
  }

  /**
   * @description starts request validation and prepares response
   * @param {Request} req request object
   * @param {Response} res response object
   * @param {Function} next next callback function
   */
  startRequest(req, res, next) {
    req.config = Utils.getConfig('./config.ini');
    req.errorMsgs = [];
    res.statusCode = 200;

    if (!this.validate(req)) {
      res.body = (new ApiError('Invalid request', 'Error in request')).getJsonError();    
      res.statusCode = 400;
    }
    
    next();
  }

  /**
   * @description Validates request header parameters
   * @param {Request} req request object
   */
  validate(req) {
    let isValid = !Utils.isEmpty(req.headers);
    
    if (isValid) { // check required headers
      isValid = Utils.checkPropertiesExist(req.headers, ['site', 'authorization']);
      if (!isValid) req.errorMsgs.push('Missing request headers [Authorization,Site]');
    } else {
      req.errorMsgs.push('No request headers found');
    }
    if (isValid) { // check Site header
      isValid = req.config.sites.hasOwnProperty(req.headers['site']);
      if (!isValid) req.errorMsgs.push('Site ['+req.headers['site']+'] was not found in config.sites');
    }
    if (isValid) {
      try {
        this.addSiteConfig(req);
        this.addSettings(req);
      } catch (error) {
        isValid = false;
        req.errorMsgs.push('Error occured while reading site settings: ' + error.message);
      }
    }
    if (isValid) { // validate Authorization header
      isValid = req.headers['authorization'] === (req.config.security.tokenType + ' ' + req.config.security.accessToken);
      if (!isValid) req.errorMsgs.push('Authorization does not match; got: ' + req.headers['authorization']);
    }
    if (isValid && req.method === 'POST') {
      isValid = req.headers.hasOwnProperty('content-type') && req.headers['content-type'] === 'application/json';
      if (!isValid) req.errorMsgs.push('Header Content-Type was missing or does not match application/json');
    }
    if (isValid && req.method === 'POST') {
      isValid = req.body !== null && !Utils.isEmpty(req.body);
      if (!isValid) req.errorMsgs.push('No body was received in request');
    }

    return isValid;
  }

  /**
   * @description appends the site config.ini to config
   * @param {Request} req 
   */
  addSiteConfig(req) {
    req.config.site = Utils.getConfig(req.config.sites[req.headers.site] + req.config.setup.pathDelim + 'config.ini');
    req.config.site.path = req.config.sites[req.headers.site];
    if (req.config.site.path.charAt(req.config.site.path.length-1) !== req.config.setup.pathDelim) {
      req.config.site.path += req.config.setup.pathDelim;
    }
    req.config.site.general.logFile = req.config.site.path + req.config.site.general.logFile;
    req.config.site.general.sessions = req.config.site.path + req.config.site.general.sessions + req.config.setup.pathDelim;
  }

  /**
   * @description creates a settings object derived from request parameters
   * @param {Request} req original request
   */
  addSettings(req) {
    let params = this.getRequestParams(req);
    req.settings = {
      remotePath: null,
      limit: parseInt(req.config.site.file.limit),
      filters: req.config.site.file.filters,
      fileNameFilters: []
    };
    
    if (params['remotePath']) {
      req.settings.remotePath = params['remotePath'];
    } else if (req.method === 'POST' && req.body !== undefined && req.body.hasOwnProperty('remotePath')) {
      req.settings.remotePath = req.body['remotePath'];
    } else if (!params['sessionId']) {
      req.errorMsgs.push('Missing [remotePath] parameter');
      throw new Error('Missing [remotePath] parameter');
    }

    if (params['limit'] && parseInt(params['limit']) < req.settings.limit) {
      req.settings.limit = parseInt(params['limit']);
    }
    if (params['filters']) {
      req.settings.filters = params['filters'];
    }
    if (params['fileNameFilters']) {
      req.settings.fileNameFilters = params['fileNameFilters'].split(',');
    }
    if (params['lastModified']) {
      req.settings.lastModified = Date.parse(params['lastModified']);
    }
    if (params['sessionId']) {
      req.settings.session = {
        id: params['sessionId']
      };
      if (params['offset']) {
        req.settings.session.offset = parseInt(params['offset']);
      } else {
        req.settings.session.offset = 0;
      }
    }
  }

  /**
   * @description validaties if list of parameters exist as parameters
   * @param {Request} req request object
   * @param {String[]} validateProperties list of properties to check for
   */
  validateParams(req, validateProperties) {
    return Utils.checkPropertiesExist(
      this.getRequestParams(req), 
      validateProperties
    );
  }
  
  /**
   * @description returns all combined request parameters
   * @param {Request} req 
   */
  getRequestParams(req) {
    return Utils.extendObject({}, req.params, req.query);
  }

  logRequest(req, res, next) {
    let now = new Date();
    let logLine = [
      now.getFullYear() + '-' + Utils.pad('00' ,(now.getMonth()+ 1), true) + '-' + Utils.pad('00' ,now.getDate(), true) + ' ' + Utils.pad('00' ,now.getHours(), true) + ':' + Utils.pad('00', now.getMinutes(), true) + ':' + Utils.pad('00', now.getSeconds(), true)+ ' ',
      Utils.pad('                                        ', req.ip, false),
      Utils.pad('     ', req.method, false),
      Utils.pad('      ', req.protocol, false),
      req.hostname,
      req.originalUrl,
      ' -> status ',
      res.statusCode,
      '\r\n'
    ];
    let logFile;
    if (req.config.hasOwnProperty('site')) {
      logFile = req.config.site.general.logFile;
    } else {
      logFile = req.config.setup.errorLog;
    }
    if (req.errorMsgs.length) {
      req.errorMsgs.forEach(message => { logLine.push(message + '\r\n'); });
    }

    fs.appendFileSync(logFile, logLine.join(''));
    next();
  }

  sendResponse(req, res, next) {
    res.status(res.statusCode).json(res.body);
  }
}

module.exports = new RequestHandler();
