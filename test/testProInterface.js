var
  Chance = require('chance'),
  expect = require('expect.js'),
  injectr = require('injectr'),
  pretendr = require('pretendr'),
  seed;

// Pass a seed with the environment variable.
// The environment variable should normally be left blank, and only populated
// when repeatable results are required for debugging.
seed = process.env.TEST_SEED || (new Chance()).natural();

// Print the current seed so that results can be repeated.
console.log('\nPseudorandom number seed: ' + seed.toString());

describe('proInterface', function () {
  var
    cb,
    random,
    mockWebSocket,
    mockWsInstance,
    proInterface,
    proInterfaceInstance;

  beforeEach(function () {

    // Ensure results are repeatable but seeded differently for each test.
    random = new Chance(this.currentTest.title, seed);

    cb = pretendr(function () {});
    mockWebSocket = pretendr(function () {});
    mockWebSocket.template({
      send : function () {}
    });
    proInterface = injectr('../lib/proInterface.js', {
      'events' : require('events'),
      'util' : require('util'),
      'websocket' : {
        w3cwebsocket : mockWebSocket.mock
      }
    });
  });
  it("creates a new websocket with correct URL", function () {
    var
      ip = random.ip(),
      port = random.natural({ max: 99999 });
    expect(mockWebSocket.instances).to.have.length(0);
    proInterface(ip, port);
    expect(mockWebSocket.instances).to.have.length(1);
    expect(mockWebSocket.calls[0].args[0])
      .to.equal('ws://' + ip + ':' + port + '/remote');
  });
  it("sends an auth message after the websocket's onopen handler", function () {
    var password = random.string();
    proInterface('', '', password);
    mockWsInstance = mockWebSocket.instances[0];
    expect(mockWsInstance.send.calls).to.have.length(0);
    mockWsInstance.mock.onopen();
    expect(mockWsInstance.send.calls).to.have.length(1);
    expect(sendCallArgument()).to.eql({
      'action': 'authenticate',
      'protocol': '600',
      'password' : password
    });
  });
  describe('handling an auth response', function () {
    beforeEach(createAndOpenInstance);
    beforeEach(function () {
      proInterfaceInstance.on('authReceived', cb.mock);
    });
    it("fires authReceived event if the function is provided", function () {
      sendMessageFromWs({
        'action': 'authenticate',
        'error':'',
        'authenticated':1,
        'controller':1
      });
      expect(cb.calls).to.have.length(1);
    });
    it("passes null as error if one isn't given", function () {
      sendMessageFromWs({
        'action': 'authenticate',
        'error': '','authenticated':1,
        'controller':1
      });
      expect(cb.calls[0].args[0]).to.equal(null);
    });
    it("passes the error as the first argument", function () {
      var error = random.string();
      sendMessageFromWs({
        'action': 'authenticate',
        'error' : error,
        'authenticated' : 0
      });
      expect(cb.calls[0].args[0]).to.equal(error);
    });
    it("passes controller status to the second argument", function () {
      var controllerStatus = random.natural({ max : 1 });
      sendMessageFromWs({
        'action': 'authenticate',
        'error' : '',
        'authenticated' : 1,
        'controller' : controllerStatus
      });
      expect(cb.calls[0].args[1]).to.equal(!!controllerStatus);
    });
    it("does not fire for actions other than authentication", function () {

      // string length must not equal 11 ('authenticate'.length)
      var action = random.string({ length : 10 });

      sendMessageFromWs({
        'action' : action
      });
      expect(cb.calls).to.have.length(0);
    });
  });
  describe("#getStageDisplayLayouts", function() {
    beforeEach(createAndOpenInstance);
    beforeEach(authInstance);
    it("sends a request to get the list of stage displays", function () {
      proInterfaceInstance.getStageDisplayLayouts(cb.mock);
      expect(sendCallArgument()).to.eql({
        'action': 'stageDisplaySets'
      });
    });
    it("returns the reply to the callback", function () {
      proInterfaceInstance.getStageDisplayLayouts(cb.mock);
      sendMessageFromWs({
        'action': 'stageDisplaySets',
        'stageDisplaySets':['Default','Text only','Timer'],
        'stageDisplayIndex':2
      });
      expect(cb.calls).to.have.length(1);
      expect(cb.calls[0].args[0]).to.eql(['Default', 'Text only', 'Timer']);
      expect(cb.calls[0].args[1]).to.equal('Timer');
    });
    it("calls the callback once only", function () {
      proInterfaceInstance.getStageDisplayLayouts(cb.mock);
      sendMessageFromWs({'action': 'stageDisplaySets','stageDisplaySets':[],'stageDisplayIndex':0});
      sendMessageFromWs({'action': 'stageDisplaySets','stageDisplaySets':[],'stageDisplayIndex':0});
      expect(cb.calls).to.have.length(1);
    });
  });
  describe("#setStageDisplayLayout", function () {
    beforeEach(createAndOpenInstance);
    beforeEach(authInstance);
    it("verifies the stageDisplaySets if not already done so", function () {
      proInterfaceInstance.setStageDisplayLayout(0);
      expect(sendCallArgument()).to.eql({
        'action': 'stageDisplaySets'
      });
    });
    it("sends the request to change the stage display", function () {
      proInterfaceInstance.setStageDisplayLayout(0);
      sendMessageFromWs({'action': 'stageDisplaySets','stageDisplaySets':[],'stageDisplayIndex':0});
      expect(sendCallArgument()).to.eql({
        'action': 'stageDisplaySetIndex',
        'stageDisplayIndex': 0
      });
    });
    it("sends the request immediately if it already has the layout list", function () {
      proInterfaceInstance.getStageDisplayLayouts(function () {});
      sendMessageFromWs({'action': 'stageDisplaySets','stageDisplaySets':['Default','Text'],'stageDisplayIndex':0});
      proInterfaceInstance.setStageDisplayLayout(1);
      expect(sendCallArgument()).to.eql({
        'action': 'stageDisplaySetIndex',
        'stageDisplayIndex': 1
      });
    });
    it("accepts a layout name", function () {
      proInterfaceInstance.setStageDisplayLayout('Default');
      sendMessageFromWs({
        'action': 'stageDisplaySets',
        'stageDisplaySets':['Default','Text'],
        'stageDisplayIndex':1
      });
      expect(sendCallArgument()).to.eql({
        'action': 'stageDisplaySetIndex',
        'stageDisplayIndex': 0
      });
    });
    it("fires a callback when done", function () {
      proInterfaceInstance.setStageDisplayLayout(0, cb.mock);
      sendMessageFromWs({
        'action': 'stageDisplaySets',
        'stageDisplaySets':['Default','Text'],
        'stageDisplayIndex':1
      });
      expect(cb.calls).to.have.length(0);
      sendMessageFromWs({
        'action': 'stageDisplaySetIndex',
        'stageDisplayIndex':0
      });
      expect(cb.calls).to.have.length(1);
      expect(cb.calls[0].args).to.have.property(0, undefined);
    });
    it("passes an error to the callback if layout is invalid", function () {
      proInterfaceInstance.setStageDisplayLayout(3, cb.mock);
      sendMessageFromWs({
        'action': 'stageDisplaySets',
        'stageDisplaySets':['Default','Text'],
        'stageDisplayIndex':1
      });
      expect(cb.calls).to.have.length(1);
      expect(cb.calls[0].args[0]).to.equal('Invalid layout');
      proInterfaceInstance.setStageDisplayLayout('invalid', cb.mock);
      expect(cb.calls).to.have.length(2);
      expect(cb.calls[1].args[0]).to.equal('Invalid layout');
    });
  });
  describe("slideChange event", function () {
    beforeEach(createAndOpenInstance);
    beforeEach(authInstance);
    beforeEach(function () {
      proInterfaceInstance.on('slideChange', cb.mock);
    });
    it("gets slide details when presentationTriggerIndex fires", function () {
      var title = random.sentence() + 'pro6';
      sendMessageFromWs({
        'action': 'presentationTriggerIndex',
        'presentationPath': title,
        'slideIndex':1
      });
      expect(sendCallArgument()).to.eql({
        'action': 'presentationRequest',
        'presentationPath': title
      });
    });
    it("fires once when slide details are received", function () {
      var
        itemDetails,
        title = random.sentence() + 'pro6';
      sendMessageFromWs({
        'action': 'presentationTriggerIndex',
        'presentationPath': title,
        'slideIndex':1
      });
      expect(cb.calls).to.have.length(0);
      itemDetails = createFullProPresenterItem(title);
      sendMessageFromWs(itemDetails);
      expect(cb.calls).to.have.length(1);

      // only once
      sendMessageFromWs(itemDetails);
      expect(cb.calls).to.have.length(1);
    });
    it("fires only with correct slide details", function () {
      var
        item,
        titles = random.unique(function () {
          return random.sentence() + 'pro6';
        }, 2);

      sendMessageFromWs({
        action: 'presentationTriggerIndex',
        presentationPath: titles[0],
        slideIndex: 1
      });
      sendMessageFromWs(createFullProPresenterItem(titles[1]));
      expect(cb.calls).to.have.length(0);
      item = createFullProPresenterItem(titles[0]);
      sendMessageFromWs(item);
      expect(cb.calls).to.have.length(1);
      expect(cb.calls[0].args[0]).to.eql(item.presentation);
    });
    it("gets item details only once", function () {
      var
        item,
        title = random.sentence() + 'pro6';
      item = createFullProPresenterItem(title);
      sendMessageFromWs(item);
      sendMessageFromWs({
        action: 'presentationTriggerIndex',
        presentationPath: title,
        slideIndex: 1
      });
      expect(cb.calls).to.have.length(1);
      expect(cb.calls[0].args[0]).to.eql(item.presentation);
    });
  });

  function createAndOpenInstance() {
    proInterfaceInstance = proInterface();
    mockWsInstance = mockWebSocket.instances[
      mockWebSocket.instances.length - 1];
    mockWsInstance.mock.onopen();
  }
  function authInstance() {
    sendMessageFromWs({
      'action': 'authenticate',
      'error': '',
      'authenticated': 1,
      'controller': 1
    });

    // start each test from scratch
    mockWsInstance.send.calls.length = 0;
  }
  function sendCallArgument(callNum) {
    var calls = mockWsInstance.send.calls;
    if (callNum === undefined) {
      callNum = calls.length - 1;
    }
    return JSON.parse(calls[callNum].args[0]);
  }
  function sendMessageFromWs(messageObj) {
    mockWsInstance.mock.onmessage({
      data: JSON.stringify(messageObj)
    });
  }
  function createFullProPresenterItem(title) {
    var slideIndex;
    return {
      'action': 'presentationCurrent',
      'presentation': {
        'presentationName': title,
        'presentationHasTimeline': random.natural({ max : 1 }),
        'presentationSlideGroups': random.n(function () {
          return {
            'groupName': random.string(),
            'groupColor': random.n(function () {
                return random.floating() % 1;
              }, 4).join(' '),
            'groupSlides': random.n(function () {
              return {
                'slideIndex': (slideIndex++).toString(),
                'slideAttachmentMask': 0,
                'slideLabel': null,
                'slideColor': '',
                'slideTransitionType': -1,
                'slideEnabled': 1,
                'slideText': random.n(
                  random.sentence,
                  random.natural({ max: 4 })
                ).join('\r\n'),
                'slideNotes': '' + (random.bool() && random.sentence()),
                'slideImage': ''
              };
            }, random.natural({ max: 4 }))
          };
      }, random.natural({ min : 1, max : 4 })),
      'presentationCurrentLocation': random.natural()
    }};
  }
});