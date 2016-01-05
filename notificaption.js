const AWS = require('aws-sdk');
const config = require('config');
const fs = require('fs');
const Nightmare = require('nightmare');
const restify = require('restify');
const URL = require('url');

const s3 = new AWS.S3({
  params: {
    Bucket: config.s3.bucket,
    Key: process.env.NOTIFICAPTION_S3_KEY
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
      if (err) reject(err);
      else resolve();
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
function generateScreenshot(checkID) {

  const emissaryConfig = config.emissary;
  const checkPath = [emissaryConfig.basePath, checkID].join('/');

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
    .then(uploadScreenshot)
    .then(resp => {
      res.send({ uri: resp.uri });
      next();
    });
}

var server = restify.createServer({
  name: 'notificaption'
});

server.use(restify.bodyParser({ mapParams: true }));

server.post('/screenshot', postScreenshot);

server.listen(8888, function() {
  console.log('%s listening at %s', server.name, server.url);
});
