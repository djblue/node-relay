# node-relay

[![Build Status](https://travis-ci.org/djblue/node-relay.svg?branch=master)](https://travis-ci.org/djblue/node-relay)

An http relay that proxies http requests using socket.io to
signal clients that forward the request and push the results
back to the relay.

## install 

with npm do:

    $ npm install -g node-relay

## usage

    $ relay start # start a relay server

    $ relay share # share a directory through a relay

    $ relay proxy <addr> # proxy local server through a relay

## the magic

- http request comes into the relay-server
- relay-server notifies relay-client about request using
  socket.io connection
- relay-client starts http request to applicaiton server
- relay-client pulls request body from relay-server and streams
  it to application server
- relay-client pushes application server response headers/body
  to relay-server.
- relay-server responds to http request with pushed info

So a single http request turns into three requests.

## test

To run all the tests, do:

    $ npm test
