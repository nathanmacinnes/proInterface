var
  expect = require('expect.js'),
  injectr = require('injectr'),
  pretendr = require('pretendr'),
  seedTest = require('./seedTest.js');

describe('ProInterface', function () {
  var
    mockIOCache,
    mockOsi,
    mockPresentation,
    mockWs,
    ProInterface,
    random;
  beforeEach(seedTest);
  beforeEach(function () {
    mockOsi = pretendr();
    mockOsi.template({
      on : function () {},
      send : function () {},
      removeListener : function () {}
    });
    mockWs = pretendr({
      'w3cwebsocket' : function () {}
    });
    mockIOCache = pretendr();
    mockIOCache.template({
      get : function () {}
    });
    mockPresentation = pretendr();
    ProInterface = injectr('../lib/proInterface.js', {
      './ObjectSocketInterface.js' : mockOsi.mock,
      './proInterfacePresentation.js' : mockPresentation.mock,
      'websocket' : mockWs.mock,
      'io-cache' : mockIOCache.mock,
    });
    random = seedTest.random;
  });
  it("has a property equal to itself", function () {
    expect(ProInterface).to.have.property('ProInterface', ProInterface);
  });
  describe("created instance", function () {
    var
      host,
      instance,
      openEventHandlerCall,
      password,
      port,
      socketInterface;
    beforeEach(function () {
      host = random.string();
      port = random.natural();
      password = random.string();
      instance = new ProInterface(host, port, password);
      socketInterface = mockOsi.instances[0].pretendr;
      openEventHandlerCall = socketInterface.on.findCall(['open']);
    });
    it("creates a websocket with the supplied details", function () {
      expect(mockWs.w3cwebsocket.instances).to.have.length(1);
      expect(mockWs.w3cwebsocket.calls[0].args).to.have.property(
        0, 'ws://' + host + ':' + port.toString() + '/remote');
    });
    it("passes the created websocket to an ObjectSocketInterface", function () {
      expect(mockOsi.instances).to.have.length(1);
      expect(mockOsi.calls[0].args).to.have.property(
        0, mockWs.w3cwebsocket.instances.mock);
    });
    it("attaches a handler to the OSI's open event", function () {
      expect(openEventHandlerCall).to.be.ok();
      expect(openEventHandlerCall.args[1]).to.be.a('function');
    });
    it("doesn't attempt to send anything before the OSI opens", function () {
      expect(socketInterface.send.calls).to.have.length(0);
    });
    it("sends an authentication message with the handler", function () {
      openEventHandlerCall.args[1]();
      expect(socketInterface.send.calls).to.have.length(1);
      expect(socketInterface.send.calls[0].args[0]).to.equal('authenticate');
      expect(socketInterface.send.calls[0].args[1]).to.eql({
        'protocol' : '600',
        'password' : password
      });
    });
    it("creates a cache for presentations", function () {
      var ioCacheCall = mockIOCache.findCall(function (arg) {
        return arg.length === 2;
      });
      expect(ioCacheCall).to.be.ok();
      ioCacheCall.args[0]();
      expect(mockOsi.instances[0].pretendr.send.calls[0].args[0])
        .to.equal('presentationRequest');
    });
    it("creates a cache for stage display layouts", function () {
      var ioCacheCall = mockIOCache.findCall(function (arg) {
        return arg.length === 1;
      });
      expect(ioCacheCall).to.be.ok();
      ioCacheCall.args[0]();
      expect(mockOsi.instances[0].pretendr.send.calls[0].args[0])
        .to.equal('stageDisplaySets');
    });
    describe("presentations cache init function", function () {
      var initFn;
      beforeEach(function () {
        initFn = mockIOCache.findCall(function (arg) {
          return arg.length === 2;
        }).args[0];
      });
      it("sends a request with the presentationPath", function () {
        var key = random.string();
        initFn(key);
        expect(mockOsi.instances[0].pretendr.send.calls[0].args[1])
          .to.have.property('presentationPath', key);
      });
      it("attaches a handler to presentationCurrent", function () {
        initFn();
        var eventHandlerCall = socketInterface.on.findCall(
          ['presentationCurrent']);
        expect(eventHandlerCall).to.be.ok();
        expect(eventHandlerCall.args[1])
          .to.be.a('function');
      });
      describe("presentationCurrent handler", function () {
        var cb;
        beforeEach(function () {
          cb = pretendr();
        });
        describe("with matching key", function () {
          var
            key,
            presentationCurrentCall;
          beforeEach(function () {
            key = random.string();
            initFn(key, cb.mock);
            presentationCurrentCall = socketInterface.on.findCall(
              ['presentationCurrent']);
            presentationCurrentCall.args[1]({
              'presentation' : {
                'presentationName' : key
              }
            });
          });
          it("runs the callback", function () {
            expect(cb.calls).to.have.length(1);
          });
          it("removes the listener", function () {
            expect(socketInterface.removeListener.calls[0].args)
              .to.have.property(0, 'presentationCurrent')
              .and.to.have.property(1, presentationCurrentCall.args[1]);
          });
        });
        describe("with non-matching key", function () {
          var keys;
          beforeEach(function () {
            keys = random.unique(random.string, 2);
            initFn(keys[0], cb.mock);
            socketInterface.on.calls[1].args[1]({
              'presentation' : {
                'presentationName' : keys[1]
              }
            });
          });
          it("doesn't run the callback", function () {
            expect(cb.calls).to.have.length(0);
          });
          it("doesn't remove the listener", function () {
            expect(socketInterface.removeListener.calls).to.have.length(0);
          });
        });
      });
      describe("stage display cache init function", function () {
        var
          cb,
          ioCacheCall,
          stageDisplaySetsEvent;
        beforeEach(function () {
          cb = pretendr();
          ioCacheCall = mockIOCache.findCall(function (arg) {
            return arg.length === 1;
          });
          ioCacheCall.args[0](cb.mock);
          stageDisplaySetsEvent = socketInterface.on.findCall(
            ['stageDisplaySets']);
        });
        it("sends a request to get the stage displays", function () {
          expect(socketInterface.send.findCall(['stageDisplaySets']))
            .to.be.ok();
        });
        it("attaches an event to receive the stage displays", function () {
          expect(stageDisplaySetsEvent).to.be.ok();
          expect(socketInterface.on.calls[1].args[1])
            .to.be.a('function');
        });
        describe("stage display cache event handler", function () {
          it("returns the stageDisplaySets property", function () {
            var sets = random.string();
            stageDisplaySetsEvent.args[1]({
              'stageDisplaySets' : sets
            });
            expect(cb.calls[0].args[0]).to.equal(sets);
          });
        });
      });
    });
    describe("slideChange event", function () {
      var
        cb,
        eventHandlerCall;
      beforeEach(function () {
        eventHandlerCall = socketInterface.on.findCall(
          ['presentationTriggerIndex']);
        cb = pretendr();
        instance.on('slideChange', cb.mock);
      });
      it("runs on presentationTriggerIndex", function () {
        expect(eventHandlerCall).to.be.ok();
        eventHandlerCall.args[1]({
          presentation : {}
        });
        expect(cb.calls).to.have.length(1);
      });
      it("creates a ProInterfacePresentation from the object", function () {
        var presentationObject = {};
        eventHandlerCall.args[1](presentationObject);
        expect(mockPresentation.instances).to.have.length(1);
        expect(mockPresentation.instances[0].args[0]).to.equal(
          presentationObject);
      });
    });
  });
});

