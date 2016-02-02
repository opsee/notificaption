var pipeline = require('../pipeline');
var check = require('./check.json');

pipeline(check)
  .then(response => console.log(response))
  .catch(err => console.error(err));