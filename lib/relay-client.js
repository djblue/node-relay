var url = require('url');
var http = require('http');
var https = require('https');

var io = require('socket.io-client');
var log = require('./log')('relay-client');

var util = require('util');
var EventEmitter = require('events').EventEmitter;

function Client(opts) {
  if (!(this instanceof Client)) {
    return new Client(opts);
  }
  EventEmitter.call(this);
}

util.inherits(Client, EventEmitter);

Client.prototype.forward = function (server) {
  this.emit('forward', server);
  return this;
};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var accumulator = function () {
  var size = 0;
  return function (data) {
    if (data !== undefined) {
      size += data.length;
    }
    return size;
  };
};

// abstract away http vs https requests
var request = function (opts, fn) {
  switch (opts.protocol) {
    case 'http:':
      return http.request(opts, fn);
    case 'https:':
      return https.request(opts, fn);
    default:
      throw Error('unsupported protocol');
  }
};

// from - url to make GET request
// to - request/pipe to write contents of
var pull = function (from, to) {

  var a = accumulator();
  var opts = url.parse(from);
  opts.method = 'GET';

  var req = request(opts, function (res) {
    res.pipe(to);
    res.on('data', a);
    res.on('end', function () {
      log.bug('pulled ' + a() + ' bytes of data from ' + from);
    });
    res.on('error', log.err);
  });
  req.end();
  req.on('error', log.err);

};

// from - response/pipe to read data from
// to - url to make POST request
var push = function (from, to) {

  var a = accumulator();
  var opts = url.parse(to);
  opts.method = 'POST';

  opts.headers = from.headers;
  opts.headers['x-forward-status'] = from.statusCode;

  from.on('data', a);
  from.on('end', function () {
    log.bug('pushed ' + a() + ' bytes of data to ' + to);
  });

  var req = request(opts, function (res) {
    if (res.statusCode === 200) {
      log.info('successfully pushed request to relay-server');
    } else {
      log.err(res);
      log.err('failed to pushed request to relay-server');
    }
  });
  req.on('error', function (err) {
    log.err(err);
    log.bug('request error');
    from.destroy();
  });
  from.pipe(req);
};

exports.ping = function (relay, done) {
  if (!done) {
    done = function () {};
  }
  var opts = url.parse(relay);
  opts.path = '/_ping';
  request(opts, function (res) {
    if (res.statusCode !== 200) {
      done(false);
    } else {
      var body = '';
      res.on('data', function (data) {
        body += data;
      });
      res.on('end', function () {
        var j = JSON.parse(body);
        log.info(j.message);
        if (j.message === 'pong') {
          done(true);
        } else {
          done(false);
        }
      });
    }
  }).end();
};

// connects to proxy using socket.io and makes requests to
// server
//
// proxy - address of proxy
// server - address of server
exports.connect = function (opts) {

  var client = Client();

  var proxy = opts.relay;
  var server = opts.server;
  var token = opts.token || null;

  var sopts = { forceNew: true };

  if (token !== null) {
    log.info('using token for socket.io connection');
    log.bug('socket.io token = "' + token + '"');
    sopts.query = 'token=' + token;
  }

  var socket = io.connect(proxy, sopts);

  socket.on('error', function (err) {
    log.err('error with socket connection "' + err + '"');
    client.emit('error', err);
    socket.io.close();
  });

  socket.on('connect', function () {
    log.info('connected to ' + proxy);
    client.emit('connect');
  });

  socket.on('disconnect', function () {
    log.info('disconnected from ' + proxy);
    client.emit('disconnect');
  });

  socket.on('req', function (id, options) {

    var log = require('./log')('client:' + id);

    log.bug('recieved request for ' + options.path);

    var opts = url.parse(server);

    for (var key in options) {
      opts[key] = options[key];
    }

    opts.headers.host = opts.host;

    log.bug('forwarding request to ' + opts.host);

    var req = request(opts, function (res) {

      var a = accumulator();
      log.bug('recieved response from ' + opts.host);
      res.pause();

      res.on('data', a);
      res.on('err', log.err);
      res.on('end', function () {
        log.bug('pushed ' +  a() + ' bytes back to the proxy');
      });

      var location;

      if (res.statusCode === 302) {
        location = url.parse(res.headers.location);
        res.headers.location = location.path;
        log.bug('temporary redirecting to ' + location.path + ' - 301');
      } else if (res.statusCode === 301) {
        location = url.parse(res.headers.location);
        log.bug(location);
        res.headers.location = location.path;
        if (location.protocol && location.host) {
          server = location.protocol + '//' + location.host;
        }
        log.bug('permanent redirecting to ' + location.path + ' - 302');
      }

      push(res, proxy + '/_push/' + id);
    });

    if (opts.method === 'POST' || opts.method === 'PUT') {
      pull(proxy + '/_pull/' + id, req);
    } else {
      log.bug('skipping body pull because request method is GET or DELETE');
      req.end();
    }

  });

  return client;

};
