var
  expect = require('expect.js'),
  injectr = require('injectr'),
  pretendr = require('pretendr'),
  seedTest = require('./seedTest.js');

describe("ProInterfacePresentation", function () {
  var
    ProInterfacePresentation,
    random;
  beforeEach(seedTest);
  beforeEach(function () {
    ProInterfacePresentation = injectr('../lib/proInterfacePresentation.js');
    random = seedTest.random;
  });
  it("has a self-referencing property", function () {
    expect(ProInterfacePresentation).to.have.property(
      'ProInterfacePresentation',
      ProInterfacePresentation);
  });
  describe("instance", function () {
    var
      instance,
      original;
    beforeEach(function () {
      original = pretendr(generatePresentationObject(random));
      instance = new ProInterfacePresentation({
        presentation : original.mock
      });
    });
    it("has a title and file name", function () {
      expect(instance).to.have.property(
        'title', original.mock.presentationName)
        .and.to.have.property('fileName', original.mock.fileName);
    });
    it("returns a list of groups", function () {
      expect(instance.groups).to.be.an('array')
        .and.to.have.length(original.mock.groups.length);
    });
    describe("group", function () {
      var groupNum;
      beforeEach(function () {

        // We only need to test one group if we pick that group at random.
        groupNum = random.natural({
          max : original.mock.groups.length - 1
        });

      });
      it("contains a name and colour", function () {
        expect(instance.groups[groupNum])
          .to.have.property('name', original.mock.groups[groupNum].groupName)
          .and.to.have.property('colour',
            original.mock.groups[groupNum].groupColor)
          .and.to.have.property('color', // ok, Americans
            original.mock.groups[groupNum].groupColor);
      });
      it("contains a list of slides", function () {
        expect(instance.groups[groupNum].slides)
          .to.be.an('array')
          .and.to.have.length(
            original.mock.groups[groupNum].groupSlides.length);
      });
      describe("slide", function () {
        var slideNum;
        beforeEach(function () {

          // We only need to test one slide if we pick that slide at random.
          slideNum = random.natural({
            min : 0,
            max : original.mock.groups[groupNum].groupSlides.length - 1
          });

        });
        it("contains text and notes", function () {
          expect(instance.groups[groupNum].slides[slideNum])
            .to.have.property(
              'text',
              original.mock.groups[groupNum].groupSlides[slideNum].slideText
            ).and.to.have.property(
              'notes',
              original.mock.groups[groupNum].groupSlides[slideNum].slideNotes
            );
        });
        it("references the current group", function () {
          expect(instance.groups[groupNum].slides[slideNum])
            .to.have.property(
              'group',
              instance.groups[groupNum]
            );
        });
      });
    });
    describe("allSlides", function () {
      it("lists the slides in order", function () {
        var
          group,
          i,
          slideInGroup,
          slideNum = 0;
        group = random.natural({
          min : 0,
          max : instance.groups.length - 1
        });
        slideInGroup = random.natural({
          min : 0,
          max : instance.groups[group].slides.length - 1
        });
        for (i = 0; i < group; i++) {
          slideNum += instance.groups[i].slides.length;
        }
        slideNum += slideInGroup;
        expect(instance.allSlides).to.have.property(
          slideNum, instance.groups[group].slides[slideInGroup]);
      });
    });
  });
});

function generatePresentationObject(random) {
  var minMax = {
    min : 1,
    max : 10
  };
  return {
    presentationName : random.string(),
    presentationCurrentLocation : random.string(),
    groups : random.n(generateGroup, random.integer(minMax))
  };

  function generateGroup() {
    return {
      groupSlides : random.n(generateSlide, random.natural(minMax))
    };
  }
  function generateSlide() {
    return {
      slideText : random.string(),
      slideNotes : random.string()
    };
  }
}
