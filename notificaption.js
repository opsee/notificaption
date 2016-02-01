const assign = require('object-assign');
const AWS = require('aws-sdk');
const config = require('config');
const logger = require('./utils/logger');

const vo = require('vo');
const URL = require('url');
const Screenshot = require('./utils/screenshot');

const s3 = new AWS.S3({
  params: {
    Bucket: config.s3.bucket
  }
});

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

function screenshot(data, done) {
  const checkData = data.check;
  const checkID = checkData.id;
  const jsonURI = data.json;
  const uri = buildEmissaryURI(checkID, jsonURI);

  logger.info(`[${checkID}] Requesting screenshot from ${uri}`);
  return Screenshot({
    uri: uri
  }, done);
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

  const upload = {
    Body: JSON.stringify(checkData),
    Key: `${key}.json`,
    ContentType: 'application/json'
  };

  s3.upload(upload)
    .send((err, result) => {
      if (err) return done(err);

      logger.info(`[${checkData.id}] Uploaded JSON to ${result.Location}`);

      return done(null, {
        key: key,
        check: checkData,
        json: result.Location
      });
    });
}

/*
 * @param {object} data
 * @param {object} data.check
 * @param {string} data.key
 * @param {string} data.json
 */
function uploadScreenshot(data, done) {
  vo(screenshot)(data, (err, imageBuffer) => {
    if (err) return done(err);

    s3.upload({
      Key: data.key,
      Body: imageBuffer,
      ContentEncoding: 'base64',
      ContentType: 'image/jpeg'
    })
    .send((error, response) => {
      if (error) return done(error);

      logger.info(`[${data.check.id}] Uploaded image to ${response.Location}`);

      return done(null, assign({}, data, {
        image: response.Location
      }));
    });
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
    image_urls: {
      default: data.image
    }
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

      const pipeline = vo(uploadData, uploadScreenshot, formatResponse);

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