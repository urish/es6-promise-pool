(function (global) {
  'use strict'

  var PromisePool, loadProducer, log
  if (typeof module !== 'undefined') {
    require('console-stamp')(console, 'HH:mm:ss.l')
    PromisePool = require('../')
    loadProducer = function (id) {
      var filename = './demo-' + id
      return Promise.resolve(require(filename))
    }
    log = function () {
      var type = Array.prototype.shift.call(arguments)
      console[type].apply(console, arguments)
    }
  } else {
    PromisePool = global.PromisePool
    loadProducer = function (id) {
      return Promise.resolve(global._producers[id])
    }
    log = global.log
  }

  var id = 0
  var cnt = 0

  var getPromise = function () {
    return new Promise(function (resolve, reject) {
      var num = ++cnt
      var delay = 500 + Math.floor(Math.random() * 500)
      log('info', 'Resolving %s#%d in %d ms', id, num, delay)
      setTimeout(function () {
        log('info', 'Resolving: %s#%d', id, num)
        resolve('result-' + id + '#' + num)
      }, delay)
    })
  }

  var onSuccess = function () {
    log('info', 'Succeeded: %s', id)
  }

  var onFailure = function (err) {
    log('error', 'Failed: %s: %s', id, err.message)
  }

  var onFulfilled = function (evt) {
    log('info', 'Got result: %s', evt.data.result)
    log('info', 'New pool size is %d', evt.target.size())
  }

  var onRejected = function (evt) {
    log('error', 'Got error: %s', evt.data.error.message)
    log('info', 'New pool size is %d', evt.target.size())
  }

  var startDemo = function (newID) {
    id = newID
    cnt = 0
    log('info', 'Starting: %s', id)
    return id
  }

  var runDemo = function (id) {
    return loadProducer(id)
      .then(function (func) {
        return func(getPromise)
      })
      .then(function (gen) {
        var pool = new PromisePool(gen, 3)
        pool.addEventListener('fulfilled', onFulfilled)
        pool.addEventListener('rejected', onRejected)
        return pool.start()
      })
  }

  var supportsGenerators = function () {
    try {
      eval('(function*(){})()')  // eslint-disable-line no-eval
      return true
    } catch (e) {
      return false
    }
  }

  var demos = ['function', 'iterator']
  if (supportsGenerators()) {
    demos.push('generator')
  } else {
    log('warn', 'Not running generators demo due to lack of platform support')
  }

  demos.reduce(function (prev, curr) {
    return prev
      .then(function () { return curr })
      .then(startDemo)
      .then(runDemo)
      .then(onSuccess, onFailure)
  }, Promise.resolve())
    .then(function () {
      log('info', 'Completed')
    }, function (err) {
      log('error', 'Unexpected error: %s', err.message)
    })
})(this)
