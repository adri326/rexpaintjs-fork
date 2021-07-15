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

/**
  Parses the given buffer as a REXPaint image, calling `callback` if it is set and returning a Promise otherwise.
  The promise/callback will receive an `Image` instance with the corresponding image data.
**/
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
    });
  });

  if (callback) {
    p.then(res => callback(null, res)).catch(e => callback(e));
  } else {
    return p;
  }
}

/**
  Exports the given `Image` instance as a REXPaint .xp file, calling `callback` if it is set and returning a Promise otherwise.
  The promise/callback will receive a `Buffer` with the exported, gzipped data.
**/
function toBuffer(image, callback) {
  if (!(image instanceof Image)) {
    throw new Error("Expected 'image' to be an instance of Image, got " + image);
  }

  let p = new Promise((resolve, reject) => {
    let res = writeInflatedBuffer(image);
    zlib.gzip(res, (err, deflated) => {
      if (err) reject(err);
      resolve(deflated);
    });
  });

  if (callback) {
    p.then(res => callback(null, res)).catch(e => callback(e));
  } else {
    return p;
  }
}

function loadInflatedBuffer(buffer) {
  let version = buffer.readUInt32LE(0);
  let res = new Image(version);

  let numLayers = buffer.readUInt32LE(4);
  let offset = 8;
  for (let i=0; i < numLayers; i++) {
    let width = buffer.readUInt32LE(offset);
    offset += 4;
    let height = buffer.readUInt32LE(offset);
    offset += 4;

    let layer = new Layer(width, height);
    for (let x = 0; x < layer.width; x++) {
      for (let y = 0; y < layer.height; y++) {
        let pixel = {};
        let asciiCode = buffer.readUInt32LE(offset);
        offset += 4;

        let r = buffer.readUInt8(offset++);
        let g = buffer.readUInt8(offset++);
        let b = buffer.readUInt8(offset++);
        let fg = new Color(r, g, b);

        r = buffer.readUInt8(offset++);
        g = buffer.readUInt8(offset++);
        b = buffer.readUInt8(offset++);
        let bg = new Color(r, g, b);

        layer.set(x, y, new Pixel(asciiCode, fg, bg));
      }
    }

    res.layers.push(layer);
  }

  return res;
}

function writeInflatedBuffer(image) {
  const PIXEL_SIZE = 10;
  let size = 8;
  for (let layer of image.layers) {
    size += 8 + PIXEL_SIZE * layer.width * layer.height;
  }
  let res = Buffer.alloc(size, 0);

  res.writeUInt32LE(image.version, 0);
  res.writeUInt32LE(image.layers.length, 4);

  let offset = 8;
  for (let layer of image.layers) {
    res.writeUInt32LE(layer.width, offset);
    offset += 4;
    res.writeUInt32LE(layer.height, offset);
    offset += 4;

    for (let x = 0; x < layer.width; x++) {
      for (let y = 0; y < layer.height; y++) {
        let pixel = layer.get(x, y);
        res.writeUInt32LE(pixel.asciiCode, offset);
        offset += 4;

        res.writeUInt8(pixel.fg.r, offset++);
        res.writeUInt8(pixel.fg.g, offset++);
        res.writeUInt8(pixel.fg.b, offset++);

        res.writeUInt8(pixel.bg.r, offset++);
        res.writeUInt8(pixel.bg.g, offset++);
        res.writeUInt8(pixel.bg.b, offset++);
      }
    }
  }

  if (offset != size) {
    throw new Error("Internal error: expected offset to match size!");
  }

  return res;
}

class Image {
  /**
    Creates a new image instance, with version code `version`.
    The initial image will be empty and will not have any layers.
  **/
  constructor(version) {
    this.version = version;
    this.layers = [];
  }

  /**
    Sets the pixel on the `l`-th layer at `x`, `y`.
    Expects `l`, `x` and `y` to be positive integers and `pixel` to be a `Pixel` instance.
    Returns false if any of the above conditions isn't met, otherwise returns true and sets the corresponding pixel.

    *Note: the Pixel instance will be cloned before being put in the raster.*
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

    *Note: the returned Pixel instance will not be a clone of the pixel in the raster (modifying it will modify the image).*
  **/
  get(l, x, y) {
    if (typeof l === "number" && this.layers[l]) {
      return this.layers[l].get(x, y);
    } else {
      return null;
    }
  }

