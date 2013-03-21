var stylus = require('stylus')

var url = require('url')
var path = require('path')
var fs = require('fs')

module.exports = function(options) {
    options = typeof options == 'string' ? {src:options} : (options || {})
    var src = options.src
    var watch = !options.cache
    var cache = {}
    var watchCallback = options.watchCallback

    function watchForChanges(imports, stylusPath, urlPath) {
        var watchers = imports.map(function(filename) {
            return fs.watch(filename.path, { persistent:false }, function() {
                delete cache[stylusPath]
                getCss(stylusPath, urlPath, function(error) {
                    watchCallback && watchCallback(error, urlPath)
                })
                watchers.forEach(function(watcher) { 
                    watcher.close()
                })
            })
        })
    }
    function getCss(stylusPath, urlPath, callback) {
        if (cache[stylusPath]) {
            return callback(null, cache[stylusPath])
        }
        fs.readFile(stylusPath, 'utf8', function(error, stylusSource) {
            if (error) {
                return callback(error)
            }
            var stylusOptions = {
                filename:stylusPath,
                compress:options.compress,
                linenos:options.linenos
            }
            if (watch) {
                stylusOptions._imports = [{path:stylusPath}]
            }
            var renderer = stylus(stylusSource, stylusOptions)
            if (options.setup) {
                renderer = options.setup(renderer, stylusSource, stylusPath)
            }
            renderer.render(function(error, css) {
                if (error) {
                    return callback(error)
                }
                if (watch) {
                    watchForChanges(stylusOptions._imports, stylusPath, urlPath)
                }
                cache[stylusPath] = css
                callback(null, css)
            })
        })
    }
    return function stylus(request, response, next){
        if ('GET' != request.method && 'HEAD' != request.method) {
            return next()
        }
        var urlPath = url.parse(request.url).pathname
        if (!/\.(css|styl)$/.test(urlPath)) {
            return next()
        }
        var stylusPath = path.normalize(path.join(src, urlPath.replace(/\.css$/, '.styl')))

        // prevent access outside of src dir
        if (stylusPath.indexOf(src) !== 0) {
            return next()
        }
        getCss(stylusPath, urlPath, function(error, css) {
            if (error) {
                // if file isn't found, continue
                if (error.code === 'ENOENT') {
                    return next()
                }
                return next(error)
            }
            response.header('Content-type', 'text/css')
            response.send(css)
        })
    }
}