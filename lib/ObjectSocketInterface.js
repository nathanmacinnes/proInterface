var
  EventEmitter = require('events').EventEmitter,
  util = require('util');
util.inherits(ObjectSocketInterface, EventEmitter);
module.exports = ObjectSocketInterface;

function ObjectSocketInterface(ws) {
  var osi = this;
  this.send = function (action, object) {
    var copy = JSON.parse(JSON.stringify(object || {}));
    copy.action = action;
    ws.send(JSON.stringify(copy));
  };
  ws.onopen = function () {
    osi.emit('open');
  };
  ws.onmessage = function (rawMessage) {
    var
      action,
      message = JSON.parse(rawMessage);
    action = message.action;
    delete message.action;
    osi.emit(action, message);
  };
}
