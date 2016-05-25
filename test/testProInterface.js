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
    mockIOCache,
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
    mockIOCache = pretendr(function () {});
    mockIOCache.template({
      get: function () {}
    });
    proInterface = injectr('../lib/proInterface.js', {
      'events': require('events'),
      'io-cache': mockIOCache.mock,
      'util': require('util'),
      'websocket': {
        w3cwebsocket: mockWebSocket.mock
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
  it("creates caches", function () {
    proInterface();
    expect(mockIOCache.instances.length).to.be.ok();
  });
  describe("created presentations cache", function () {
    var
      key;
    beforeEach(function () {
      createAndOpenInstance();
      key = random.string();
      mockIOCache.calls[0].args[0](key, cb.mock);
    });
    it("sends a presentationRequest", function () {
      expect(sendCallArgument()).to.eql({
        action: 'presentationRequest',
        presentationPath: key
      });
    });
    it("runs the callback when presentationCurrent is received", function () {
      var item = createFullProPresenterItem(key);
      sendMessageFromWs(item);
      expect(cb.calls).to.have.length(1);
    });
    it("does not run the callback for a different item", function () {
      var
        differentItem = createFullProPresenterItem(random.string()),
        item = createFullProPresenterItem(key);
      sendMessageFromWs(differentItem);
      expect(cb.calls).to.have.length(0);
      sendMessageFromWs(item);
      expect(cb.calls).to.have.length(1);
    });
    it("only runs the callback once", function () {
      var item = createFullProPresenterItem(key);
      sendMessageFromWs(item);
      sendMessageFromWs(item);
      expect(cb.calls).to.have.length(1);
    });
  });
  describe("created stage display layouts cache", function () {
    beforeEach(function () {
      createAndOpenInstance();
      mockIOCache.calls[1].args[0]('', cb.mock);
    });
    it("requests the stage display layouts list", function () {
      expect(sendCallArgument()).to.eql({
        action: 'stageDisplaySets'
      });
    });
    it("passes the full set to the callback", function () {
      var sets = random.unique(random.string, random.natural({ max: 5 }));
      sendMessageFromWs({
        'action': 'stageDisplaySets',
        'stageDisplaySets': sets,
        'stageDisplayIndex':1
      });
      expect(cb.calls[0].args[0]).to.eql(sets);
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
    var stageDisplayData;
    beforeEach(createAndOpenInstance);
    beforeEach(authInstance);
    beforeEach(function() {
      stageDisplayData = mockIOCache.instances[1];
    });
    it("gets the list of stage displays", function () {
      proInterfaceInstance.getStageDisplayLayouts(cb.mock);
      expect(stageDisplayData.get.calls).to.have.length(1);
      expect(stageDisplayData.get.calls[0].args[0]).to.be.a('function');
    });
    it("passes an array of layouts to the callback", function () {
      var layouts = random.unique(random.string, random.natural({ max: 10 }));
      proInterfaceInstance.getStageDisplayLayouts(cb.mock);
      stageDisplayData.get.calls[0].callback(layouts);
      expect(cb.calls[0].args[0]).to.eql(layouts);
    });
  });
  describe("#setStageDisplayLayout", function () {
    var stageDisplayData;
    beforeEach(createAndOpenInstance);
    beforeEach(authInstance);
    beforeEach(function () {
      stageDisplayData = mockIOCache.instances[1];
    });
    it("verifies the stageDisplaySets if not already done so", function () {
      proInterfaceInstance.setStageDisplayLayout(0);
      expect(stageDisplayData.get.calls).have.length(1);
    });
    it("sends the request to change the stage display", function () {
      proInterfaceInstance.setStageDisplayLayout(0);
      stageDisplayData.get.calls[0].callback([]);
      expect(sendCallArgument()).to.eql({
        action: 'stageDisplaySetIndex',
        stageDisplayIndex: 0
      });
    });
    it("accepts a layout name", function () {
      var
        selectedLayout,
        layouts = random.unique(
          random.string, random.natural({ min: 2, max: 10 }));
      selectedLayout = random.natural({ max: layouts.length - 1 });
      proInterfaceInstance.setStageDisplayLayout(selectedLayout);
      stageDisplayData.get.calls[0].callback(layouts);
      expect(sendCallArgument()).to.eql({
        action: 'stageDisplaySetIndex',
        stageDisplayIndex: selectedLayout
      });
    });
    it("fires a callback when done", function () {
      proInterfaceInstance.setStageDisplayLayout(0, cb.mock);
      stageDisplayData.get.calls[0].callback([random.string()]);
      expect(cb.calls).to.have.length(0);
      sendMessageFromWs({
        action: 'stageDisplaySetIndex',
        stageDisplayIndex: 0
      });
      expect(cb.calls).to.have.length(1);

      // should not pass an error
      expect(cb.calls[0].args).to.have.property(0, undefined);

    });
    it("passes an error to the callback if layout is invalid", function () {
      var
        invalidLayoutMessage = 'Invalid layout',
        layouts,
        selected = random.natural({ min: 5, max: 20 });
      layouts = random.unique(
        random.string, random.natural({ min: 2, max: selected }));
      proInterfaceInstance.setStageDisplayLayout(selected, cb.mock);
      stageDisplayData.get.calls[0].callback(layouts);
      expect(cb.calls[0].args[0]).to.equal(invalidLayoutMessage);

      // Use the first layout in the list, then slice it out to make it invalid.
      proInterfaceInstance.setStageDisplayLayout(layouts[0], cb.mock);
      stageDisplayData.get.calls[0].callback(layouts.slice(1));

      expect(cb.calls[1].args[0]).to.equal(invalidLayoutMessage);
    });
  });
  describe("slideChange event", function () {
    var
      item,
      mockCache,
      slideNum;
    beforeEach(createAndOpenInstance);
    beforeEach(authInstance);
    beforeEach(function () {
      mockCache = mockIOCache.instances[0];
      proInterfaceInstance.on('slideChange', cb.mock);
      item = createFullProPresenterItem(random.sentence() + 'pro6');
      slideNum = random.natural({ max: item.numSlides - 1 });
      sendMessageFromWs({
        'action': 'presentationTriggerIndex',
        'presentationPath': item.presentation.presentationPath,
        'slideIndex': slideNum
      });
    });
    it("requests slide details on presentationTriggerIndex", function () {
      expect(mockCache.get.calls).to.have.length(1);
      expect(mockCache.get.calls[0].args).to.have.property(
        0, item.presentation.presentationPath);
    });
    it("emits when the callback is received", function () {
      mockCache.get.calls[0].callback(createFullProPresenterItem(
        item.presentation.presentationPath));
      expect(cb.calls).to.have.length(1);
    });
    it("sends the presentationPath to the listener", function () {
      mockCache.get.calls[0].callback(item);
      expect(cb.calls[0].args[0]).to.have.property(
        'presentationPath', item.presentation.presentationPath);
    });
    it("sends slide details to the listener", function () {
      mockCache.get.calls[0].callback(item);
      expect(cb.calls[0].args[0]).to.have.property(
        'currentSlide');
      expect(cb.calls[0].args[0].currentSlide).to.have.property(
        'slideIndex', slideNum.toString());
      expect(cb.calls[0].args[0].currentSlide.slideText)
        .to.equal(findSlideByNumber(item, slideNum).slideText)
        .and.to.be.ok(); // Make sure the test has got it right.
    });
  });

  function findSlideByNumber(item, slideNum) {
    var ret;
    item.presentation.presentationSlideGroups.some(function (group) {
      return group.groupSlides.forEach(function (slide) {
        if (parseInt(slide.slideIndex, 10) === slideNum) {
          ret = slide;
          return true;
        }
      });
    });
    return ret;
  }

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
    var slideIndex = 0;
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
                  random.natural({ min: 1, max: 4 })
                ).join('\r\n'),
                'slideNotes': '' + (random.bool() && random.sentence()),
                'slideImage': ''
              };
            }, random.natural({ min: 2, max: 5 }))
          };
      }, random.natural({ min : 2, max : 5 })),
      'presentationCurrentLocation': random.natural()
    },
    numSlides: slideIndex
    };
  }
});