var log = require('./log')('relay-server');

var express = require('express');
var morgan = require('morgan');
var qs = require('querystring');
var shortid = require('shortid');
var socketio = require('socket.io');

var util = require('util');
var EventEmitter = require('events').EventEmitter;

function Server(opts) {
  if (!(this instanceof Server)) {
    return new Server(opts);
  }
  EventEmitter.call(this);
}

util.inherits(Server, EventEmitter);

var map = function (ttl) {

  var accessed = false;
  var m = {};

  var get = function (id) {
    accessed = true;
    return m[id];
  };

  var set = function (id, v) {
    m[id] = v;
    setTimeout(function () {
      if (!accessed) {
        clear(id);
      }
    }, ttl * 1000);
  };

  var clear = function (id) {
    delete m[id];
  };

  return {
    get: get,
    set: set,
    clear: clear
  };

};

exports.start = function (opts) {

  if (opts === undefined) {
    opts = {};
  }

  var port = opts.port || 0;
  var ttl = opts.ttl || 60;
  var token = opts.token || null;

  var srv = Server();

  var waiting = map(ttl);

  var s = null;
  var app = express();
  var server = app.listen(port, function (err) {
    var addr = server.address();
    var port = addr.port;
    log.bug('bound to port = ' + port);
    srv.emit('bind', port);
  });
  var io = socketio.listen(server);

  // socket io simple authentication middleware
  io.use(function(socket, next) {
    var ip = socket.conn.remoteAddress;
    var clientToken = socket.handshake.query.token || '';
    if (token !== null && token !== clientToken) {
      log.err('socket from ip = ' + ip + ' not authorized');
      next(new Error('not authorized'));
    } else {
      next();
    }
  });

  // don't spam the test output with http logs
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  /*
  app.use(function (req, res, next) {
    var start = process.hrtime();
    var n = 0;
    req.on('data', function (data) { n += data.length; });
    res.on('finish', function () {
      var diff = process.hrtime(start);
      var ms = ((diff[0] * 1e3) + (diff[1] * 1e-6)).toFixed(3) + ' ms';
      var n = res.get('Content-Length');
      var status = res.statusCode;
      log.info(req.method + ' ' + req.url + ' ' + ms + ' ' + status + ' - ' + n);
    });
    next();
  });
  */

  io.on('connection', function (socket) {
    s = socket;
    var ip = socket.conn.remoteAddress;
    log.info('socket from ip = ' + ip + ' connected');
    socket.on('disconnect', function () {
      s = null;
      log.info('socket from ip = ' + ip + ' diconnected');
    });
  });

  var checkWaiting = function (req, res, next) {
    var id = req.params.id;
    if (waiting.get(id) === undefined) {
      res.status(400).json({
        message: 'no request with id = ' + id + ' is waiting.'
      });
    } else {
      next();
    }
  };

  app.get('/_ping', function (req, res) {
    res.status(200).json({
      status: 200,
      message: 'pong'
    });
  });

  app.get('/_pull/:id', checkWaiting, function (req, res) {
    var log = require('./log')('router:' + req.params.id);
    var w = waiting.get(req.params.id);
    log.bug('client pulling data');
    w.req.resume();
    w.req.pipe(res);
  });

  app.post('/_push/:id', checkWaiting, function (req, res) {
    var log = require('./log')('router:' + req.params.id);
    var status = req.headers['x-forward-status'];
    delete req.headers['x-forward-status'];
    log.bug('client pushing data');
    var w = waiting.get(req.params.id);
    w.req.on('close', function () {
      log.bug('waiting request closed');
      res.status(502).json({
        message: 'request closed'
      });
    });
    w.req.on('error', function (err) {
      log.err(err);
      log.err('waiting request error');
      res.status(502).json(err);
    });
    w.res.set(req.headers);
    w.res.status(status);
    req.pipe(w.res);
    req.on('end', function () {
      res.status(200).end();
    });
    waiting.clear(req.param.id);
  });

  var pause = function (req, res, next) {
    req.pause();
    next();
  };

  app.put('*', pause);
  app.post('*', pause);

  var check = function (req, res, next) {
    if (s === null) {
      res.status(502).json({
        status: 502,
        message: 'bad gateway'
      });
    } else {
      next();
    }
  };

  app.all('*', check, function (req, res) {

    var id = shortid.generate();
    var log = require('./log')('router:' + id);
    log.bug('recieved request for ' + req.path);


    var query = '';
    if (Object.keys(req.query).length > 0) {
      query = '?' + qs.stringify(req.query);
    }

    s.emit('req', id, {
      method: req.method,
      path: req.path + query,
      query: req.query,
      headers: req.headers
    });

    waiting.set(id, { req: req, res: res });

    log.bug('pausing request');

  });

  return srv;

};
