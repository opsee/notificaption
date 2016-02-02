const _ = require('lodash');
const uploadUtils = require('../utils/upload');
const AWS = require('aws-sdk');
const config = require('config');
const Promise = require('bluebird');

const s3 = new AWS.S3({
  params: {
    Bucket: config.s3.bucket
  }
});

function upload(key, imageBuffer) {
  return new Promise((resolve, reject) => {
    s3.upload({
      Key: `${key}.png`,
      Body: imageBuffer,
      ContentEncoding: 'base64',
      ContentType: 'image/png'
    }).send((err, result) => {
      if (err) return reject(err);
      var url = result.Location;
      resolve(url)
    });
  });
}

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
  const widths = config.widths;

  var uploadPromises = [];

  for (var i = 0; i < widths.length; i++) {
    var width = widths[i];
    var key = `${data.key}_${width}`;
    var imageBuffer = data.screenshots[width];
    uploadPromises.push(upload(key, imageBuffer));
  }

  return Promise.all(uploadPromises)
    .then(results => {
      var response = _.assign({}, data);

      for (var i = 0; i < results.length; i++) {
        var width = widths[i];
        var url = results[i];
        response.screenshots[width].url = url;
      }

      return response;
    });
}