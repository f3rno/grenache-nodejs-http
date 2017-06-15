/* eslint-env mocha */

'use strict'

const assert = require('assert')
const spawn = require('child_process').spawn
const path = require('path')

const parallel = require('async/parallel')
const { PeerRPCClient, Link } = require('./../')
const { bootTwoGrapes, killGrapes } = require('./helper')

let rpc, grapes
describe('RPC integration', () => {
  before(function (done) {
    this.timeout(8000)

    bootTwoGrapes((err, g) => {
      if (err) throw err

      grapes = g
      grapes[0].once('announce', (msg) => {
        done()
      })

      const f = path.join(__dirname, '..', 'examples', 'rpc_server.js')
      rpc = spawn('node', [ f ])
    })
  })

  after(function (done) {
    this.timeout(5000)
    rpc.on('close', () => {
      killGrapes(grapes, done)
    })
    rpc.kill()
  })

  it('messages with the rpc worker', (done) => {
    const link = new Link({
      grape: 'http://127.0.0.1:30001'
    })
    link.start()

    const peer = new PeerRPCClient(link, {})
    peer.init()

    const reqs = 5
    const tasks = []

    function createTask () {
      return function task (cb) {
        peer.map('rpc_test', 'hello', { timeout: 10000 }, (err, data) => {
          cb(err, data)
        })
      }
    }

    for (let i = 0; i < reqs; i++) {
      tasks.push(createTask())
    }

    setTimeout(() => {
      parallel(tasks, (err, data) => {
        if (err) throw err
        assert.equal(data[0][0], 'world')
        assert.equal(data.length, 5)
        done()
      })
    }, 5000)
  }).timeout(15000)
})
