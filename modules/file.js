
const fs = require('fs');

class File {
  constructor(path, name) {
    this.name = name;
    this.path = path + name;
    this.stats = fs.statSync(this.path);
    this.lastModified = Date.parse(this.stats.mtime);
    this.created = Date.parse(this.stats.ctime);
  }
}

class FileContent {
  constructor(file) {
    this.name = file.name;
    this.type = 'text';  
    this.content = this.normalizeText(fs.readFileSync(file.path, {encoding:'utf-8'}))
  }

  normalizeText(text) {
    return text.replace(/\>[\s]+\</g, '><');
  }
}

module.exports = {
  File : File,
  FileContent: FileContent
};