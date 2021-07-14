/*
 * rexpaintjs - Node.js module to load REXPaint sprites
 *
 * Code style:
 * 2 space indents, semicolons to finish lines, camelCase, opening braces on same line
 *
 * Created by John Villar for the "Ganymede Gate" sci-fi multiplayer roguelike
 * Twitter: @johnvillarz
 * Telegram: @chiguireitor
 *
 * Cleaned up by Shad Amethyst
 *
 * See LICENSE for licensing details
 */
"use strict";

const zlib = require('zlib');

function fromBuffer(buffer, callback) {
  let p = new Promise((resolve, reject) => {
    zlib.unzip(buffer, (err, inflated) => {
      if (err) reject(err);
      try {
        let res = loadInflatedBuffer(inflated);
        resolve(res);
      } catch (e) {
        reject(e);
      }
    })
  })

  if (!callback) {
    return p;
  } else {
    p.then(res => callback(null, res)).catch(e => callback(e));
  }
}

function loadInflatedBuffer(buffer) {
  let version = buffer.readUInt32LE(0);
  let res = new Image(version);

  let numLayers = buffer.readUInt32LE(4);
  let curOffset = 8;
  for (let i=0; i < numLayers; i++) {
    let width = buffer.readUInt32LE(curOffset);
    curOffset += 4;
    let height = buffer.readUInt32LE(curOffset);
    curOffset += 4;

    let layer = new Layer(width, height);
    for (let x = 0; x < layer.width; x++) {
      for (let y = 0; y < layer.height; y++) {
        let pixel = {};
        let asciiCode = buffer.readUInt32LE(curOffset);
        curOffset += 4;

        let r = buffer.readUInt8(curOffset++);
        let g = buffer.readUInt8(curOffset++);
        let b = buffer.readUInt8(curOffset++);
        let fg = new Color(r, g, b);

        r = buffer.readUInt8(curOffset++);
        g = buffer.readUInt8(curOffset++);
        b = buffer.readUInt8(curOffset++);
        let bg = new Color(r, g, b);

        layer.set(x, y, new Pixel(fg, bg, asciiCode));
      }
    }

    res.layers.push(layer);
  }

  return res;
}

class Image {
  constructor(version, numLayers) {
    this.version = version;
    this.layers = [];
  }

  /**
    Sets the pixel on the `l`-th layer at `x`, `y`.
    Expects `l`, `x` and `y` to be positive integers and `pixel` to be a `Pixel` instance.
    Returns false if any of the above conditions isn't met, otherwise returns true and sets the corresponding pixel.
  **/
  set(l, x, y, pixel) {
    if (typeof l === "number" && this.layers[l]) {
      return this.layers[l].set(x, y, pixel);
    } else {
      return false;
    }
  }

  /**
    Gets the pixel on the `l`-th layer at `x`, `y`.
    Returns null if the coordinates were out of bound.
  **/
  get(l, x, y) {
    if (typeof l === "number" && this.layers[l]) {
      return this.layers[l].get(x, y);
    } else {
      return null;
    }
  }
}

class Layer {
  constructor(width, height) {
    this.width = width;
    this.height = height;

    this.raster = new Array(width * height);
  }

  /**
    Verifies that `(x, y)` are valid pixel coordinates.
  **/
  verifyCoordinates(x, y) {
    return Number.isInteger(x)
      && Number.isInteger(y)
      && x >= 0
      && x < this.width
      && y >= 0
      && y < this.height;
  }

  /**
    Sets the pixel at `x`, `y` to `pixel`.
    Expects that `(x, y)` are valid coordinates and that `pixel` is an instance of `Pixel`.
    Returns false if any of the above conditions isn't met, otherwise returns true and sets the corresponding pixel.
  **/
  set(x, y, pixel) {
    if (this.verifyCoordinates(x, y) && pixel instanceof Pixel) {
      this.raster[x + this.width * y] = pixel;
      return true;
    } else {
      return false;
    }
  }

  /**
    Returns the pixel at `(x, y)`.
    Returns null if the coordinates are out of bound.
  **/
  get(x, y) {
    if (this.verifyCoordinates(x, y)) {
      return this.raster[x + this.width * y];
    } else {
      return null;
    }
  }
}

class Pixel {
  /**
    Creates a new Pixel instance.
    Expects `fg` and `bg` to be instances of `Color`.
    Expects `char` to be a character integer.
  **/
  constructor(fg, bg, char) {
    if (fg instanceof Color) {
      this.fg = fg;
    } else {
      throw new Error("Invalid argument: expected `fg` to be a Color, got " + fg);
    }

    if (bg instanceof Color) {
      this.bg = bg;
    } else {
      throw new Error("Invalid argument: expected `fg` to be a Color, got " + fg);
    }

    this.transparent = this.bg.r === 255 && this.bg.g === 0 && this.bg.b === 255;

    if (typeof char === "number") {
      if (Number.isInteger(char) && char >= 0 && char <= 255) {
        this.asciiCode = char;
      } else {
        throw new Error("Invalid character code: expected integer from 0 to 255, got " + char);
      }
    } else {
      throw new Error("Invalid argument: expected `char` to be a number, got " + typeof char);
    }
  }
}

class Color {
  /**
    Creates a new Color instance.
    Expects `r`, `g` and `b` to be integers from 0 to 255.
  **/
  constructor(r, g, b) {
    this.r = +r;
    this.g = +g;
    this.b = +b;

    if (!Number.isInteger(this.r) || this.r < 0 || this.r > 255) throw new Error(`Expected 'r' to be a positive integer, got ${r}`);
    if (!Number.isInteger(this.g) || this.g < 0 || this.g > 255) throw new Error(`Expected 'g' to be a positive integer, got ${g}`);
    if (!Number.isInteger(this.b) || this.b < 0 || this.b > 255) throw new Error(`Expected 'b' to be a positive integer, got ${b}`);

    this.hex = rgb2hex(r, g, b);
  }
}

function rgb2hex(r, g, b) {
    let sr = r.toString(16);
    let sg = g.toString(16);
    let sb = b.toString(16);

    if (sr.length < 2) {
        sr = '0' + sr;
    }

    if (sg.length < 2) {
        sg = '0' + sg;
    }

    if (sb.length < 2) {
        sb = '0' + sb;
    }

    return sr + sg + sb;
}

module.exports = fromBuffer;
module.exports.fromBuffer = fromBuffer;
module.exports.Color = Color;
module.exports.Pixel = Pixel;
module.exports.Layer = Layer;
module.exports.Image = Image;
