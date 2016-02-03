const check = require('./check.json');
const supertest = require('supertest');
const server = require('../server.js');

server.run();

const request = supertest('http://localhost:9099');
request.post('/screenshot')
  .send(check)
  .expect(200)
  .end(function(err, res){
    if (err) throw err;
    console.log(res.body);
    process.exit();
  });