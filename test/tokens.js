var test = require('tap').test;

var index = require('../');
var client = index.client;
var server = index.server;

var r = 'http://localhost:';

var token = 'randomtokenstringbytes';

test('setup server', function (t) {
  server.start({
    token: token
  }).on('bind', function (port) {
    r += port;
    t.ok('relay-server addr = ' + r);
    t.end();
  });
});

test('client connect tokenless', function (t) {
  t.plan(1);
  client.connect({
    relay: r,
    server: 'http://localhost:3000'
  }).on('error', function (err) {
    t.equal(err, 'not authorized');
  }).on('connect', function () {
    t.fail('relay-client should not have connected');
  });
});

test('client connect invalid token', function (t) {
  t.plan(1);
  client.connect({
    relay: r,
    server: 'http://localhost:3000',
    token: token + '1'
  }).on('error', function (err) {
    t.equal(err, 'not authorized');
  }).on('connect', function () {
    t.fail('relay-client should not have connected');
  });
});

test('client connect valid token', function (t) {
  t.plan(1);
  client.connect({
    relay: r,
    server: 'http://localhost:3000',
    token: token
  }).on('error', function (err) {
    t.fail('relay-client should have connected');
  }).on('connect', function () {
    t.pass('relay-client connected');
  });
});

test('shutdown', function (t) {
  t.end();
  process.exit();
});
