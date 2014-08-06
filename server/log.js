/*******************************************************************************
 * Instance of the server logging functionality
 ******************************************************************************/
var winston = require('winston');

winston.cli();

var log = new winston.Logger({
  transports: [new winston.transports.Console({ level: 'debug', handleExceptions: true }),
               new winston.transports.File({ filename:'output.log', json: false, level: 'verbose'})]
});

log.cli();

exports.log = log;
