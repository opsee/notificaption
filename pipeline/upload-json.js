const uploadUtils = require('../utils/upload');

/**
 * @param {object} data
 * @param {object} data.check
 *
 * @returns {object} results
 * @returns {object} results.check
 * @returns {string} results.key
 * @returns {string} results.json
 */
module.exports = function(data) {
  const check = data.check;
  const key = data.key;

  return new Promise((resolve, reject) => {
    uploadUtils.uploadJSON(key, check)
      .then(result => {
        resolve({
          key: key,
          check: check,
          json_url: result.url
        });
      });
  });
}