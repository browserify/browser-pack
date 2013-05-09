
// modules are defined as an array
// [ module function, map of requireuires ]
//
// map of requireuires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the requireuire for previous bundles

(function(modules, cache, entry, filenames) {
    // Save the require from previous bundle to this closure if any
    var previousRequire = typeof require == "function" && require;

    function newRequire(name, jumped, parent){
        if(!cache[name]) {
            if(!modules[name]) {
                // if we cannot find the the module within our internal map or
                // cache jump to the current global require ie. the last bundle
                // that was added to the page.
                var currentRequire = typeof require == "function" && require;
                if (!jumped && currentRequire) return currentRequire(name, true, parent);

                // If there are other bundles on this page the require from the
                // previous one is saved to 'previousRequire'. Repeat this as
                // many times as there are bundles until the module is found or
                // we exhaust the require chain.
                if (previousRequire) return previousRequire(name, true, parent);
                throw new Error('Cannot find module \'' + name + '\'');
            }
            var m = cache[name] = {
                id: name,
                require: function(x){
                    var id = modules[name][1][x];
                    return newRequire(id ? id : x, false, m);
                },
                filename: filenames[name] || name,  // filenames are passed in a separate map so that we can compute LCA after everything is finished
                exports: {},
                parent: parent || null,
                children: [],
                loaded: false
            };
            if (parent && parent.children)
                parent.children.push(m);
            modules[name][0].call(m.exports,m.require,m,m.exports);
            m.loaded = true;
        }
        return cache[name].exports;
    }
    for(var i=0;i<entry.length;i++) newRequire(entry[i]);

    // Override the current require with this new one
    return newRequire;
})
