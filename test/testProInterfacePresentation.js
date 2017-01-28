var
  expect = require('expect.js'),
  injectr = require('injectr'),
  pretendr = require('pretendr'),
  seedTest = require('./seedTest.js');

describe('ProInterfacePresentation', function () {
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
});
