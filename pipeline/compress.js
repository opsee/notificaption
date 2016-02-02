const Imagemin = require('imagemin');
const logger = require('../utils/logger');

/**
 * @param {object} opts
 * @param {Buffer} opts.buffer
 * @param {String} opts.key
 */
module.exports = (data) => {
  logger.info(`Compressing ${data.key}`);

  const imageBuffer = data.buffer;

  return new Promise((resolve, reject) => {
    new Imagemin()
      .src(imageBuffer)
      .use(Imagemin.optipng({ optimizationLevel: 3 }))
      .run((err, results) => {
        if (err) return reject(err);

        const compressedBuffer = results[0].contents;

        const rawLength = imageBuffer.length / 1024;
        const compressedLength = compressedBuffer.length / 1024;
        const delta = rawLength - compressedLength;
        logger.info(`Compression delta: ${delta}kB (${rawLength}kB - ${compressedLength}kB)`);

        resolve({
          key: data.key,
          buffer: compressedBuffer
        });
    });
  });
}