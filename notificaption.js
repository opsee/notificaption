const AWS = require('aws-sdk');
const config = require('config');
const fs = require('fs');
const logger = require('./utils/logger');
const Nightmare = require('nightmare');
const Path = require('path');
const vo = require('vo');
const URL = require('url');

const s3 = new AWS.S3({
  params: {
    Bucket: config.s3.bucket
  }
});

const nightmare = Nightmare({
  show: false,
  width: 700,
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
 * TODO can we do away with this and have Emissary just use the S3 url? Memory
 * might fill up eventually with this approach (unless we delete the file
 * after the screenshot is taken, but that might get SUPER flakey if the
 * screenshot is only contingent on a wait()...)
 *
 * @param {object} checkData
 * @param {function} done
 *
 * @returns {object} data
 * @returns {object} data.check
 */
function dumpToFile(checkData, done) {
  const checkID = checkData.id;
  const s3Key = generateS3Key(checkID);
  const filename = `${s3Key}.json`;
  const filePath = Path.resolve(`./tmp/checks/${filename}`);

  logger.info(`Dumping to file as ${filePath}`);

  fs.writeFile(filePath, JSON.stringify(checkData), err => {
    if (err) {
      logger.error(`Error dumping to file as ${filePath}`);
      done(err);
    } else {
      logger.info(`Dumped to file as ${filePath}`);
      done(null, {
        check: checkData,
        filename: s3Key
      });
    }
  });
}

/**
 * @param {object} data
 * @param {String} data.filename
 * @param {object} data.check
 * @param {String} data.check.id
 * @returns {Buffer}
 */
function *screenshot(data) {
  const checkData = data.check;
  const checkID = checkData.id;
  const uri = buildEmissaryURI(checkID);

  logger.info(`Generating screenshot for check ${checkID} from Emissary running at ${uri}`);

  const dimensions = yield nightmare
    .viewport(700, 1)
    .goto(uri)
    .wait('body')
    .evaluate(() => {
      const body = document.querySelector('body');
      return {
        height: body.scrollHeight,
        width: body.scrollWidth
      };
    });

  const imageBuffer = yield nightmare
    .viewport(dimensions.width, dimensions.height + 50) // Magic number??
    .wait(1000)
    .screenshot();

  logger.info(`Generated screenshot for check ${checkID}`);

  return {
    check: checkData,
    filename: data.filename,
    imageBuffer: imageBuffer
  };
}

/**
 * @param {String} data.filename
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

    return done(null, {
      filename: data.filename,
      check: data.check,
      imageURL: result.Location
    });
  });
}

module.exports = {
  screenshot: (checkData) => {
    return new Promise((resolve, reject) => {
      vo(dumpToFile, screenshot, upload)(checkData, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }
};