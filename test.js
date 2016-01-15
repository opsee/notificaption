const AWS = require('aws-sdk');
const config = require('config');
const logger = require('./utils/logger');
var Nightmare = require('nightmare');
var vo = require('vo');
const URL = require('url');

const s3 = new AWS.S3({
  params: {
    Bucket: "opsee-notificaption-images"
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
function buildEmissaryURI(checkID) {
  const emissaryConfig = config.emissary;
  const checkPath = [emissaryConfig.basePath, checkID, 'screenshot'].join('/');

  return URL.format({
    protocol: emissaryConfig.protocol,
    hostname: emissaryConfig.hostname,
    port: emissaryConfig.port,
    pathname: checkPath
  });
}

/**
 * @param {object} checkData
 * @param {String} checkData.id
 * @returns {Buffer}
 */
function *screenshot(checkData) {
  const checkID = checkData.id;
  const uri = buildEmissaryURI(checkID);

  logger.info(`Generating screenshot for check ${checkID} from Emissary running at ${uri}`);

  const nightmare = Nightmare();
  const screenshot = yield nightmare
    .goto(uri)
    .wait(1500)
    .screenshot()

  logger.info(`Generated screenshot for check ${checkID}`);

  return {
    check: checkData,
    imageBuffer: screenshot
  };
}

/**
 * @param {object} data.checkData
 * @param {String} data.checkData.id
 * @param {Buffer} data.imageBuffer
 * @returns {Promise}
 */
function upload(data, done) {
  const checkID = data.check.id;

  logger.info(`Uploading screenshot for check ${checkID} to S3 bucket ${config.s3.bucket}`);

  s3.upload({
    Body: data.imageBuffer,
    ContentEncoding: 'base64',
    ContentType: 'image/jpeg',
    Key: generateS3Key(checkID)
  })
  .send((err, result) => {
    if (err) return done(err);
    return done(null, result);
  });
}

module.exports = {
  test: function(checkData) {
    return new Promise((resolve, reject) => {
      vo(screenshot, upload)(checkData, (err, result) => {
        if (err) reject(err);
        else resolve({ uri: result.Location });
      });
    });
  }
}