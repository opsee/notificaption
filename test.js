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

console.log(uri);



function *screenshot() {
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
    Key: "saratesting"
  })
  .send((err, result) => {
    if (err) return done(err);
    return done(null, result);
  });
}

module.exports = {
  test: function() {
    vo(screenshot, upload)((err, result) => {
      if (err) {
        console.log('error');
        console.log(err);
      }
      else {
        console.log('done');
        console.log(result);
      }
    });
  }
}