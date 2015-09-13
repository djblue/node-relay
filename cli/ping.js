var log = require('../lib/log')('cli-ping');

var client = require('../').client;

exports.run = function (argv, done) {

  var server = argv._[0] || process.env.RELAY_SERVER;

  if (server === undefined) {
    log.err('please specify relay-server address');
    done(-1);
  }

  client.ping(server);
};
