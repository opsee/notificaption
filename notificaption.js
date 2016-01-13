const AWS = require('aws-sdk');
const config = require('config');
const fs = require('fs');
const Nightmare = require('nightmare');
const Path = require('path');
const URL = require('url');

const s3 = new AWS.S3({
  params: {
    Bucket: config.s3.bucket,
    Key: process.env.NOTIFICAPTION_S3_KEY
  }
});

const nightmare = Nightmare({
  width: 400,
  height: 1200
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

  // Nightmare is based on "thenables", which don't seem to resolve to true
  // promises. In order for further .then()s to work down the chain, we wrap
  // it explicitly in a promise. (See http://stackoverflow.com/a/32589625)
  return Promise.resolve(nightmare
    .goto(uri)
    .screenshot()
  ).then(imageBuffer => {
    return {
      check: checkData,
      imageBuffer: imageBuffer
    };
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
  return new Promise((resolve, reject) => {
    s3.upload({
      Body: data.imageBuffer,
      ContentEncoding: 'base64',
      ContentType: 'image/jpeg',
      Key: generateS3Key(data.check.id)
    })
    .send((err, result) => {
      if (err) reject(err);
      else resolve({ uri: result.Location });
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
