var test = require('tap').test;
var http = require('http');
var url = require('url');
var qs = require('querystring');

var mock = require('./mock/server.js');
var index = require('../');
var client = index.client;
var server = index.server;

var r = 'http://localhost:';

test('setup', function (t) {

  mock(function (err, port) {
    t.ok(!err, 'mock-server started');
    var s = 'http://localhost:' + port;
    server.start().on('bind', function (port) {
      r += port;
      t.ok('relay-server addr = ' + r);
      client.connect({
        relay: r,
        server: s
      });
      t.ok('relay-client connected');
      t.end();
    });
  });

});

test('GET /', function (t) {

  var opts = url.parse(r + '/');

  var req = http.request(opts, function (res) {
    var body = "";
    res.on('data', function (data) {
      body += data;
    });
    res.on('end', function () {
      t.equals(body, "hello, world");
      t.end();
    });
  }).end();

});

test('GET /query', function (t) {

  var q = { hello: 'there' };

  var opts = url.parse(r + '/query?' + qs.stringify(q));

  var req = http.request(opts, function (res) {
    var body = "";
    res.on('data', function (data) {
      body += data;
    });
    res.on('end', function () {
      t.equals(body, JSON.stringify(q));
      t.end();
    });
  }).end();

});

test('GET /readme', function (t) {

  var opts = url.parse(r + '/readme');

  var req = http.request(opts, function (res) {
    var body = "";
    res.on('data', function (data) {
      body += data;
    });
    res.on('end', function () {
      t.equals(body, "readme\n");
      t.end();
    });
  }).end();

});

test('GET /_pull/random', function (t) {

  var opts = url.parse(r + '/_pull/random');

  var req = http.request(opts, function (res) {
    t.equals(res.statusCode, 400);
    t.end();
  }).end();

});

test('GET /endless', function (t) {

  var opts = url.parse(r + '/endless');

  http.request(opts, function (res) {
    setTimeout(function () {
      res.destroy();
      t.end();
    }, 100);
  }).end();

});

test('POST /inc', function (t) {

  var body = { inc: 0 };
  var result = { inc: 1 };

  var opts = url.parse(r + '/inc');
  opts.method = 'POST';
  opts.headers = {
    'content-type': 'application/json'
  };

  var req = http.request(opts, function (res) {
    t.equal(res.statusCode, 200);
    var b = "";
    res.on('data', function (data) {
      b += data;
    });
    res.on('end', function () {
      t.equals(b, JSON.stringify(result));
      t.end();
    });
  });
  req.write(JSON.stringify(body));
  req.end();


});

test('POST /_push/random', function (t) {

  var opts = url.parse(r + '/_push/random');
  opts.method = 'POST';

  var req = http.request(opts, function (res) {
    t.equals(res.statusCode, 400);
    t.end();
  }).end();

});

test('PUT /', function (t) {

  var body = 'random';

  var opts = url.parse(r + '/');
  opts.method = 'PUT';

  var req = http.request(opts, function (res) {
    t.equal(res.statusCode, 201);
    var b = "";
    res.on('data', function (data) {
      b += data;
    });
    res.on('end', function () {
      t.equals(b, body);
      t.end();
    });
  });
  req.write(body);
  req.end();

});

test('shutdown', function (t) {
  t.end();
  process.exit();
});
