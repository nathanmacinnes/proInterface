var
  Chance = require('chance'),
  seed;

// Pass a seed with the environment variable.
// The environment variable should normally be left blank, and only populated
// when repeatable results are required for debugging.
seed = process.env.TEST_SEED || (new Chance()).natural();

// Print the current seed so that results can be repeated.
console.log('\nPseudorandom number seed: ' + seed.toString());

module.exports = createRandom;

function createRandom() {
  module.exports.random = new Chance(this.currentTest.title, seed);
}
