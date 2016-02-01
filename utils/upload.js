const AWS = require('aws-sdk');
const config = require('config');

const s3 = new AWS.S3({
  params: {
    Bucket: config.s3.bucket
  }
});

/**
 * @param {String} key
 * @param {Object} json
 */
function uploadJSON(key, json) {
  return new Promise((resolve, reject) => {
    s3.upload({
      Key: `${key}.json`,
      Body: JSON.stringify(json),
      ContentType: 'application/json'
    }).send((err, result) => {
      if (err) return reject(err);

      const url = result.Location;
      return resolve({ url });
    });
  });
}

module.exports = { uploadJSON };