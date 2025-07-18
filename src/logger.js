// logger.js
const winston = require('winston');
const { combine, timestamp, printf, colorize } = winston.format;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'silly',
  format: combine(
    colorize({ all: false }),
    printf((info) => `${info.level} : ${info.message}`)
  ),
  transports: [new winston.transports.Console()],
});

module.exports = logger;