  /**
    Merges different layers together, producing a single layer, similar to the multi-layer view of REXPaint.
    The returned layer will be a clone of the topmost, non-transparent pixels.

    If `layers` is equal to "all", all of the layers will be merged.
    If `layers` is a single number `x`, it will be interpreted as `[x]`.
    Otherwise, `layers` is interpreted as an array of layer indices. The layers will be merged in that order.

    Returns null if no layers were available or were selected.
  **/
  mergeLayers(layers = "all") {
    if (this.layers.length === 0) return null;

    if (layers === "all") {
      layers = new Array(this.layers.length).fill(0).map((_, i) => i);
    } else if (Number.isInteger(layers)) {
      if (layers >= 0 && layers < this.layers.length) {
        layers = [layers];
      } else {
        layers = [];
      }
    } else if (Array.isArray(layers)) {
      layers = layers.filter(l => Number.isInteger(l) && l >= 0 && l < this.layers.length);
    } else {
      return null;
    }

    if (layers.length === 0) return null;

    let res = new Layer(this.width, this.height);
    for (let index of layers) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          let pixel = this.get(index, x, y);
          if (!res.get(x, y) || !pixel.transparent) {
            res.set(x, y, Pixel.from(pixel));
          }
        }
      }
    }
    return res;
  }

  get width() {
    if (this.layers.length > 0) return this.layers[0].width;
    else return null;
  }

  get height() {
    if (this.layers.length > 0) return this.layers[0].height;
    else return null;
  }
}

class Layer {
  /**
    Creates a new Layer with dimension `width` and `height`.
    The initial raster will be empty, consider filling it with `Layer::fill`.
  **/
  constructor(width, height) {
    this.width = width;
    this.height = height;

    this.raster = new Array(width * height);
  }

  /**
    Creates a new Layer instance from a previous Layer instance.

    On failure, returns null.
  **/
  static from(layer) {
    if (layer instanceof Layer) {
      let res = new Layer(layer.width, layer.height);

      for (let y = 0; y < res.height; y++) {
        for (let x = 0; x < res.width; x++) {
          res.set(x, y, layer.get(x, y));
        }
      }

      return res;
    }

    return null;
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

    *Note: the Pixel instance will be cloned before being put in the raster.*
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

    *Note: the returned Pixel instance will not be a clone of the pixel in the raster (modifying it will modify the layer).*
  **/
  get(x, y) {
    if (this.verifyCoordinates(x, y)) {
      return this.raster[x + this.width * y];
    } else {
      return null;
    }
  }

  /**
    Fills a layer with the given pixel.
    Returns the current Layer instance.

    *Note: the Pixel instance will be cloned before being put in the raster.*
  **/
  fill(pixel = Pixel.TRANSPARENT) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.set(x, y, pixel);
      }
    }

    return this;
  }
}

class Pixel {
  /**
    Creates a new Pixel instance.
    Expects `fg` and `bg` to be instances of `Color`.
    Expects `char` to be a character integer.
  **/
  constructor(char, fg, bg) {
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
      if (Number.isInteger(char) && char >= 0) {
        this.asciiCode = char;
      } else {
        throw new Error("Invalid character code: expected positive integer, got " + char);
      }
    } else {
      throw new Error("Invalid argument: expected `char` to be a number, got " + typeof char);
    }
  }

  /**
    Creates a new Pixel instance from an existing Pixel instance or an array containing the foreground, background and ascii code.

    If the `pixel` is an array, it will be interpreted as `[asciiCode, foregroundColor, backgroundColor]`.

    On failure, returns null.
  **/
  static from(pixel) {
    if (pixel instanceof Pixel) {
      return new Pixel(pixel.asciiCode, Color.from(pixel.fg), Color.from(pixel.bg));
    } else if (Array.isArray(pixel) && pixel.length === 3 && Number.isInteger(pixel[0]) && pixel[0] >= 0) {
      let fg = Color.from(pixel[1]);
      if (fg === null) return null;

      let bg = Color.from(pixel[2]);
      if (bg === null) return null;

      return new Pixel(pixel[0], fg, bg);
    }

    return null;
  }

  /**
    Returns the unicode char associated with `this.asciiCode`, if `this.asciiCode ∈ [0; 255]`.
    Interprets `this.asciiCode` as a CP437 character code.
  **/
  get unicodeChar() {
    if (this.asciiCode >= 0 && this.asciiCode <= 255) {
      return Pixel.UNICODE_TABLE[this.asciiCode];
    } else {
      return '';
    }
  }

  /**
    Returns the ANSI string associated with the current pixel.
    The returned string contains the ANSI escape code for the foreground and background colors and the unicode character associated to `this.asciiCode` (interpreted as a CP437 character code).

    The returned string does not clear the color afterwards!
  **/
  get ansiString() {
    let foreground = `\x1b[38;2;${this.fg._r};${this.fg._g};${this.fg._b}m`;
    let background = `\x1b[48;2;${this.bg._r};${this.bg._g};${this.bg._b}m`;
    let char = this.unicodeChar;

    return foreground + background + char;
  }
}

class Color {
  /**
    Creates a new Color instance.
    Expects `r`, `g` and `b` to be integers from 0 to 255.
  **/
  constructor(r, g, b) {
    this._r = +r;
    this._g = +g;
    this._b = +b;

    if (!Number.isInteger(this._r) || this._r < 0 || this._r > 255) throw new Error(`Expected 'r' to be a positive integer, got ${r}`);
    if (!Number.isInteger(this._g) || this._g < 0 || this._g > 255) throw new Error(`Expected 'g' to be a positive integer, got ${g}`);
    if (!Number.isInteger(this._b) || this._b < 0 || this._b > 255) throw new Error(`Expected 'b' to be a positive integer, got ${b}`);
  }

