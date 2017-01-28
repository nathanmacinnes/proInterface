var
  EventEmitter = require('events').EventEmitter,
  IOCache = require('io-cache'),
  ObjectSocketInterface = require('./ObjectSocketInterface.js'),
  ProInterfacePresentation = require('./proInterfacePresentation.js'),
  util = require('util'),
  WebSocket = require('websocket').w3cwebsocket;

util.inherits(ProInterface, EventEmitter);

module.exports = ProInterface;
ProInterface.ProInterface = ProInterface;

function ProInterface(host, port, password) {
  var
    presentations,
    proInterface = this,
    socketInterface,
    stageDisplayLayouts,
    ws = new WebSocket('ws://' + host + ':' + port + '/remote');
  socketInterface = new ObjectSocketInterface(ws);

  presentations = new IOCache(function (key, cb) {
    socketInterface.on('presentationCurrent', onceForItem);
    socketInterface.send('presentationRequest', {
      presentationPath: key
    });
    function onceForItem(message) {
      if (message.presentation.presentationName === key) {
        socketInterface.removeListener('presentationCurrent', onceForItem);
        cb(message);
      }
    }
  });
  stageDisplayLayouts = new IOCache(function (cb) {
    socketInterface.send('stageDisplaySets');
    socketInterface.on('stageDisplaySets', function (message) {
      cb(message.stageDisplaySets);
    });
  });
  socketInterface.on('open', authenticate);
  socketInterface.on('presentationTriggerIndex', function (original) {
    new ProInterfacePresentation(original);
    proInterface.emit('slideChange');
  });

  this.getStageDisplayLayouts = getStageDisplayLayouts;

  function authenticate() {
    socketInterface.send('authenticate', {
      protocol: '600',
      password: password
    });
  }
  function getStageDisplayLayouts(cb) {
    stageDisplayLayouts.get(cb);
  }
}
