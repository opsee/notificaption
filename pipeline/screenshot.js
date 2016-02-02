const _ = require('lodash');
const config = require('config');
const logger = require('../utils/logger');
const Nightmare = require('nightmare');
const vo = require('vo');

/**
 * @param {object} opts
 * @param {String} opts.uri
 * @param {number} opts.width
 * @param {String} opts.key
 */
function *capture(opts) {

  logger.info('opts', opts);

  const nightmare = Nightmare({
    show: false,
    // width: imageWidth,
    // height: 1, // a large initial viewport can result in oversized screenshots
    // waitTimeout: 3000 // milliseconds
  });

  var imageWidth = opts.widths[0] || config.defaultWidth;
  var key = `${opts.key}_${imageWidth}`;

  logger.info(`Generating ${key} from ${opts.uri}`);

  yield nightmare
    .goto(opts.uri)
    .wait('.js-screenshot-results')

  var dimensions = yield nightmare
    .evaluate(() => {
      var body = document.querySelector('body');
      return {
        height: body.scrollHeight,
        width: body.scrollWidth
      };
    });

  var imageBuffer = yield nightmare
    .viewport(dimensions.width, dimensions.height + 30) // Magic number??
    .wait(500) // Required, otherwise the viewport will be distorted
    .screenshot()

  yield nightmare.end();

  return _.assign({}, opts, {
    screenshots: {
      default: {
        buffer: imageBuffer,
        key: key
      }
    }
  });
}

/**
 * @param {object} opts
 * @param {string} opts.key
 * @param {string} opts.uri - required; the URI to screenshot
 * @param {number} opts.widths - optional; an array of screenshot widths in px
 *
 * @resolves {object} result
 * @resolves {string} result.key - same as opts.key
 * @resolves {Buffer} results.buffer - the screenshot as a base64-encoded imageBuffer
 */
module.exports = (opts, done) => {
  if (!opts.uri) throw new Error('Missing uri parameter');
  if (!opts.widths) throw new Error('Missing width parameter');
  if (!opts.key) throw new Error('Missing key parameter');


  return new Promise((resolve, reject) => {
    vo(capture)(opts, (err, result) => {
      // console.log('done!', err, result);
      if (err) reject(err);
      else resolve(result);
    });
  });
};