const config = require('config');
const URL = require('url');

const logger = require('./utils/logger');
const keygen = require('./utils/keygen');

const uploadJSON = require('./pipeline/upload-json');
const screenshot = require('./pipeline/screenshot');
const compress = require('./pipeline/compress');
const uploadImages = require('./pipeline/upload-images');


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
 * @param {object} check - a JSON object describing the check, assertions,
 *    results, and so on. Uploaded to S3 and used to populate the screenshot.
 *
 * @returns {Promise}
 *
 * @resolves {object} results
 * @resolves {string} results.json_url - S3 URL to JSON
 * @resolves {string} results.image_urls - S3 URL to image
 */
module.exports = function(check) {
  const key = keygen(check.id);
  const widths = [100];

  return uploadJSON({ check, key })
    .then(results => {
      // Massage the JSON url into data for the rest of the pipeline
      var jsonURL = results.json_url;
      var uri = buildEmissaryURI(check.id, jsonURL);

      // Take an screenshot
      return screenshot({ key, uri, widths, json_url: jsonURL });
    })
    // Upload the screenshots to s3
    .then(uploadImages)
    // Format the response for the server
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
};
