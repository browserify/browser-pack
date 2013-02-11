# browser-bundle

pack node-style source files from a json stream into a browser bundle

# example

json input:

``` json
[
  {
    "id": "a1b5af78",
    "source": "console.log(require('./foo')(5))",
    "deps": { "./foo": "b8f69fa5" },
    "entry": true
  },
  {
    "id": "b8f69fa5",
    "source": "module.exports = function (n) { return n * 111 }",
    "deps": {}
  }
]
```

bundle script:

``` js
var pack = require('browser-pack')();
process.stdin.pipe(pack).pipe(process.stdout);
process.stdin.resume();
```

output:

```
$ browser-bundle < input.json
(function(p,c,e){function r(n){if(!c[n]){c[n]={exports:{}};p[n][0](function(x){return r(p[n][1][x])},c[n],c[n].exports);}return c[n].exports}for(var i=0;i<e.length;i++)r(e[i]);return r})({"a1b5af78":[function(require,module,exports){console.log(require('./foo')(5))},{"./foo":"b8f69fa5"}],"b8f69fa5":[function(require,module,exports){module.exports = function (n) { return n * 111 }},{}]},{},["a1b5af78","b8f69fa5"])
```

# methods

``` js
var pack = require('browser-pack');
```

## pack()

Return a through stream that takes a stream of json input and produces a stream
of javascript output.

# install

With [npm](https://npmjs.org) do:

```
npm install browser-pack
```

# license

MIT
