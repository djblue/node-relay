var log = require('../lib/log')('cli-start');
var server = require('../lib/relay-server');

var usage = function () {
};

exports.run = function (argv, done) {
  server.start({
    port: argv.port || process.env.PORT || 3000
  }).on('bind', function (port) {
    log.info('listening on port = ' + port);
  });
};
