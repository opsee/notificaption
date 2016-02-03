const config = require('config');
const URL = require('url');

const logger = require('./utils/logger');

const uploadJSON = require('./pipeline/upload-json');
const screenshot = require('./pipeline/screenshot-all');
const compress = require('./pipeline/compress');
const uploadImages = require('./pipeline/upload-all');

/**
 * @param {String} checkID
 * @returns {String}
 */
function buildEmissaryURI(checkID, jsonURI) {
  const emissaryConfig = config.emissary;
  const checkPath = [emissaryConfig.basePath, checkID, 'screenshot'].join('/');

  return URL.format({
    protocol: emissaryConfig.protocol,
    hostname: emissaryConfig.hostname,
    port: emissaryConfig.port,
    pathname: checkPath,
    query: {
      json: jsonURI
    }
  });
}

/**
 * @param {object} data
 * @param {string} key - a base key for S3 URLs (check ID + timestamp)
 * @param {object} data.check - a JSON object describing the check, assertions,
 *    results, and so on. Uploaded to S3 and used to populate the screenshot.
 *
 * @returns {Promise}
 *
 * @resolves {object} results
 * @resolves {string} results.json_url - S3 URL to JSON
 * @resolves {string} results.image_urls - S3 URL to image
 */
module.exports = function(data) {
  const check = data.check;
  const key = data.key;

  return uploadJSON({ check, key })
    .then(results => {
      var uri = buildEmissaryURI(check.id, results.json_url);
      const widths = config.widths;

      return screenshot({ key, uri, widths,
        json_url: results.json_url
      });
    })
    .then(uploadImages)
    .then(results => {
      var jsonURL = results.json_url;

      var images = {};
      for (var widthKey in results.screenshots) {
        var screenshot = results.screenshots[widthKey];
        var screenshotURL = screenshot.url;
        images[widthKey] = screenshotURL;
      }

      return {
        images: images,
        json_url: jsonURL
      };
    });
}