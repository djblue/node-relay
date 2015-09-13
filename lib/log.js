// quick an dirty logger

var util = require('util');
var readline = require('readline');
var chalk = require('chalk');
var argv = require('minimist')(process.argv.slice(2));

module.exports = function (id, out) {

  if (out === undefined) {
    out = process.stdout;
  }

  var nop = function () {};

  var silent = function (fn) {
    if (argv.debug === undefined) {
      return nop;
    } else {
      return fn;
    }
  };

  var multiline = function (lines) {
    return '\n' + lines.split('\n').map(function (line) {
      return '   ' + chalk.gray(line);
    }).join('\n');
  };

  var multilinePipe = function (input, output) {
    var rd = readline.createInterface({
      input: input,
      output: output,
      terminal: false
    });
    rd.on('line', function (line) {
      output.write('   ' + chalk.gray(line) + '\n');
    });
    rd.on('end', function () {
      output.write('\n');
    });
  };

  var format = function (obj) {
    if (typeof obj === 'string') {
      if (obj.indexOf('\n') !== -1) {
        return multiline(obj);
      } else {
        return obj;
      }
    }
    return multiline(util.inspect(obj));
  };

  var log = function (color) {
    var pre = color('[ ' + id + ' ] ');
    return function (msg) {
      if (process.env.NODE_ENV !== 'test') {
        if (msg.pipe !== undefined) {
          multilinePipe(msg, out);
        } else {
          out.write(pre + format(msg) + '\n');
        }
      }
      return loggers;
    };
  };

  var loggers =  {
    bug: silent(log(chalk.green)),
    warn: silent(log(chalk.yellow)),
    info: log(chalk.blue),
    err: log(chalk.red)
  };

  return loggers;
};
