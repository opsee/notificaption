const config = require('config');
const Imagemin = require('imagemin');
const logger = require('./logger');
const Nightmare = require('nightmare');
const vo = require('vo');

function *capture(opts) {
  const imageWidth = opts.width || config.defaultWidth;

  const nightmare = Nightmare({
    show: false,
    width: imageWidth,
    height: 1, // a large initial viewport can result in oversized screenshots
    waitTimeout: 3000 // milliseconds
  });

  const dimensions = yield nightmare
    .goto(opts.uri)
    .wait('.js-screenshot-results')
    .evaluate(() => {
      const body = document.querySelector('body');
      return {
        height: body.scrollHeight,
        width: body.scrollWidth
      };
    });

  const imageBuffer = yield nightmare
    .viewport(dimensions.width, dimensions.height + 50) // Magic number??
    .wait(500) // Required, otherwise the viewport will be distorted
    .screenshot()
    .end();

  return {
    buffer: imageBuffer,
    key: `${opts.key}_${imageWidth}`
  };
}

function compress(data, done) {
  const imageBuffer = data.buffer;

  new Imagemin()
    .src(imageBuffer)
    .use(Imagemin.optipng({ optimizationLevel: 3 }))
    .run((err, results) => {
      const compressedBuffer = results[0].contents;
      const delta = imageBuffer.length - compressedBuffer.length;
      logger.info(`Compression delta: ${delta / 1024}kB (${imageBuffer.length / 1024}kB - ${compressedBuffer.length / 1024}kB)`);
      return done(err, {
        key: data.key,
        buffer: compressedBuffer
      });
    });
}

/**
 * @param {object} opts
 * @param {string} opts.uri - required; the URI to screenshot
 * @param {number} opts.width - optional; screenshot width in px
 *
 * @returns {Buffer} - the screenshot as a base64-encoded imageBuffer
 */
module.exports = (opts, done) => {
  if (!opts.uri) throw new Error('Missing uri parameter');

  return vo(capture, compress)(opts, done);
};