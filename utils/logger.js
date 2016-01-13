'use strict';

const winston = require('winston');

const logger = new winston.Logger({
  level: 'info',
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename: 'notificaption.log' })
  ]
});

module.exports = logger;