rexpaintjs
====

A library to load REXPaint "XP" files as plain javascript objects.

Usage:
==

```bash
npm install --save rexpaintjs
```

```javascript
const rexpaintjs = require('rexpaintjs')

// Callback form
rexpaintjs.fromBuffer(yourBuffer, (err, data) => {
  ...
})

// Async form
let ob = await rexpaintjs.fromBuffer(yourBuffer)

// Ob has the following form

{
  version: integer, // Usually -1
  layers: [
    array of plain objects with layer data
  ]
}

// Layer object
{
  width: integer,
  height: integer,
  raster: [
    column major array of pixel data
  ]
}

// Pixel data
{
  asciiCode: integer,
  transparent: boolean,
  fg: color object,
  bg: color object
}

// Color object
{
  r: integer,
  g: integer,
  b: integer,
  hex: string // Plain hex, if you want to use it for css or html prepend the #
}
```

License:
====

Read LICENSE

tl;dr: ISC License
