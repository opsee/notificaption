const config = require('config');
const Yeller = require('yeller_node');

module.exports = Yeller.client({
  token: config.yeller.token,
  applicationEnvironment: config.util.getEnv('NODE_ENV'),
  developmentEnvironments: ['test', 'development']
});