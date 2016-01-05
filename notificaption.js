const Nightmare = require('nightmare');
const restify = require('restify');
const AWS = require('aws-sdk');

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

function generateScreenshot() {
  return nightmare
    .goto('http://localhost:8080')
    .screenshot();
}

function uploadScreenshot(buffer) {
  s3.upload({
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
  generateScreenshot()
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
