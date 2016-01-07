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
    protocol: 'http',
    hostname: emissaryConfig.hostname,
    port: emissaryConfig.port,
    pathname: checkPath
  });

  return nightmare
    .goto(uri)
    .screenshot();
}

/**
 * @param {Buffer} imageBuffer
 * @returns {Promise}
 */
function uploadScreenshot(imageBuffer) {
  return new Promise((resolve, reject) => {
    s3.upload({
      Body: imageBuffer,
      ContentEncoding: 'base64',
      ContentType: 'image/jpeg'
    })
    .send((err, data) => {
      if (err) reject(err);
      else resolve({ uri: data.Location });
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
