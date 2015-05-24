#!/usr/bin/env node

var uglify = require('uglify-js');
var fs = require('fs');
var path = require('path');

var minified = uglify.minify(
  path.join(__dirname, '..', 'prelude.js'),
  {compress: {side_effects: false}} // since nothing calls `outer`
);
// uglify insists on adding a semicolon at the end
var code = minified.code.replace(/;$/, '');
fs.writeFileSync(path.join(__dirname, '..', '_prelude.js'), code);
