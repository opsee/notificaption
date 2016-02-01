const config = require('config');
const Yeller = require('yeller_node');

module.exports = Yeller.client({
  token: config.yeller.token
});