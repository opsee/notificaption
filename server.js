const notificaption = require('./notificaption');
const config = require('config');
const restify = require('restify');

var server = restify.createServer({
  name: 'notificaption'
});

server.use(restify.bodyParser({ mapParams: true }));
server.use(restify.CORS());

function postScreenshot(req, res, next) {
  notificaption.screenshot(req.params)
    .then(resp => {
      res.send({ uri: resp.uri });
      next();
    })
    .catch(err => {
      next(err);
    });
}

server.post('/screenshot', postScreenshot);

server.get(/\/checks\/?.*/, restify.serveStatic({
  directory: './tmp'
}));

server.listen(8888, function() {
  console.log('%s listening at %s', server.name, server.url);
});
