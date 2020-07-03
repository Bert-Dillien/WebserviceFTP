

var express = require('express');
var router = express.Router();

// defines all routes
router.get('api/v1/GetFiles/:modifiedFrom', function(req, res){
  fileGetter.getFiles(req, res);
});