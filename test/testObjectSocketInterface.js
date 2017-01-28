var
  expect = require('expect.js'),
  injectr = require('injectr'),
  pretendr = require('pretendr'),
  seedTest = require('./seedTest.js');

describe('ObjectSocketInterface', function () {
  var
    ObjectSocketInterface,
    random,
    mockEvents,
    mockInherits,
    mockWsInstance,
    osi;

  beforeEach(seedTest);
  beforeEach(function () {
    mockEvents = {
      EventEmitter : {}
    };
    mockInherits = pretendr(function () {});
    ObjectSocketInterface = injectr('../lib/ObjectSocketInterface.js', {
      util: {
        inherits : mockInherits.mock
      },
      events: mockEvents
    });
    random = seedTest.random;
  });
  it("implements EventEmitter", function () {
    expect(mockInherits.calls[0].args)
      .to.have.property(0, ObjectSocketInterface)
      .and.to.have.property(1, mockEvents.EventEmitter);
  });
  describe("#send", function () {
    beforeEach(createOSIInstance);
    beforeEach(function () {
      mockWsInstance.mock.readyState = 'OPEN';
    });
    it("passes sends to an open websocket", function () {
      osi.send();
      expect(mockWsInstance.send.calls).to.have.length(1);
    });
    it("passes the first argument as an action", function () {
      var action = random.string();
      osi.send(action);
      expect(JSON.parse(mockWsInstance.send.calls[0].args[0])).to.have.property(
        'action', action
      );
    });
    it("includes the next argument in the object", function () {
      var
        action = random.string(),
        o = randomObject();
      osi.send(action, o);
      o.action = action;
      expect(JSON.parse(mockWsInstance.send.calls[0].args[0])).to.eql(o);
    });
    it("doesn't modify the supplied object", function () {
      var
        action = random.string(),
        obj = randomObject(),
        stringified;
      stringified = JSON.stringify(obj);
      osi.send(action, obj);
      expect(obj).to.eql(JSON.parse(stringified));
    });
  });
  describe("open event handling", function () {
    var emit;
    beforeEach(createOSIInstance);
    beforeEach(function () {
      emit = pretendr(function () {});
      osi.emit = emit.mock;
    });
    it("fires an open event when websocket is open", function () {
      mockWsInstance.mock.onopen();
      expect(emit.calls[0].args).to.have.property(0, 'open');
    });
  });
  describe("WS message handling", function () {
    var emit;
    beforeEach(createOSIInstance);
    beforeEach(function () {
      emit = pretendr(function () {});
      osi.emit = emit.mock;
    });
    it("calls the object's emit", function () {
      mockWsInstance.mock.onmessage('{}');
      expect(emit.calls).to.have.length(1);
    });
    it("passes the action parameter as the event", function () {
      var action = random.string();
      mockWsInstance.mock.onmessage('{"action":"' + action + '"}');
      expect(emit.calls[0].args).to.have.property(0, action);
    });
    it("passes the rest of the parameters as the event", function () {
      var obj = randomObject();
      mockWsInstance.mock.onmessage(JSON.stringify(obj));
      expect(emit.calls[0].args[1]).to.eql(obj);
    });
    it("excludes the action from the passed object", function () {
      var obj = randomObject();
      obj.action = random.string();
      mockWsInstance.mock.onmessage(JSON.stringify(obj));
      delete obj.action;
      expect(emit.calls[0].args[1]).not.to.have.property('action');
    });
  });
  function createOSIInstance() {
    mockWsInstance = pretendr({
      send: function () {},
      close: function () {}
    });
    osi = new ObjectSocketInterface(mockWsInstance.mock);
  }
  function randomObject(canBeString) {
    var obj = {};

    // Heavily weighted in favour of returning a string to reduce stack size
    if (canBeString && random.weighted([true, false], [8, 1])) {
      return random.string();
    }
    random.unique(random.string, random.natural({ min: 2, max: 10 }))
      .forEach(function (property) {
        obj[property] = randomObject(true);
      });
    return obj;
  }
});
