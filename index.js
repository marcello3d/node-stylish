var stylus = require('stylus')

var EventEmitter = require('events').EventEmitter
var filewatcher = require('filewatcher')
var url = require('url')
var path = require('path')
var fs = require('fs')
var debug = require('debug')('stylish')

module.exports = function(options) {
    options = typeof options == 'string' ? {src:options} : (options || {})
    var src = path.normalize(options.src)
    var watch = !options.cache
    var cache = {}
    var processing = {}
    var emitter = new EventEmitter
    var watchCallback = options.watchCallback

    function watchForChanges(files, stylusPath, urlPath) {
        var watcher = filewatcher()
        files.forEach(function(file) {
            watcher.add(file.path)
        })
        watcher.once('change', function(file) {
            debug("rebuilding %s due to change in %s", urlPath, file)
            watcher.removeAll()
            delete cache[stylusPath]
            getCss(stylusPath, urlPath, function(error) {
                if (watchCallback) {
                     watchCallback(error, urlPath)
                }
            })
        })

        watcher.once('fallback', function(limit) {
            debug('Ran out of file handles after watching %s files.', limit)
            debug('Falling back to polling which uses more CPU.')
            debug('Run ulimit -n 10000 to increase the limit for open files.')
        })
    }
    function getCss(stylusPath, urlPath, callback) {
        if (cache[stylusPath]) {
            return callback(null, cache[stylusPath])
        }
        emitter.once(stylusPath, callback)
        if (!processing[stylusPath]) {
            processing[stylusPath] = true
            process(stylusPath, urlPath, function (error, css) {
                delete processing[stylusPath]
                if (error) {
                    debug("error rendering %s: %s", stylusPath, error)
                } else {
                    debug("built %s", stylusPath)
                }
                emitter.emit(stylusPath, error, css)
            })
        }
    }
    function process(stylusPath, urlPath, callback) {
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
                if (watch) {
                    watchForChanges(stylusOptions._imports, stylusPath, urlPath)
                }
                if (error) {
                    return callback(error)
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
