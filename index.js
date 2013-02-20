var stylus = require('stylus')

var url = require('url')
var path = require('path')
var fs = require('fs')

module.exports = function(options) {
    options = typeof options == 'string' ? {src:options} : (options || {})
    var src = options.src
    var cache = options.cache && {}
    
    function getCss(stylusPath, callback) {
        if (cache && cache[stylusPath]) return callback(null, cache[stylusPath])
        fs.readFile(stylusPath, 'utf8', function(error, stylusSource) {
            if (error) return callback(error)
            var renderer = stylus(stylusSource, {
                filename:stylusPath,
                compress:options.compress,
                linenos:options.linenos
            })
            if (options.setup) renderer = options.setup(renderer, stylusSource, stylusPath)
            renderer.render(function(error, css) {
                if (error) return callback(error)
                if (cache) cache[stylusPath] = css
                callback(null, css)
            })
        })
    }
    return function stylus(request, response, next){
        if ('GET' != request.method && 'HEAD' != request.method) return next()
        var urlPath = url.parse(request.url).pathname
        if (!/\.(css|styl)$/.test(urlPath)) return next()
        var stylusPath = path.join(src, urlPath.replace(/\.css$/, '.styl'))
        getCss(stylusPath, function(error, css) {
            if (error) return next(error)
            response.header('Content-type', 'text/css')
            response.send(css)
        })
    }
}