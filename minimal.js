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
