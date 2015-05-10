var JSONStream = require('JSONStream');
var defined = require('defined');
var through = require('through2');
var shasum = require('shasum');
var umd = require('umd');

var fs = require('fs');
var path = require('path');

var combineSourceMap = require('combine-source-map');

var defaultPreludePath = path.join(__dirname, '_prelude.js');
var defaultPrelude = fs.readFileSync(defaultPreludePath, 'utf8');

var cache = {};

function newlinesIn(src) {
  if (!src) return 0;
  var newlines = src.match(/\n/g);

  return newlines ? newlines.length : 0;
}

function wrapSimple(src) {
    return 'function(require,module,exports){\n'
        + combineSourceMap.removeComments(src)
        + '\n}';
}

function wrapEval(src, sourceMapComment) {
     return 'eval('
        + JSON.stringify(
            '(function(require,module,exports){\n'
            + combineSourceMap.removeComments(src)
            + (sourceMapComment ? '\n' + sourceMapComment : '')
            + '\n})'
        ) + ')';
}

function sourceWrapper(first, wrappedModule, id, deps) {
    return (first ? '' : ',')
        + JSON.stringify(id)
        + ':['
        + wrappedModule
        + ',{' + Object.keys(deps || {}).sort().map(function (key) {
            return JSON.stringify(key) + ':'
                + JSON.stringify(deps[key])
            ;
        }).join(',') + '}'
        + ']';
}

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
    var preludePath = opts.preludePath ||
        path.relative(basedir, defaultPreludePath).replace(/\\/g, '/');
    
    var evalInline = opts.debug === 'eval-inline';
    var evalSourceUrl = opts.debug === 'eval-source-url';
    var lineno = 1 + newlinesIn(prelude);
    var sourcemap;
    
    return stream;
    
    function write (row, enc, next) {

        if (first) {
            // stream.push(Buffer('console.time("scriptLoad");'));
            if (opts.standalone) {
                var pre = umd.prelude(opts.standalone).trim();
                stream.push(Buffer(pre + 'return '));
            }
            else if (stream.hasExports) {
                pre = opts.externalRequireName || 'require';
                stream.push(Buffer(pre + '='));
            }
            stream.push(Buffer(prelude + '({'));
        }

        var wrappedModule;
        var wrappedSource;
        if (evalInline) {
            var key = row.sourceFile + '::' + row.nomap + '::' + shasum(row.source);
            if (key in cache) {
                wrappedModule = cache[key];
            } else {
                if (row.sourceFile && !row.nomap) {
                    sourcemap = combineSourceMap.create();
                    sourcemap.addFile(
                        { sourceFile: row.sourceFile, source: row.source },
                        { line: 1 }
                    );
                    wrappedModule = wrapEval(row.source, sourcemap.comment());
                } else {
                    wrappedModule = wrapEval(row.source);
                }
                cache[key] = wrappedModule;
            }
            wrappedSource = sourceWrapper(first, wrappedModule, row.id, row.deps);
            sourcemap = null;
        } else if (evalSourceUrl) {
            if (row.sourceFile && !row.nomap) {
                wrappedModule = wrapEval(row.source,
                    '//# sourceURL=' + row.sourceRoot + '/' + row.sourceFile);
            } else {
                wrappedModule = wrapEval(row.source);
            }
            wrappedSource = sourceWrapper(first, wrappedModule, row.id, row.deps);
        } else {
            if (row.sourceFile && !row.nomap) {
                if (!sourcemap) {
                    sourcemap = combineSourceMap.create();
                    sourcemap.addFile(
                        { sourceFile: preludePath, source: prelude },
                        { line: 0 }
                    );
                }
                sourcemap.addFile(
                    { sourceFile: row.sourceFile, source: row.source },
                    { line: lineno }
                );
            }
            wrappedModule = wrapSimple(row.source);
            wrappedSource = sourceWrapper(first, wrappedModule, row.id, row.deps);
            lineno += newlinesIn(wrappedSource);
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
        if (first) stream.push(Buffer(prelude + '({'));
        entries = entries.filter(function (x) { return x !== undefined });
        
        stream.push(Buffer('},{},' + JSON.stringify(entries) + ')'));

        if (opts.standalone && !first) {
            stream.push(Buffer(
                '(' + JSON.stringify(stream.standaloneModule) + ')'
                + umd.postlude(opts.standalone)
            ));
        }
        
        // if (!first) stream.push(Buffer('console.timeEnd("scriptLoad");'));

        if (sourcemap) {
            var comment = sourcemap.comment();
            if (opts.sourceMapPrefix) {
                comment = comment.replace(
                    /^\/\/#/, function () { return opts.sourceMapPrefix }
                )
            }
            stream.push(Buffer('\n' + comment + '\n'));
        }
        if (!sourcemap && !opts.standalone) stream.push(Buffer(';\n'));

        stream.push(null);
    }
};
