const config = require('config');
const logger = require('./utils/logger');
const notificaption = require('./notificaption');
const restify = require('restify');
const yeller = require('./utils/yeller');

const server = restify.createServer({
  name: 'notificaption'
});

server.use(restify.bodyParser({ mapParams: true }));
server.use(restify.CORS());

/**
  * @api POST /screenshot Generate a screenshot
  * @apiName PostScreenshot
  *
  * @apiParam {Object} check - A JSON object detailing the check, associated
  *   assertions, and so on. Used to populate the screenshot page in Emissary.
  *
  * @apiSuccess {String} json_url - An URL to the JSON (stored in S3)
  * @apiSuccess {Object} image_urls - Multiple sizes of the image, keyed by width
  *
  * @apiSucessExample {json} Success-Response:
  *     HTTP/1.1 200 OK
  *     {
  *       "json_url": "https://opsee-notificaption-images.s3.amazonaws.com/21G057gL7oNtKKDW64g9Dl_1454339476821.json",
  *       "image_urls": {
  *         "default": "https://opsee-notificaption-images.s3.amazonaws.com/21G057gL7oNtKKDW64g9Dl_1454339476821"
  *       }
  *     }
  */
server.post('/screenshot', (req, res, next) => {
  notificaption.screenshot(req.params)
    .then(resp => {
      res.send(resp);
      next();
    })
    .catch(err => {
      logger.error(err);
      yeller.report(err);
      next(err);
    });
});

/**
 * @api GET /health Health check
 * @apiDescription Health check endpoint, mostly for AWS.
 */
server.get('/health', (req, res, next) => {
  res.send(200, { status: 'ok' });
  next();
});

server.listen(9099, () => {
  logger.info('%s server %s listening at %s', config.util.getEnv('NODE_ENV'), server.name, server.url);
});