  /**
    Creates a new Color instance from an existing Color instance, an RGB array or a hex color string.

    If `color` is an RGB array, it will be interpreted as an array of 3 integers (floating numbers will be rounded down), representing the R, G and B channel.
    The numerical values have to be between 0 and 255.

    If `color` is an RGB hex color string, it will be parsed as such.

    On failure, returns null.
  **/
  static from(color) {
    if (color instanceof Color) {
      return new Color(color._r, color._g, color._b);
    } else if (Array.isArray(color) && color.length == 3 && color.all(x => typeof x === "number")) {
      return new Color(Math.floor(color[0]), Math.floor(color[1]), Math.floor(color[2]));
    } else if (typeof color === "string") {
      let match = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(color);
      if (match) {
        let r = Number.parseInt(match[1], 16);
        let g = Number.parseInt(match[2], 16);
        let b = Number.parseInt(match[3], 16);
        return new Color(r, g, b);
      }
    }

    return null;
  }

  get r() {
    return this._r;
  }

  set r(value) {
    this._r = +value;
    if (!Number.isInteger(this._r) || this._r < 0 || this._r > 255) throw new Error(`Expected 'r' to be a positive integer, got ${value}`);
  }

  get g() {
    return this._g;
  }

  set g(value) {
    this._g = +value;
    if (!Number.isInteger(this._g) || this._g < 0 || this._g > 255) throw new Error(`Expected 'g' to be a positive integer, got ${value}`);
  }

  get b() {
    return this._b;
  }

  set b(value) {
    this._b = +value;
    if (!Number.isInteger(this._b) || this._b < 0 || this._b > 255) throw new Error(`Expected 'b' to be a positive integer, got ${value}`);
  }

  get hex() {
    return rgb2hex(this._r, this._g, this._b);
  }

  set hex(value) {
    if (typeof value === "string") {
      let match = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(value);
      if (match) {
        this._r = Number.parseInt(match[1], 16);
        this._g = Number.parseInt(match[2], 16);
        this._b = Number.parseInt(match[3], 16);
      }
    }
  }

  toJSON() {
    return {
      g: this._g,
      b: this._b,
      r: this._r,
      hex: rgb2hex(this._r, this._g, this._b)
    };
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

// CP437 table from http://dwarffortresswiki.org/index.php/Character_table, with the white square added back in
Pixel.UNICODE_TABLE = [
  '', '☺', '☻', '♥', '♦', '♣', '♠', '•', '◘', '○', '◙', '♂', '♀', '♪', '♫', '☼',
  '►', '◄', '↕', '‼', '¶', '§', '▬', '↨', '↑', '↓', '→', '←', '∟', '↔', '▲', '▼',
  ' ', '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '=', '>', '?',
  '@', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
  'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '[', '\\', ']', '^', '_',
  '`', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o',
  'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '{', '|', '}', '~', '⌂',
  'Ç', 'ü', 'é', 'â', 'ä', 'à', 'å', 'ç', 'ê', 'ë', 'è', 'ï', 'î', 'ì', 'Ä', 'Å',
  'É', 'æ', 'Æ', 'ô', 'ö', 'ò', 'û', 'ù', 'ÿ', 'Ö', 'Ü', '¢', '£', '¥', '₧', 'ƒ',
  'á', 'í', 'ó', 'ú', 'ñ', 'Ñ', 'ª', 'º', '¿', '⌐', '¬', '½', '¼', '¡', '«', '»',
  '░', '▒', '▓', '│', '┤', '╡', '╢', '╖', '╕', '╣', '║', '╗', '╝', '╜', '╛', '┐',
  '└', '┴', '┬', '├', '─', '┼', '╞', '╟', '╚', '╔', '╩', '╦', '╠', '═', '╬', '╧',
  '╨', '╤', '╥', '╙', '╘', '╒', '╓', '╫', '╪', '┘', '┌', '█', '▄', '▌', '▐', '▀',
  'α', 'ß', 'Γ', 'π', 'Σ', 'σ', 'µ', 'τ', 'Φ', 'Θ', 'Ω', 'δ', '∞', 'φ', 'ε', '∩',
  '≡', '±', '≥', '≤', '⌠', '⌡', '÷', '≈', '°', '∙', '·', '√', 'ⁿ', '²', '■', '□'
];

Pixel.TRANSPARENT = new Pixel(32, new Color(0, 0, 0), new Color(255, 0, 255));

module.exports = fromBuffer;
module.exports.fromBuffer = fromBuffer;
module.exports.toBuffer = toBuffer;
module.exports.Color = Color;
module.exports.Pixel = Pixel;
module.exports.Layer = Layer;
module.exports.Image = Image;
