/**
 * @description module manages result paging.
 */

const fs = require('fs');
const Uuid = require('uuid/v1');
const FileObjects = require('./file');

class Paging {
  constructor() {
    this.createPagingSession = this.createPagingSession.bind(this);
    this.readSessionData = this.readSessionData.bind(this);
    this.writeSessionData = this.writeSessionData.bind(this);
    this.cleanupSessions = this.cleanupSessions.bind(this);
  }

  createPagingSession(req) {
    req.settings.session = {
      id: Uuid(),
      offset: 0
    };

    if (!fs.existsSync(req.config.site.general.sessions)) {
      fs.mkdirSync(req.config.site.general.sessions);
    }
  }

  /**
   * @description Extends the settings.session with keys path and data. 
   *              Key data will contain parsed object of stored session contents, if found.
   *              If no sessions found, data will be null => session was expired.
   */
  readSessionData(req) {
    this.cleanupSessions(req);

    if (!req.settings.session['path'] || req.settings.session.path === null) {
      req.settings.session.path = req.config.site.general.sessions + req.settings.session.id + '.txt';
      req.settings.session.data = null;
    }
    
    if (fs.existsSync(req.settings.session.path)) {
      req.settings.session.data = JSON.parse(fs.readFileSync(req.settings.session.path, {encoding: 'utf-8'}));
    }
  }

  /**
   * @description Writes settings.session.data to file.
   */
  writeSessionData(req) {
    if (!req.settings.session['data'])
      return;
    
    if (!req.settings.session['path'] || req.settings.session.path === null) {
      req.settings.session.path = req.config.site.general.sessions + req.settings.session.id + '.txt';
    }

    if (typeof req.settings.session.data === 'object' 
    && Array.isArray(req.settings.session.data)
    && req.settings.session.data.length > 0) {
      fs.writeFileSync(req.settings.session.path, JSON.stringify(req.settings.session.data), {flag: 'w'});
    }
  }

  /**
   * @description Removes expired session files. Sessions are expired after [config.site.general.sessionDuration] minutes.
   */
  cleanupSessions(req) {
    // get list of session files
    let files = fs.readdirSync(req.config.site.general.sessions);
    // extend with timestamps
    let workFiles = [];
    files.forEach(file => { workFiles.push(new FileObjects.File(req.config.site.general.sessions, file)); });
    // filter out expired ones and delete them
    let offsetMillisec = parseInt(req.config.site.general.sessionDuration) * 1000 * 60;
    workFiles.filter(file => { return (file.created + offsetMillisec) < Date.now(); }).forEach(file => { fs.unlinkSync(file.path); });
  }
}

module.exports = new Paging();