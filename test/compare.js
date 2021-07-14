const rexpaint = require("../index.js");
const fs = require("fs");
const assert = require("assert");

(async () => {
  let rp = await rexpaint.fromBuffer(fs.readFileSync("test.xp"));
  let expectedJSON = fs.readFileSync("test/expected.json", "utf8");
  let expected = JSON.parse(expectedJSON);

  compareImage(rp, expected);

  let actualJSON = JSON.stringify(rp);
  assert.deepStrictEqual(JSON.parse(actualJSON), expected);
})();

function compareImage(actual, expected) {
  assert.strictEqual(actual.version, expected.version);
  assert.strictEqual(actual.layers.length, expected.layers.length);
  for (let i = 0; i < actual.layers.length; i++) {
    compareLayer(actual.layers[i], expected.layers[i]);
  }
}

function compareLayer(act, exp) {
  assert.strictEqual(act.width, exp.width);
  assert.strictEqual(act.height, exp.height);
  assert.strictEqual(act.raster.length, exp.raster.length);
  for (let i = 0; i < act.raster.length; i++) {
    comparePixel(act.raster[i], exp.raster[i]);
  }
}

function comparePixel(act, exp) {
  assert.strictEqual(act.asciiCode, exp.asciiCode);
  compareColor(act.fg, exp.fg);
  compareColor(act.bg, exp.bg);
  assert.strictEqual(act.transparent, exp.transparent);
}

function compareColor(act, exp) {
  assert.strictEqual(act.r, exp.r);
  assert.strictEqual(act.g, exp.g);
  assert.strictEqual(act.b, exp.b);
  assert.strictEqual(act.hex, exp.hex);
}
