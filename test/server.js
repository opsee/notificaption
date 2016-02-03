const config = require('config');
const supertest = require('supertest');

const check = require('./check.json');
const server = require('../server.js');

server.run();

const request = supertest('http://localhost:' + config.server.port);
request.post('/screenshot')
  .send(check)
  .expect(200)
  .end(function(err, res){
    if (err) throw err;
    console.log(res.body);
    process.exit();
  });