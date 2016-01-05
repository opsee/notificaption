var restify = require('restify');

function respond(req, res, next) {
  res.send({
    hello: req.params.name
  });
  next();
}

var server = restify.createServer({
  name: 'notificaption'
});

server.get('/hello/:name', respond);

server.listen(8888, function() {
  console.log('%s listening at %s', server.name, server.url);
});
