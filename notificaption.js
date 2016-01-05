var Nightmare = require('nightmare');
var restify = require('restify');

const nightmare = Nightmare({
  width: 350
});

function generateScreenshot() {
  return nightmare
    .goto('http://localhost:8080')
    .screenshot();
}

function postScreenshot(req, res, next) {
  generateScreenshot()
    .then(buffer => {
      console.log('all done');
    });

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
