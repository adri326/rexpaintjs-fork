const fs = require('fs')
const util = require('util')
const rexpaintjs = require('./')

rexpaintjs.fromBuffer(fs.readFileSync('test.xp'), (err, data) => {
  if (err) {
    console.log('Error', err)
  } else {
    console.log(util.inspect(data, {colors: true, depth: 5}))
  }
})
