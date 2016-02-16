const config = require('config');
const logger = require('./utils/logger');
const restify = require('restify');
const yeller = require('./utils/yeller');
const generateURLs = require('./utils/generate-urls');
const keygen = require('./utils/keygen');
const uploadUtils = require('./utils/upload');

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
  const check = req.params;
  logger.info(check);

  const checkID = check.check_id;
  if (!checkID) {
    return next(new restify.InvalidArgumentError('Must provide check_id'));
  }

  // Generate a base key for S3 URLs
  const key = keygen(checkID);

  uploadUtils.uploadJSON(key, check)
    .then(result => {
      if (!result.url) {
        throw new Error('Malformed S3 response: ' + result);
      }

      res.send({ json_url: result.url });
      next();
    })
    .catch(err => {
      logger.error('????????');
      logger.error(err);
      yeller.report(err);
      res.send(500);
      next();
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

module.exports = {
  run() {
    server.listen(config.server.port, () => {
      logger.info('%s server %s listening at %s', config.util.getEnv('NODE_ENV'), server.name, server.url);
      logger.info(config);
    });
  }
}

