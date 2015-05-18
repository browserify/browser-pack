var JSONStream = require('JSONStream');
var defined = require('defined');
var through = require('through2');
var umd = require('umd');

var fs = require('fs');
var path = require('path');

var SourceMapConcat = require('inline-sourcemap-concat');

var defaultPreludePath = path.join(__dirname, '_prelude.js');
var defaultPrelude = fs.readFileSync(defaultPreludePath, 'utf8');

module.exports = function (opts) {
    if (!opts) opts = {};
    var parser = opts.raw ? through.obj() : JSONStream.parse([ true ]);
    var stream = through.obj(
        function (buf, enc, next) { parser.write(buf); next() },
        function () { parser.end() }
    );
    parser.pipe(through.obj(write, end));
    stream.standaloneModule = opts.standaloneModule;
    stream.hasExports = opts.hasExports;
    
    var first = true;
    var entries = [];
    var basedir = defined(opts.basedir, process.cwd());
    var prelude = opts.prelude || defaultPrelude;
    
    var sourcemap = SourceMapConcat.create({baseDir: basedir});
    var hasSourcemap = false;
    
    return stream;
    
    function write (row, enc, next) {
        if (first) {
            var pre = '';
            if (opts.standalone) {
                pre = umd.prelude(opts.standalone).trim() + 'return '
            } else if (stream.hasExports) {
                pre = (opts.externalRequireName || 'require') + '=';
            }
            var wrappedPrelude = pre + prelude + '({';
            stream.push(Buffer(wrappedPrelude));
            sourcemap.addSpace(wrappedPrelude);
        }
        
        var wrapStart =
            (first ? '' : ',') +
            JSON.stringify(row.id) +
            ':[function(require,module,exports){\n';
        
        var wrapEnd =
            '\n},{' +
            Object.keys(row.deps || {}).sort().map(function (key) {
                return JSON.stringify(key) + ':' + JSON.stringify(row.deps[key]);
            }).join(',') +
            '}]';
        
        if (row.sourceFile && !row.nomap) {
            var wrappedSource =
                sourcemap.addSpace(wrapStart) +
                sourcemap.addFileSource(row.sourceFile, row.source) +
                sourcemap.addSpace(wrapEnd);
            hasSourcemap = true;
        } else {
            wrappedSource = sourcemap.addSpace(
                wrapStart +
                SourceMapConcat.removeFrom(row.source) +
                wrapEnd
            );
        }
        
        stream.push(Buffer(wrappedSource));
        
        first = false;
        if (row.entry && row.order !== undefined) {
            entries[row.order] = row.id;
        }
        else if (row.entry) entries.push(row.id);
        next();
    }
    
    function end () {
        if (first) return stream.push(null);
        
        entries = entries.filter(function (x) { return x !== undefined });
        
        stream.push(Buffer('},{},' + JSON.stringify(entries) + ')'));
        
        if (opts.standalone) {
            stream.push(Buffer(
                (first ? '' : '(' + JSON.stringify(stream.standaloneModule) + ')')
                + umd.postlude(opts.standalone)
            ));
        }
        
        if (hasSourcemap) {
            var comment = sourcemap.comment();
            if (opts.sourceMapPrefix) {
                comment = comment.replace(
                    /^\/\/#/, function () { return opts.sourceMapPrefix }
                )
            }
            stream.push(Buffer('\n' + comment + '\n'));
        }
        if (!hasSourcemap && !opts.standalone) stream.push(Buffer(';\n'));
        
        stream.push(null);
    }
};
