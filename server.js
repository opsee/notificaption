const logger = require('./utils/logger');
const notificaption = require('./notificaption');
const restify = require('restify');

const server = restify.createServer({
  name: 'notificaption'
});

server.use(restify.bodyParser({ mapParams: true }));
server.use(restify.CORS());

function postScreenshot(req, res, next) {
  const checkID = req.params.id;
  logger.info(`Screenshot request for check ${checkID}`);

  notificaption.screenshot(req.params)
    .then(resp => {
      res.send({
        imageURL: resp.imageURL
      });
      next();
    })
    .catch(err => {
      logger.error(err);
      next(err);
    });
}

server.get('/', (req, res, next) => {
  logger.info('ping');
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
  logger.info('%s server %s listening at %s', process.env.NODE_ENV, server.name, server.url);
});
