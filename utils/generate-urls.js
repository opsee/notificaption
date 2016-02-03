const config = require('config');

module.exports = (key) => {
  const urlBase = `${config.s3.protocol}://${config.s3.bucket}.${config.s3.hostname}`;
  const widths = config.widths;
  const imageURLS = {};

  const jsonURL = `${urlBase}/${key}.json`;

  for (var i = 0; i < widths.length; i++) {
    var width = widths[i];
    imageURLS[width] = `${urlBase}/${key}_${width}.png`;
  }

  return {
    json_url: jsonURL,
    image_urls: imageURLS
  };
};
