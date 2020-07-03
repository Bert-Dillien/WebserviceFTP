/** 
 * @description: Handles retrieving of file contents 
 */
'use strict';
const RequestHandler = require('../modules/requestHandler');
const ApiError = require('../modules/apiError');
const FileHandler = require('../modules/fileHandler');

class Files {
  constructor() {
    // bind this scope to function calls
    this.getFiles = this.getFiles.bind(this);
    this.postFiles = this.postFiles.bind(this);
  }

  getFiles(req, res, next) {
    if (res.statusCode != 200) {
      next();
      return;
    }

    if (RequestHandler.validateParams(req, ['remotePath'])
    || RequestHandler.validateParams(req, ['sessionId'])   
    ) {
      try {
        res.body = FileHandler.listFiles(req);
      } catch (error) {
        req.errorMsgs.push(error.message);
        res.body = (new ApiError('Error in request', error.message)).getJsonError();    
        res.statusCode = 500;
        
        console.log(error);
      }
    } else {
      res.body = (new ApiError('Invalid request', 'Error in request')).getJsonError();    
      res.statusCode = 400;
    }
    
    next();
  }

  postFiles(req, res, next) {
    if (res.statusCode != 200) {
      next();
      return;
    }
    
    try {
      res.body = FileHandler.postFiles(req);
      res.statusCode = 200;
    } catch (error) {
      req.errorMsgs.push(error.message);
      res.body = (new ApiError('Error in request', error.message)).getJsonError();    
      res.statusCode = 500;
      
      console.log(error);
    }
    
    next();
  }

}

module.exports = new Files();