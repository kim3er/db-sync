const fs = require('fs'),
  { promisify } = require('util'),
  mkdirp = require('mkdirp-promise');

exports.copyFile = promisify(fs.copyFile);
exports.readFile = promisify(fs.readFile);
exports.readdir = promisify(fs.readdir);
exports.stat = promisify(fs.stat);
exports.unlink = promisify(fs.unlink);
exports.mkdirp = mkdirp;
exports.rmdir = promisify(fs.rmdir);