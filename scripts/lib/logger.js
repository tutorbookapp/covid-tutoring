const winston = require('winston');

module.exports = winston.createLogger({
  level: 'verbose',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});
