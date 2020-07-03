'use strict';

const fs = require('fs');
const Path = require('path');
const Utils = require('./utils');
const Paging = require('./paging');
const FileObjects = require('./file');

class FileHandler {
  constructor(){
    this.listFiles = this.listFiles.bind(this);
    this.formatResult = this.formatResult.bind(this);
    this.postFiles = this.postFiles.bind(this);
  }

  /**
   * @description handles retrieving files from folder or session
   * @param {Request} req 
   */
  listFiles(req) {
    let workFiles = [];

    if (req.settings['session']) { // handle session Id instead      
      Paging.readSessionData(req);
      if (req.settings.session.data !== null) {
        workFiles = req.settings.session.data;
      } else {
        throw new Error('No session found for ['+ req.settings.session.id +']');
      }
    } else { // handle new request
      let path = Utils.getPathFromSettings(req);
      let files = fs.readdirSync(path);
      // filter on extension
      if (req.settings.filters.length) {
        files = files.filter(file => { 
          let fileExt = Path.extname(file).toLowerCase().replace('.', '');
          if (fileExt.length)
            return req.settings.filters.toLowerCase().indexOf(fileExt) !== -1; 
          else
            return false; // no file extension found, directory?
        });
      }
      // filters on file name
      if (req.settings.fileNameFilters.length) {
       files = files.filter(file => {
          for (let i=0; i < req.settings.fileNameFilters.length; i++) {
            if (file.toLowerCase().indexOf(req.settings.fileNameFilters[i].toLowerCase()) !== -1) return true;
          }
          return false;
        });
      }
      // convert to FileObjects.File objects, rejecting non-file-types
      files.forEach(file => { 
        let fileObj = new FileObjects.File(path, file);
        if (fileObj.stats.isFile()) workFiles.push(fileObj); 
      });
      // filter on last modified
      if (req.settings['lastModified']) {
        workFiles = workFiles.filter(file => { return file.lastModified >= req.settings.lastModified; });
      }
      // perform sorting on datetime
      if ( workFiles.length > 1 ) {
        workFiles = workFiles.sort((a, b) => {
          return a.lastModified < b.lastModified;
        });
      }
    }

    return this.formatResult(req, workFiles);
  }
  
  /**
   * @description formats file list to return to caller, including paging of results
   * @param {Request} req request object
   * @param {File[]} files list of File objects to handle
   * @see FileObjects.File
   */
  formatResult(req, files) {
    let results = {
      files : [],
      hasMore: false
    };

    if (req.settings.limit < files.length) {
      if (!req.settings['session']) {
        Paging.createPagingSession(req);
      }
      if (req.settings.session.offset >= files.length) {
        throw new Error('Offset to high, could not apply versus working list');
      }

      let endIndex = req.settings.limit + req.settings.session.offset;
      if (endIndex >= files.length) {
        endIndex = files.length;
      } else {
        results.hasMore = true;
      }
      
      files.slice(req.settings.session.offset, endIndex).forEach(file => { results.files.push(new FileObjects.FileContent(file)); });
      
      if (results.hasMore) {
        results.nextRecordsUrl = '/api/v1/GetFiles/' + req.settings.session.id + '/' + endIndex;
        if (req.settings.limit !== req.config.site.limit) {
          results.nextRecordsUrl += '?limit=' + req.settings.limit;
        }
      }
      
      if (!req.settings.session['data']) {
        req.settings.session.data = files;
        Paging.writeSessionData(req);
      }
    } else {
       files.forEach(file => { results.files.push(new FileObjects.FileContent(file)); });
    }    
    return results;
  }

  /**
   * @description Handles writing files to remote path.
   * @param {*} req 
   */
  postFiles(req) {

    if (req.body.hasOwnProperty('files') && Array.isArray(req.body['files']))  {
      let path = Utils.getPathFromSettings(req);
      let result = {
        files: [],
        hasErrors: false
      };
    
      req.body.files.forEach(file => {
        try {
          switch(file.type.toLowerCase()) {
            case 'text' :
              fs.writeFileSync(path + file.name, file.content);
              result.files.push({name: file.name, hasError: false});
              break;
            default:
              result.hasErrors = true;
              result.files.push({name: file.name, hasError: true, message: 'file type [' + file.type + '] is unknown, file was not processed'});
              break;
          }
        } catch (error) {
          result.hasErrors = true;
          result.files.push({name: file.name, hasError: true, message: error.message});
        }
      });
      
      return result;

    } else {
      throw new Error('Missing [files] parameter');
    }
  }
}

module.exports = new FileHandler();