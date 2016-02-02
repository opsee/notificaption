// TO RUN:
//     npm install vo nightmare
//     DEBUG='nightmare' node test.js
//
const Nightmare = require('nightmare');
const vo = require('vo');
const upload = require('./utils/upload');
const keygen = require('./utils/keygen');


function test(err, screenshots) {
  if (err) throw err;

  var keybase = keygen('testing');

  if (!(400 in screenshots)) throw new Error('missing 400px image');
  if (!(800 in screenshots)) throw new Error('missing 800px image');

  for (var width in screenshots) {
    var key = `${keybase}_${width}`;
    var buffer = screenshots[width];

    console.log(key, buffer);

    upload.uploadImage(key, buffer)
      .then(result => console.log(result.url))
      .catch(err => {
        console.log(err);
        process.exit();
      })
  }
}

// THIS WORKS
function runPassing() {
  vo(function* (widths) {
    var screenshots = {};

    var nightmare = Nightmare({ show: true });

    for (var i = 0; i < widths.length; i++) {
      var width = widths[i];

      var viewportHeight = yield nightmare
        .viewport(width, 100)
        .goto('http://yahoo.com')
        .wait(100) // wait for viewport to stabilize
        .evaluate(() => {
          var body = document.querySelector('body');
          return body.scrollHeight;
        });

      console.log('height', viewportHeight);

      var screenshot = yield nightmare
        .viewport(width, viewportHeight)
        .wait(200) // fucking viewports
        .screenshot();

      screenshots[width] = screenshot;
    }

    yield nightmare.end();
    return screenshots;
  })([400, 800], test);
}


// UNCOMMENT THIS TO DO THE THING U WANNA DO
runPassing();
