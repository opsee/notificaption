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

server.get('/', (req, res, next) => {
  res.send('hello world');
  next();
});

server.get('/health', (req, res, next) => {
  res.send(200);
  next();
});

server.post('/screenshot', postScreenshot);

server.get(/\/checks\/?.*/, restify.serveStatic({
  directory: './tmp'
}));

server.listen(9099, () => {
  console.log('%s listening at %s', server.name, server.url);
});
