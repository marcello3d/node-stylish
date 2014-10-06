var test = require('tape')

var http = require('http')
var express = require('express')
var request = require('supertest')

var stylish = require('../.')

var app = express()
var server

test('setup', function(t) {
    app.use(stylish({
        src:__dirname + '/assets',
        cache:true,
        compress:true
    }))
    server = http.createServer(app)
    server.listen(function() {
        t.end()
    })
});

test('basic', function(t) {
    request(server)
        .get('/test.css')
        .end(function(err, res) {
            t.equal(res.statusCode, 200)
            t.equal(res.headers['content-type'], 'text/css; charset=utf-8')
            t.equal(res.text, '.foo{color:#f00;}.foo .bar{border-radius:10px}')
            t.end()
        })
})

test('shutdown', function(t) {
    server.close(function() {
        t.end()
    })
})