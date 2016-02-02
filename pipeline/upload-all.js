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

  const uploadPromises = config.widths.map((width, i) => {
    var key = `${data.key}_${width}`;
    var imageBuffer = data.screenshots[width];
    return uploadUtils.uploadImage(key, imageBuffer);
  });

  return Promise.all(uploadPromises)
    .then(results => {
      var response = _.assign({}, data);

      for (var i = 0; i < results.length; i++) {
        var width = widths[i];
        var url = results[i];
        response.screenshots[width].url = url;
      }

      response.screenshots['default'] = {};
      response.screenshots['default'].url = results[0];

      return response;
    });
}