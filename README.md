# node-relay

[![Build Status](https://travis-ci.org/djblue/node-relay.svg?branch=master)](https://travis-ci.org/djblue/node-relay)

An http relay that proxies http requests using socket.io to
signal clients that forward the request and push the results
back to the relay.

## heroku deploy

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)


## install

with npm do:

    $ npm install -g node-relay

## usage

Default environment variables for configuration:

- `RELAY_TOKEN` - for both client and server.
  - token to secure server.
  - token for client to access server.
- `RELAY_SERVER` - web address of relay server.
- `PORT` - port for server to bind to; default is 3000.

NOTE: command line parameters will overwrite environment
variable configuration.

### start

Start a relay server.

    $ relay start [opts]

Options:

- `--token='<tokenstring>'` - token to use for securing server.
- `--port=<number>` - port for server to bind to; default is
  3000.

### share

Share a directory through a relay server. Spins up a basic [serve-static](https://www.npmjs.com/package/serve-static) server and proxies it through the relay.

    $ relay share [opts] <dir>

NOTE: `<dir>` can be relative or absolute.

Options:

- `--token='<tokenstring>'` - token to use for connecting to relay server.
- `--relay='<relayaddr>'` - web address of relay server.

### proxy

Proxy local server through a relay.

    $ relay proxy <addr>

Options:

- `--token='<tokenstring>'` - token to use for connecting to relay server.
- `--relay='<relayaddr>'` - web address of relay server.

### ping

Check if relay server is up; should respond with `pong`. Will
default to `RELAY_SERVER` if addr is not specified.

    $ relay ping <addr>

## api

Relaying `https://www.npmjs.com` to `http://localhost:3000`.

For the server do:

```javascript
var server = require('node-relay').server;
server.start({
  port: 3000,
  token: 'randomstring'
});
```

For the client do:

```javascript
var client = require('node-relay').client;
client.connect({
  server 'https://www.npmjs.com',
  relay: 'http://localhost:3000',
  token: 'randomstring'
});
```


## the magic

- http request comes into the relay-server
- relay-server notifies relay-client about request using
  socket.io connection
- relay-client starts http request to application server
- relay-client pulls request body from relay-server and streams
  it to application server
- relay-client pushes application server response headers/body
  to relay-server.
- relay-server responds to http request with pushed info

So a single http request turns into three requests.

## test

To run all the tests, do:

    $ npm test
