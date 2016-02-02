const _ = require('lodash');
const uploadUtils = require('../utils/upload');
const AWS = require('aws-sdk');
const config = require('config');

const s3 = new AWS.S3({
  params: {
    Bucket: config.s3.bucket
  }
});

/**
 * @param {object} data
 * @param {object} data.check
 *
 * @returns {object} results
 * @returns {object} results.check
 * @returns {string} results.key
 * @returns {string} results.json
 */
module.exports = function(data) {
  const widthKey = '400'; // FIXME

  const images = data.screenshots;
  const image = images[widthKey];

  const key = image.key;
  const imageBuffer = image.buffer;

  return new Promise((resolve, reject) => {
    s3.upload({
      Key: `${key}.png`,
      Body: imageBuffer,
      ContentEncoding: 'base64',
      ContentType: 'image/png'
    }).send((err, result) => {
      if (err) return reject(err);

      var url = result.Location;
      var response = _.assign({}, data);

      response.screenshots[widthKey].url = url;

      return resolve(response);
    });
  });
}