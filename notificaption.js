var restify = require('restify');

function postScreenshot(req, res, next) {
  res.send(req.body);
  next();
}

var server = restify.createServer({
  name: 'notificaption'
});

server.use(restify.bodyParser({ mapParams: true }));

server.post('/screenshot', postScreenshot);

server.listen(8888, function() {
  console.log('%s listening at %s', server.name, server.url);
});
