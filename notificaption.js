const assign = require('object-assign');
const AWS = require('aws-sdk');
const config = require('config');
const logger = require('./utils/logger');
const Nightmare = require('nightmare');
const vo = require('vo');
const URL = require('url');

const nightmare = Nightmare({
  show: false,
  width: 700,
  height: 768,
  waitTimeout: 3000 // milliseconds
});

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

function *screenshot(data) {
  const checkData = data.check;
  const checkID = checkData.id;
  const jsonURI = data.json;
  const uri = buildEmissaryURI(checkID, jsonURI);

  logger.info(`[${checkID}] Requesting screenshot from ${uri}`);

  const dimensions = yield nightmare
    .viewport(700, 1) // Reset the viewport
    .goto(uri)
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
    .screenshot();

  return imageBuffer;
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
    json: data.json,
    image: data.image
  });
}

module.exports = {

  /**
   * @param {object} checkData
   *
   * @returns {object} results
   * @returns {string} results.json - S3 URL to JSON
   * @returns {string} results.image - S3 URL to image
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