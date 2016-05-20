var
  EventEmitter = require('events').EventEmitter,
  util = require('util'),
  WebSocket = require('websocket').w3cwebsocket;

util.inherits(ProInterface, EventEmitter);

module.exports = createProInterface;

function ProInterface() {}

function createProInterface(url, port, password) {
  var
    cache = {
      presentations : {}
    },
    pro = new ProInterface(),
    ws = new WebSocket('ws://' + url + ':' + port + '/remote'),
    wsReceiver = new EventEmitter();
  ws.onopen = function () {
    send({
      'action' : 'authenticate',
      'protocol' : '600',
      'password' : password
    });
  };
  ws.onmessage = function (event) {
    var message = JSON.parse(event.data);
    wsReceiver.emit(message.action, message);
  };

  wsReceiver.on('authenticate', function (message) {
    var
      controller = false,
      error = null;
    if (message.error !== '') {
      error = message.error;
    }
    if (message.controller === 1) {
      controller = true;
    }
    pro.emit('authReceived', error, controller);
  });
  wsReceiver.on('presentationTriggerIndex', function (message) {
    send({
      'action' : 'presentationRequest',
      'presentationPath' : message.presentationPath
    });
    if (cache.presentations && cache.presentations[message.presentationPath]) {
      return pro.emit(
        'slideChange', cache.presentations[message.presentationPath]);
    }
    wsReceiver.once(
      'presentationCurrent:' + message.presentationPath,
      function (msg) {
        pro.emit('slideChange', msg.presentation);
      }
    );
  });
  wsReceiver.on('presentationCurrent', function (message) {
    cache.presentations[message.presentation.presentationName] =
      message.presentation;
    wsReceiver.emit(
      'presentationCurrent:' + message.presentation.presentationName, message);
  });

  pro.getStageDisplayLayouts = function (cb) {
    send({
      'action' : 'stageDisplaySets'
    });
    wsReceiver.once('stageDisplaySets', function (message) {
      cb(
        message.stageDisplaySets,
        message.stageDisplaySets[message.stageDisplayIndex]
      );
      cache.stageDisplaySets = message.stageDisplaySets;
    });
  };

  pro.setStageDisplayLayout = function (selectedLayout, callback) {
    callback = callback || function () {};
    if (cache.stageDisplaySets) {
      return setLayout(cache.stageDisplaySets);
    }
    pro.getStageDisplayLayouts(setLayout);

    function setLayout(layouts) {
      if (typeof selectedLayout === 'string') {
        selectedLayout = layouts.indexOf(selectedLayout);
      }
      if (layouts[selectedLayout] === undefined) {
        callback("Invalid layout");
      }
      send({
        'action' : 'stageDisplaySetIndex',
        'stageDisplayIndex' : selectedLayout
      });
      wsReceiver.once('stageDisplaySetIndex', callback);
    }
  };

  return pro;

  function send(message) {
    ws.send(JSON.stringify(message));
  }
}