var slideDetails = {
  'title' : 'string',
  'fileName' : 'string',
  'groups' : [{
    'name' : 'string',
    'colour' : 'string',
    'slides' : [{
      'text' : 'string',
      'notes' : 'string',
      'group' : {}
    }]
  }],
  'allSlides' : [],
  'currentSlide' : {},
  'nextSlide' : {}
};


// These two functions aren't currently used, but I've kept them for reference
// so we know what a presentation should look like.
// They can be deleted once they're more logically implemented in
// testProInterfacePresentation.
function validatePresentationDetails(presentation, original) {
  var allSlidesIndex = 0;
  expect(presentation.title).to.be.a('string');
  expect(presentation.fileName).to.be.a('string');
  expect(presentation.groups).to.be.an('array');
  expect(presentation.allSlides).to.be.an('array');
  presentation.groups.forEach(function (group, groupIndex) {
    expect(group.name).to.be.a('string');
    expect(group.colour).to.be.a('string');
    if (original) {
      expect(group.name).to.equal(original.groups[groupIndex].name);
    }
    group.slides.forEach(function (slide, slideIndex) {
      expect(slide).to.equal(presentation.allSlides[allSlidesIndex++]);
    });
  });
}

function createFullProPresenterItem(title, random) {
  var slideIndex = 0;
  title = title || random.sentence();
  return {
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
