/*
 * rexpaintjs - Node.js module to load REXPaint sprites
 *
 * Code style:
 * 2 space indents, no semicolons to finish lines, camelCase, opening braces on same line
 *
 * Created by John Villar for the "Ganymede Gate" sci-fi multiplayer roguelike
 * Twitter: @johnvillarz
 * Telegram: @chiguireitor
 *
 * Cleaned up by Shad Amethyst
 *
 * See LICENSE for licensing details
 */
const zlib = require('zlib')

class Color {
  constructor(r, g, b) {
    this.r = r
    this.g = g
    this.b = b
    this.hex = rgb2hex(r, g, b)
  }
}

function fromBuffer(buffer, callback) {
  let p = new Promise((resolve, reject) => {
    zlib.unzip(buffer, (err, inflated) => {
      if (err) reject(err)
      try {
        let res = loadInflatedBuffer(inflated)
        resolve(res)
      } catch (e) {
        reject(e)
      }
    })
  })

  if (!callback) {
    return p
  } else {
    p.then(res => callback(null, res)).catch(e => callback(e))
  }
}

function loadInflatedBuffer(buffer) {
  let res = {
    version: buffer.readUInt32LE(0),
    layers: []
  }

  let numLayers = buffer.readUInt32LE(4)

  let curOffset = 8

  for (let i=0; i < numLayers; i++) {
    let layer = {}
    layer.width = buffer.readUInt32LE(curOffset)
    curOffset += 4
    layer.height = buffer.readUInt32LE(curOffset)
    curOffset += 4

    let raster = new Array(layer.height * layer.width)
    for (let x = 0; x < layer.width; x++) {
      for (let y = 0; y < layer.height; y++) {
        let pixel = {}
        pixel.asciiCode = buffer.readUInt32LE(curOffset)
        curOffset += 4

        let r = buffer.readUInt8(curOffset++)
        let g = buffer.readUInt8(curOffset++)
        let b = buffer.readUInt8(curOffset++)
        pixel.fg = new Color(r, g, b);

        r = buffer.readUInt8(curOffset++)
        g = buffer.readUInt8(curOffset++)
        b = buffer.readUInt8(curOffset++)
        pixel.bg = new Color(r, g, b)

        pixel.transparent = pixel.bg.r === 255 && pixel.bg.g === 0 && pixel.bg.b === 255

        raster[x + layer.width * y] = pixel
      }
    }

    layer.raster = raster
    res.layers.push(layer)
  }

  return res
}

function rgb2hex(r, g, b) {
    let sr = r.toString(16)
    let sg = g.toString(16)
    let sb = b.toString(16)

    if (sr.length < 2) {
        sr = '0' + sr
    }

    if (sg.length < 2) {
        sg = '0' + sg
    }

    if (sb.length < 2) {
        sb = '0' + sb
    }

    return sr + sg + sb
}

module.exports = fromBuffer
module.exports.fromBuffer = fromBuffer
