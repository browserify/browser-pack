
// modules are defined as an array
// [ module function, map of requireuires ]
//
// map of requireuires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the requireuire for previous bundles

(function outer (modules, cache, entry) {
    // Save the require from previous bundle to this closure if any
    var previousRequire = typeof require == "function" && require;

    function newRequire(name, jumped){
        if(!cache[name]) {
            if(!modules[name]) {
                // if we cannot find the module within our internal map or
                // cache jump to the current global require ie. the last bundle
                // that was added to the page.
                var currentRequire = typeof require == "function" && require;
                if (!jumped && currentRequire) return currentRequire(name, true);

                // If there are other bundles on this page the require from the
                // previous one is saved to 'previousRequire'. Repeat this as
                // many times as there are bundles until the module is found or
                // we exhaust the require chain.
                if (previousRequire) return previousRequire(name, true);
                var err = new Error('Cannot find module \'' + name + '\'');
                err.code = 'MODULE_NOT_FOUND';
                throw err;
            }
            var e = {}, m = cache[name] = {exports:e};
            function subReq(x){
                var id = modules[name][1][x];
                return newRequire(id ? id : x);
            }
            // If [2] is truthy this is an ES module.
            // ES modules expose exports by calling a function with
            // [name, getter (for live bindings)] pairs.
            if(modules[name][2]) {
                modules[name][0].call(undefined, subReq, function(obj) {
                    var exp = Object.keys(obj);
                    for (var i = 0; i < exp.length; i++) {
                        Object.defineProperty(e, exp[i], {
                            get: obj[exp[i]],
                            set: function () { throw new Error('Assignment to constant variable.') },
                            enumerable: true
                        });
                    }
                });
            }
            else {
                modules[name][0].call(m.exports, subReq,m,m.exports,outer,modules,cache,entry);
            }
        }
        return cache[name].exports;
    }
    for(var i=0;i<entry.length;i++) newRequire(entry[i]);

    // Override the current require with this new one
    return newRequire;
})
