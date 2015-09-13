var fs = require('fs');
var path = require('path');
var express = require('express');
var parser = require('body-parser');
var crypto = require('crypto');

var app = express();
app.use(parser.json());

app.get('/', function (req, res) {
  res.end('hello, world');
});

app.get('/query', function (req, res) {
  res.json(req.query);
});

app.get('/readme', function (req, res) {
  var p = path.resolve(__dirname, 'README');
  fs.createReadStream(p).pipe(res);
});

app.get('/endless', function (req, res) {
  setInterval(function () {
    crypto.pseudoRandomBytes(65536, function (err, data) {
      if (err) throw err;
      res.write(data);
    });
  }, 1);
});

app.post('/inc', function (req, res) {
  req.body.inc += 1;
  res.json(req.body);
});

app.put('/', function (req, res) {
  res.status(201);
  req.pipe(res);
});

module.exports = function (done) {
  var server = app.listen(function (err) {
    if (err) {
      done(err);
    } else {
      var addr = server.address();
      done(null, addr.port);
    }
  });
};
