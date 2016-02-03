var pipeline = require('../pipeline');
var check = require('./check.json');
var key = 'testing';

pipeline({ key, check })
  .then(response => console.log(response))
  .catch(err => console.error(err));