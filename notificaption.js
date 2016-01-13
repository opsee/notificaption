const AWS = require('aws-sdk');
const config = require('config');
const fs = require('fs');
const logger = require('./utils/logger');
const Path = require('path');
const Readable = require('stream').Readable;
const URL = require('url');
const webshot = require('webshot');

const s3 = new AWS.S3({
  params: {
    Bucket: config.s3.bucket
  }
});

/**
 * Writes the POSTed check data to a .json file for to populate the /check
 * page in Emissary.
 *
 * @param {object} checkData
 * @returns {Promise}
 */
function dumpToFile(checkData) {
  const checkID = checkData.id;
  const filename = `${checkID}.json`;
  const filePath = Path.resolve(`./tmp/checks/${filename}`);

  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(checkData), err => {
      if (err) reject(err);
      else resolve(checkData);
    });
  });
}

/**
 * Navigates to Emissary in a headless browser and grabs a screenshot of the
 * /check page. The UI is populated from a JSON file containing the data POSTed
 * to the notificaption service.
 *
 * @param {String} checkID
 * @returns {Promise}
 */
function generateScreenshot(checkData) {
  const checkID = checkData.id;
  const emissaryConfig = config.emissary;
  const checkPath = [emissaryConfig.basePath, checkID, 'screenshot'].join('/');

  const uri = URL.format({
    protocol: emissaryConfig.protocol,
    hostname: emissaryConfig.hostname,
    port: emissaryConfig.port,
    pathname: checkPath
  });

  logger.info(`Generating screenshot for check ${checkID} from Emissary running at ${uri}`);

  const webshotOpts = {
      screenSize: {
        width: 700,
        height: 480
      },
      shotSize: {
        width: 700,
        height: 'all'
      },
      takeShotOnCallback: true
    };

  return new Promise((resolve, reject) => {
    webshot(uri, null, webshotOpts, (err, stream) => {
      if (err) {
        reject(err);
      } else {
        logger.info(`Generated screenshot for check ${checkID}`);
        const readableStream = new Readable().wrap(stream);
        resolve({
          check: checkData,
          imageBuffer: readableStream
        });
      }
    });
  });
}

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
 * @param {Buffer} imageBuffer
 * @returns {Promise}
 */
function uploadScreenshot(data) {
  const checkID = data.check.id;
  logger.info(`Uploading screenshot for check ${checkID} to S3 bucket ${config.s3.bucket}`);

  return new Promise((resolve, reject) => {
    s3.upload({
      Body: data.imageBuffer,
      ContentEncoding: 'base64',
      ContentType: 'image/jpeg',
      Key: generateS3Key(data.check.id)
    })
    .send((err, result) => {
      if (err) {
        logger.info(`Error uploading screenshot for check ${checkID}`);
        reject(err);
      } else {
        logger.info(`Uploaded screenshot for check ${checkID}`);
        resolve({ uri: result.Location });
      }
    });
  });
}

/**
 * @param {object} params
 * @returns {Promise}
 */
function screenshot(params) {
  return dumpToFile(params)
    .then(generateScreenshot)
    .then(uploadScreenshot);
}

module.exports = {
  screenshot: screenshot
};
