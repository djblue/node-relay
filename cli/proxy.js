var log = require('../lib/log')('cli-proxy');
var client = require('../lib/relay-client');

var usage = function () {
};

exports.run = function (argv, done) {

  var server = argv._[0];
  var relay = argv.relay || process.env.RELAY_SERVER;
  var token = argv.token || process.env.RELAY_TOKEN;

  if (server === undefined) {
    log.err('please specify server address');
    done(-1);
  }

  if (relay === undefined) {
    log.err('please specify relay-server address');
    done(-1);
  }

  client.connect({
    relay: relay,
    server: server,
    token: token
  });
};
