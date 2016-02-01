const assign = require('object-assign');
const config = require('config');
const logger = require('./utils/logger');

const vo = require('vo');
const URL = require('url');
const screenshot = require('./utils/screenshot');
const uploadUtils = require('./utils/upload');

/**
 * Returns a unique identifier for screenshots that are uploaded to S3.
 * The ID is composed of the check ID of the screenshot and the current time
 * (in milliseconds). The timestamp ensures that multiple check failures will
 * not overwrite one another.
 *
 * @param {String} checkID
 * @returns {String}
 */
function generateS3Key(checkID) {
  const now = new Date().getTime();
  return `${checkID}_${now}`;
}

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
 * @param {object} data.check
 *
 * @returns {object} results
 * @returns {object} results.check
 * @returns {string} results.key
 * @returns {string} results.json
 */
function uploadData(data, done) {
  const checkData = data.check;
  const key = generateS3Key(checkData.id);

  uploadUtils.uploadJSON(key, checkData)
    .then(result => {
      return done(null, {
        key: key,
        check: checkData,
        json: result.url
      });
    })
    .catch(err => {
      logger.error(err);
      return done(err);
    });
}

/**
 * @param {Object} params
 * @param {String} params.key
 * @param {String} params.uri
 * @param {number} params.width
 */
const uploadScreenshot = vo(screenshot, (result, done) => {
  const imageBuffer = result.buffer;
  const key = result.key;

  uploadUtils.uploadImage(key, imageBuffer)
    .then(uploadResult => {
      return done(null, uploadResult.url);
    })
    .catch(uploadErr => {
      logger.error(uploadErr);
      return done(uploadErr);
    });
});

/*
 * @param {object} data
 * @param {object} data.check
 * @param {string} data.key
 * @param {string} data.json
 */
function uploadScreenshots(data, done) {
  const key = data.key;
  const checkData = data.check;
  const checkID = checkData.id;
  const jsonURI = data.json;

  const uri = buildEmissaryURI(checkID, jsonURI);

  vo({
    small: uploadScreenshot({ key, uri, width: 320 }),
    large: uploadScreenshot({ key, uri, width: 740 })
  })((err, imageURLS) => {
    if (err) return done(err);

    return done(null, assign({}, data, {
      image_urls: imageURLS
    }));
  });
}

/*
 * @param {object} data
 * @param {object} data.check
 * @param {string} data.key
 * @param {string} data.json
 * @param {string} data.image
 */
function formatResponse(data, done) {
  return done(null, {
    json_url: data.json,
    image_urls: data.image_urls
  });
}

module.exports = {

  /**
   * @param {object} checkData - a JSON object describing the check, assertions,
   *    results, and so on. Uploaded to S3 and used to populate the screenshot.
   *
   * @returns {object} results
   * @returns {string} results.json_url - S3 URL to JSON
   * @returns {string} results.image_urls - S3 URL to image
   */
  screenshot(checkData) {
    return new Promise((resolve, reject) => {
      logger.info(`[${checkData.id}] Received screenshot request`);

      const pipeline = vo(uploadData, uploadScreenshots, formatResponse);

      pipeline.catch(err => {
        logger.error(err);
        reject(err);
      });

      pipeline({
        check: checkData
      }, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }
};