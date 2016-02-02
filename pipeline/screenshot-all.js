const _ = require('lodash');
const Nightmare = require('nightmare');
const vo = require('vo');

/**
 * @return {buffer[]} - an array of image buffers
 */
function *takeScreenshots(opts) {
  var widths = opts.widths;
  var screenshots = {};

  var nightmare = Nightmare({ show: true });

  for (var i = 0; i < widths.length; i++) {
      var width = widths[i];

      var viewportHeight = yield nightmare
        .viewport(width, 100)
        .goto(opts.uri)
        .wait('.js-screenshot-results') // wait for viewport to stabilize
        .evaluate(() => {
          var body = document.querySelector('body');
          return body.scrollHeight;
        });

      console.log('height', viewportHeight);

      var screenshot = yield nightmare
        .viewport(width, viewportHeight + 40)
        .wait(200) // fucking viewports
        .screenshot();

      screenshots[width] = screenshot;
    }

    yield nightmare.end();
    return screenshots;
}

/**
 * @param {string} key - will have the length appended to it
 * @param {string} uri - emissary URL with JSON parameter in it
 * @param {number[]} widths - an array of screenshot widths
 *
 * For further down the pipeline, returned in the response:
 *
 * @param {string} json_url - URL to the json in s3, returned as part of the
 *    final response
 *
 * @param {string} results.json_url
 * @param {string} results.screenshots - maps width to image buffer
 *    e.g., { default: <buffer>, 400: <buffer>, 800: <buffer> }
 */
module.exports = (data) => {
  return new Promise((resolve, reject) => {
    vo(takeScreenshots)(data, (err, screenshots) => {
      if (err) reject(err);
      else resolve(_.assign({}, data, { screenshots }));
    });
  });
};