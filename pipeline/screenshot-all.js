const _ = require('lodash');
const Nightmare = require('nightmare');
const vo = require('vo');

/**
 * @return {buffer[]} - an array of image buffers
 */
function *takeScreenshots(opts) {
  var widths = opts.widths;
  var screenshots = {};

  // Share a nightmare instance for all screenshots -- this is much faster,
  // since Emissary only needs to make one S3 request for all screenshots.
  var nightmare = Nightmare({ show: false });

  for (var i = 0; i < widths.length; i++) {
      var width = widths[i];

      var viewportHeight = yield nightmare
        .viewport(width, 1) // reset the viewport
        .goto(opts.uri)
        .wait('.js-screenshot-results') // wait for viewport to stabilize
        .evaluate(() => {
          return document.querySelector('body').scrollHeight;
        });

      console.log('viewportHeight', viewportHeight);

      var screenshot = yield nightmare
        .viewport(width, viewportHeight + 30)
        .wait(400) // Wait for the viewport to resize (again)
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