const AWS = require('aws-sdk');
var Nightmare = require('nightmare');
var vo = require('vo');
var URL = require('url');

const s3 = new AWS.S3({
  params: {
    Bucket: "opsee-notificaption-images"
  }
});

const config = {
  "emissary": {
    "protocol": "https",
    "hostname": "app.opsee.com",
    "port": null,
    "basePath": "/check"
  }
}

const uri = URL.format({
  protocol: config.emissary.protocol,
  hostname: config.emissary.hostname,
  port: config.emissary.port,
  pathname: "/check/21G057gL7oNtKKDW64g9Dl/screenshot"
});

function generateS3Key() {
  const now = new Date().getTime();
  return `${now}`;
}

function *screenshot(checkData) {
  console.log(checkData);
  console.log('screenshotting...');
  var nightmare = Nightmare();
  var screenshot = yield nightmare
    .goto(uri)
    .wait(1000)
    .screenshot()

  console.log("Got screenshot");
  return screenshot;
}

function upload(imageBuffer, done) {
  console.log("uploading...");
  console.log(imageBuffer);

  s3.upload({
    Body: imageBuffer,
    ContentEncoding: 'base64',
    ContentType: 'image/jpeg',
    Key: generateS3Key()
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
        if (err) {
          console.log('error');
          console.log(err);
          reject(err);
        }
        else {
          console.log('done');
          console.log(result);
          resolve({
            uri: result.Location
          });
        }
      });
    });
  }
}