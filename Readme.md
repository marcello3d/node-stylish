node-stylish [![build status](https://secure.travis-ci.org/marcello3d/node-stylish.png)](http://travis-ci.org/marcello3d/node-stylish)
============

Simple node.js [stylus](https://github.com/learnboost/stylus) middleware for 
[connect](https://github.com/senchalabs/connect) (or [express](http://expressjs.com/)) that doesn't write files to disk.

Install
------

    npm install stylish

Examples
--------

Simple `stylus.middleware()` drop-in replacement:

    app.use(stylish(__dirname + '/public'))

Extended example with stylus compression and an example of customizing the renderer (using 
[nib](https://github.com/visionmedia/nib/) in this example):

```js
app.use(stylish({
    src:__dirname + '/public',
    compress: true,
    setup: function(renderer) {
        return renderer.use(nib())
    }
}))
```

By default, stylish watches files (and dependencies) for changes. You can add a callback to learn when a file changes:

```js
app.use(stylish({
    src:__dirname + '/public',
    compress: true,
    watchCallback: function(error, filename) {
        // do something clever, like tell the client to reload css
    }
}))
```

For production use, turn caching on (this caches the computed css in memory and disables file watching):

```js
app.use(stylish({
    src:__dirname + '/public',
    compress: true,
    cache: true
}))
```

License
-------
zlib license [LICENSE](LICENSE).