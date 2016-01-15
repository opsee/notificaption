const AWS = require('aws-sdk');
const config = require('config');
const fs = require('fs');
const logger = require('./utils/logger');
const Nightmare = require('nightmare');
const Path = require('path');
const Readable = require('stream').Readable;
const vo = require('vo');
const URL = require('url');

const s3 = new AWS.S3({
  params: {
    Bucket: "opsee-notificaption-images"
  }
});

const nightmare = Nightmare({
  show: false,
  width: 1024,
  height: 768
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
 * Writes the POSTed check data to a .json file for to populate the /check
 * page in Emissary.
 *
 * @param {object} checkData
 * @param {function} done
 *
 * @returns {object} data
 * @returns {object} data.check
 */
function dumpToFile(checkData, done) {
  const checkID = checkData.id;
  const filename = `${checkID}.json`;
  const filePath = Path.resolve(`./tmp/checks/${filename}`);

  fs.writeFile(filePath, JSON.stringify(checkData), err => {
    if (err) done(err);
    else done(null, { check: checkData });
  });
}

/**
 * @param {object} checkData
 * @param {String} checkData.id
 * @returns {Buffer}
 */
function *screenshot(data) {
  const checkData = data.check;
  const checkID = checkData.id;
  const uri = buildEmissaryURI(checkID);

  logger.info(`Generating screenshot for check ${checkID} from Emissary running at ${uri}`);

  const dimensions = yield nightmare
    .goto(uri)
    .wait('body')
    .evaluate(function() {
      const body = document.querySelector('body');
      return {
        height: body.scrollHeight,
        width:body.scrollWidth
      }
    });

  const screenshot = yield nightmare
    .viewport(dimensions.width, dimensions.height + 50)
    .wait(1000)
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
  screenshot: function(checkData) {
    return new Promise((resolve, reject) => {
      vo(dumpToFile, screenshot, upload)(checkData, (err, result) => {
        if (err) reject(err);
        else resolve({ uri: result.Location });
      });
    });
  }
}