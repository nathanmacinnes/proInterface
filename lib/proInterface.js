var
  EventEmitter = require('events').EventEmitter,
  IOCache = require('io-cache'),
  util = require('util'),
  WebSocket = require('websocket').w3cwebsocket;

util.inherits(ProInterface, EventEmitter);

module.exports = createProInterface;

function ProInterface() {}

function createProInterface(host, port, password) {
  var
    presentations,
    pro = new ProInterface(),
    stageDisplayLayouts,
    ws = new WebSocket('ws://' + host + ':' + port + '/remote'),
    wsReceiver = new EventEmitter();

  presentations = new IOCache(function (key, cb) {
    send({
      action: 'presentationRequest',
      presentationPath: key
    });
    wsReceiver.on('presentationCurrent', onceForItem);

    function onceForItem(message) {
      if (message.presentation.presentationName === key) {
        wsReceiver.removeListener('presentationCurrent', onceForItem);
        cb(message);
      }
    }
  });

  stageDisplayLayouts = new IOCache(function (key, cb) {
    send({
      action: 'stageDisplaySets'
    });
    wsReceiver.on('stageDisplaySets', function (message) {
      cb(message.stageDisplaySets);
    });
  });

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
  wsReceiver.on('presentationTriggerIndex', function (triggerMessage) {
    presentations.get(triggerMessage.presentationPath, function (itemDetailsMessage) {
      var
        currentSlide,
        groups = itemDetailsMessage.presentation.presentationSlideGroups;
      groups.some(function (group) {
        var possibleSlide = group.groupSlides.find(function (slide) {
          return parseInt(slide.slideIndex, 10) === triggerMessage.slideIndex;
        });
        if (possibleSlide !== undefined) {
          currentSlide = possibleSlide;
          return true;
        }
      });
      pro.emit('slideChange', {
        presentationPath: itemDetailsMessage.presentation.presentationName,
        currentSlide: currentSlide
      });
    });
  });

  pro.getStageDisplayLayouts = function (cb) {
    stageDisplayLayouts.get(cb);
  };

  pro.setStageDisplayLayout = function (selectedLayout, callback) {
    callback = callback || function () {};
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
