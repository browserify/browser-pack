#!/usr/bin/env node

var spawn = require('child_process').spawn;
var fs = require('fs');
var concat = require('concat-stream');
var path = require('path');

var uglify = spawn(
    process.execPath,
    [require.resolve('uglify-js/bin/uglifyjs'), '-c', 'unused=false,expression=true', '--ie8', '-m'],
    {
        stdio: ['pipe', 'pipe', 'inherit']
    }
);

fs.createReadStream(path.join(__dirname, '..', 'prelude.js'))
    .pipe(uglify.stdin)
;

uglify.stdout
    .pipe(concat({ encoding: 'string' }, function (str) {
        fs.writeFileSync(path.join(__dirname, '..', '_prelude.js'), str.replace(/;\s*$/, ''));
    }))
;
