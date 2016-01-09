const notificaption = require('./notificaption');
const restify = require('restify');

const server = restify.createServer({
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

server.listen(8888, () => {
  console.log('%s listening at %s', server.name, server.url);
});
