const fs = require('fs')
const util = require('util')
const rexpaintjs = require('./')

rexpaintjs.fromBuffer(fs.readFileSync('test.xp'), (err, data) => {
  if (err) {
    console.log('Error', err)
  } else {
    //console.log('XP Size:', data.width, 'x', data.height)
    //console.log(util.inspect(data, {colors: true, depth: 5}))

    for (let i=0; i < data.layers.length; i++) {
      let layer = data.layers[i]
      console.log(`Layer ${i} size: ${layer.width}x${layer.height}`)

      for (let y=0; y < layer.height; y++) {
        let row = ''
        for (let x=0; x < layer.width; x++) {
          let cell = layer.raster[x + y * layer.width]

          if (cell) {
            if (cell.transparent) {
              row += '\x1b[0m '
            } else {
              let c = String.fromCharCode(cell.asciiCode)
              row += cell.ansiString
            }
          } else {
            cell += ' '
          }
        }

        console.log(row + "\x1b[0m")
      }
    }
  }
})
