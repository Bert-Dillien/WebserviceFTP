const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');
const FilesRoute = require('./routes/files');
const RequestHandler = require('./modules/requestHandler');
const fs = require('fs');
const Utils = require('./modules/utils');

const httpPort = 7592;
const httpsPort = 7593;

const app = express();

app.use(bodyParser.json({ limit: '100mb' })); // for parsing application/json

app.get('/api/v1/GetFiles', [RequestHandler.startRequest, FilesRoute.getFiles, RequestHandler.logRequest, RequestHandler.sendResponse]);
app.get('/api/v1/GetFiles/:sessionId/:offset', [RequestHandler.startRequest, FilesRoute.getFiles, RequestHandler.logRequest, RequestHandler.sendResponse]);
app.post('/api/v1/PostFiles', [RequestHandler.startRequest, FilesRoute.postFiles, RequestHandler.logRequest, RequestHandler.sendResponse]);

// Setup http
var httpServer = http.createServer(app);
console.log('Server is listening on port ' + httpPort)
httpServer.listen(httpPort);

// Setup https
try {
  const config = Utils.getConfig('./config.ini');

  const privateKey  = fs.readFileSync(config.security.sslCertificateKeyFile, 'utf8');
  const certificate = fs.readFileSync(config.security.sslCertificateFile, 'utf8');
  const chain = fs.readFileSync(config.security.sslCertificateChainFile, 'utf8');

  var credentials = {key: privateKey, ca: chain, cert: certificate};
  
  //var httpsServer = https.createServer(credentials, app);
  console.log('Server is listening on secure port ' + httpsPort)
  httpsServer.listen(httpsPort);
} catch (err) {
  console.error('Failed to setup https:');
  console.error(err);
}