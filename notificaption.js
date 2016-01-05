const AWS = require('aws-sdk');
const fs = require('fs');
const Nightmare = require('nightmare');
const restify = require('restify');

const S3_BUCKET = 'doeg-notificaption-test';
const S3_KEY = process.env.NOTIFICAPTION_S3_KEY;

const s3 = new AWS.S3({
  params: {
    Bucket: S3_BUCKET,
    Key: S3_KEY
  }
});

const nightmare = Nightmare({
  width: 350
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

  return new Promise((resolve, reject) => {
    fs.appendFile(filename, JSON.stringify(checkData), err => {

      console.log("Data written to " + filename);
      if (err) reject(err);
      else resolve();
    });
  });
}

function generateScreenshot() {
  return nightmare
    .goto('http://localhost:8080')
    .screenshot();
}

function uploadScreenshot(buffer) {
  return s3.upload({
    Body: buffer,
    ContentEncoding: 'base64',
    ContentType: 'image/jpeg'
  })
  .on('httpUploadProgress', e => {
    console.log(e);
  })
  .send((err, data) => {
    console.log(err, data)
  });
}

function postScreenshot(req, res, next) {

  dumpToFile(req.params)
    .then(generateScreenshot)
    .then(uploadScreenshot);

  res.send(req.body);
  next();
}

var server = restify.createServer({
  name: 'notificaption'
});

server.use(restify.bodyParser({ mapParams: true }));

server.post('/screenshot', postScreenshot);

server.listen(8888, function() {
  console.log('%s listening at %s', server.name, server.url);
});
