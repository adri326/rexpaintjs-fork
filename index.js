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
 * See LICENSE for licensing details (tl;dr: ISC License)
 *
 * Like this! Follow me on social networks & send some Bitcoin my way if you want ;)
 *
 * BTC: 3H6uQfxccMRBCMyCE4u4yzEDMY4c61fFxC
 */
const zlib = require('zlib')

function rgbObj2cssHex(o) {
    var r = o.r.toString(16)
    var g = o.g.toString(16)
    var b = o.b.toString(16)

    if (r.length < 2) {
        r = '0' + r
    }

    if (g.length < 2) {
        g = '0' + g
    }

    if (b.length < 2) {
        b = '0' + b
    }

    return r + g + b
}

const fromBuffer = (buf, cb) => {
  let p = new Promise((resolve, reject) => {
    zlib.unzip(buf, (err, buffer) => {
      if (!err) {
        try {
          let ob = loadInflatedBuffer(buffer)
          resolve(ob)
        } catch (e) {
          reject(e)
        }
      } else {
        reject(err)
      }
    })
  })

  if (!cb) {
    return p
  } else {
    p.then(ob => cb(null, ob)).catch(e => cb(e))
  }
}

const loadInflatedBuffer = (buffer) => {
  let ob = {
    version: 0,
    layers: []
  }

  buffer.readInt32 = buffer.readInt32LE
  buffer.fixedReadUint8 = function(offset) {
    // There's a bug in readUint8 that damages the buffer, so
    // we read the two's complement and then clear the sign
    // with this terrible, terrible hack
    let v = this.readInt8(offset)

    return (v<0)?256+v:v //(v >>> 0) && 0xFF
  }
  ob.version = buffer.readInt32(0)
  let numLayers = buffer.readInt32(4)

  let curOffset = 8
  for (let i=0; i < numLayers; i++) {
    let layer = {}
    layer.width = buffer.readInt32(curOffset)
    curOffset += 4
    layer.height = buffer.readInt32(curOffset)
    curOffset += 4

    let raster = Array(layer.height * layer.width)
    for (let y=0; y < layer.height; y++) {
      for (let x=0; x < layer.width; x++) {
        let pix = {}
        pix.asciiCode = buffer.readInt32(curOffset)
        curOffset += 4
        pix.fg = {}

        pix.fg.r = buffer.fixedReadUint8(curOffset++)
        pix.fg.g = buffer.fixedReadUint8(curOffset++)
        pix.fg.b = buffer.fixedReadUint8(curOffset++)
        pix.fg.hex = rgbObj2cssHex(pix.fg)

        pix.bg = {}
        pix.bg.r = buffer.fixedReadUint8(curOffset++)
        pix.bg.g = buffer.fixedReadUint8(curOffset++)
        pix.bg.b = buffer.fixedReadUint8(curOffset++)
        pix.bg.hex = rgbObj2cssHex(pix.bg)

        pix.transparent = pix.bg.r === 255 && pix.bg.g === 0 && pix.bg.b === 255

        raster[x * layer.height + y] = pix // REX Paint stores tiles in column major format, go figure
      }
    }

    layer.raster = raster
    ob.layers.push(layer)
  }

  return ob
}

/*RexSprite.prototype.draw = function(level, x, y) {
    var blockLayer = (this.layers.length > 1)?this.layers[this.layers.length-2]:undefined
    var logicLayer = (this.layers.length > 2)?this.layers[this.layers.length-3]:undefined
    var tilesLayer = (this.layers.length > 0)?this.layers[this.layers.length-1]:undefined

    if (tilesLayer) {
        var layer = tilesLayer

        for (var iy=0; iy < layer.height; iy++) {
            var ty = y + iy
            if ((ty >= 0) && (ty < level.length)) {
                var row = level[ty]
                var py = iy * layer.width

                for (var ix=0; ix < layer.width; ix++) {
                    var tx = x + ix

                    if ((tx >= 0) && (tx < row.length)) {
                        levelPixel = row[tx]

                        var pix = layer.raster[ix + py]

                        if (!((pix.bg.r == 255)&&(pix.bg.g == 0)&&(pix.bg.b == 255))) {
                            var fg = rgbObj2cssHex(pix.fg)
                            var bg = rgbObj2cssHex(pix.bg)

                            // #DRAW TODO: Change this to your level format
                            levelPixel.tile = pix.asciiCode
                            levelPixel.fg = fg
                            levelPixel.bg = bg

                            if (blockLayer) {
                                levelPixel.forcePassable = blockLayer.raster[ix + py].asciiCode
                            }
                        }
                    }
                }
            }
        }
    }
}*/

module.exports = {
  fromBuffer
}
