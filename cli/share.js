var log = require('../lib/log')('cli-share');

var path = require('path');
var express = require('express');
var serveIndex = require('serve-index');

var client = require('../').client;

exports.run = function (argv, done) {


  var relay = argv.relay || process.env.RELAY_SERVER;
  var token = argv.token || process.env.RELAY_TOKEN;

  log.bug('found relay address = "' + relay + '"');
  log.bug('found relay token = "' + token + '"');

  if (relay === undefined) {
    log.err('please specify relay-server');
    done(-1);
  }

  var dir = path.resolve(process.cwd(), argv._[0] || '');
  log.info('sharing dir = ' + dir);

  var app = express();
  app.use(express.static(dir));
  app.use(serveIndex(dir, { icons: true }));
  app.use(function(req, res, next) {
    req.socket.on('error', log.err);
    res.socket.on('error', log.err);
    next();
  });

  var listener = app.listen(function () {
    var port = listener.address().port;
    var server = 'http://localhost:' + port;
    log.info(relay + ' => ' + server);
    client.connect({
      relay: relay,
      server: server,
      token: token
    });
  });

};
