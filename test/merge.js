const {Image, Layer, Pixel, Color, toBuffer, fromBuffer} = require("../index.js");
const assert = require("assert");
const fs = require("fs");

let img = new Image(0);
let layerA = new Layer(2, 2);
img.layers.push(layerA);

assert.equal(layerA.set(0, 0, Pixel.from([32, "000000", "ff00ff"])), true);
assert.deepStrictEqual(layerA.get(0, 0), new Pixel(32, new Color(0, 0, 0), new Color(0xff, 0, 0xff)));

assert.equal(layerA.set(1, 0, Pixel.from([2, "000000", "ffffff"])), true);
assert.deepStrictEqual(layerA.get(1, 0), new Pixel(2, new Color(0, 0, 0), new Color(0xff, 0xff, 0xff)));

assert.equal(layerA.set(0, 1, Pixel.from([72, "a0ffa0", "202020"])), true); // H
assert.equal(layerA.set(1, 1, Pixel.from([105, "a0a0ff", "202020"])), true); // i

assert.deepStrictEqual(img.mergeLayers(), layerA);

let layerB = new Layer(2, 2);
img.layers.push(layerB);

layerB.fill(Pixel.TRANSPARENT);
assert.deepStrictEqual(img.mergeLayers(), layerA);

layerB.fill(Pixel.from([15, "ffffff", "000000"]));
assert.deepStrictEqual(img.mergeLayers(), layerB);
assert.deepStrictEqual(img.mergeLayers(0), layerA);
assert.deepStrictEqual(img.mergeLayers([0]), layerA);
assert.deepStrictEqual(img.mergeLayers(1), layerB);
assert.deepStrictEqual(img.mergeLayers([1]), layerB);

layerB.set(0, 1, Pixel.TRANSPARENT);
layerB.set(1, 1, Pixel.TRANSPARENT);

let layerC = new Layer(2, 2);
layerC.set(0, 0, Pixel.from([15, "ffffff", "000000"]));
layerC.set(1, 0, Pixel.from([15, "ffffff", "000000"]));
layerC.set(0, 1, layerA.get(0, 1));
layerC.set(1, 1, layerA.get(1, 1));

assert.deepStrictEqual(img.mergeLayers(0), layerA);
assert.deepStrictEqual(img.mergeLayers(1), layerB);
assert.deepStrictEqual(img.mergeLayers([0, 1]), layerC);
assert.deepStrictEqual(img.mergeLayers(), layerC);

let layerD = Layer.from(layerA);
layerD.set(0, 0, Pixel.from([15, "ffffff", "000000"]));

assert.deepStrictEqual(img.mergeLayers([1, 0]), layerD);
