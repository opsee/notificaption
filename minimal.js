var notificaption = require('./notificaption');
var check = require('./check.json');

notificaption(check)
  .then(result => {
    console.log('result', result);
  })
  .catch(err => {
    console.error(err);
    process.exit();
  });

// var screenshot = require('./pipeline/screenshot');
// var compress = require('./pipeline/compress');
// var upload = require('./pipeline/upload');
// var keygen = require('./utils/keygen');

// var opts = {
//   uri: "https://app.opsee.com/check/21G057gL7oNtKKDW64g9Dl/screenshot?json=https%3A%2F%2Fopsee-notificaption-images.s3.amazonaws.com%2F21G057gL7oNtKKDW64g9Dl_1454365816809.json",
//   widths: [100, 200],
//   key: keygen('testing')
// };

// screenshot(opts)
//   .then(result => {
//     console.log(result);
//     // return upload.uploadImage(result.key, result.buffer);
//   })
//   // .then(result => {
//     // console.log('done!', result.url);
//   // })
//   .catch(err => {
//     console.error(err);
//     process.exit();
//   });

