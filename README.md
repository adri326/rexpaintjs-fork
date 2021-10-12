# rexpaintjs-fork

A fork of `rexpaintjs`, a simple library to load REXPaint "XP" files as plain javascript objects.
This fork aims to improve upon `rexpaintjs`, by adding more checks and features, including the ability to export images.

## Usage

Install the fork by running:

```sh
npm install --save adri326/rexpaintjs-fork
```

Then, import the node module:

```js
const rexpaintjs = require('rexpaintjs-fork');
```

The fork works as a drop-in replacement: any code working with `rexpaintjs` will work with `rexpaintjs-fork` too.

### Reading from a file

To load a REXPaint file, you may do the following:

```js
const fs = require("fs");

let buffer = fs.readFileSync("your_file.xp");
rexpaint(buffer, (err, data) => {
  if (err) {
    throw new Error(err);
  }
  // You can now use `data` here!
});
```

Alternatively, you can call the `rexpaint` function as an async function:

```js
const fs = require("fs");

let buffer = fs.readFileSync("your_file.xp");
async function myFunction() {
  let data = await rexpaint(buffer);
  // You can now use `data` here!
}
```

### Internal data structure

The `data` object in these two examples will be an `Image` instance. It is of the form:

```js
class Image {
  version: Number,
  layers: Array<Layer>,
}

class Layer {
  width: Number,
  height: Number,
  raster: Array<Pixel>,
}

class Pixel {
  fg: Color,
  bg: Color,
  asciiCode: Number,
}

class Color {
  r: Number, // integer from 0 to 255
  g: Number, // integer from 0 to 255
  b: Number, // integer from 0 to 255
  hex: String, // hexadecimal representation of the color
}
```

Additionally, the different classes feature some useful methods and constants.
You should refer to [their in-code documentation](https://github.com/adri326/rexpaintjs-fork/blob/master/index.js) for their full behavior:

```rs
Image::get(l, x, y) // returns the `(x, y)` pixel of the layer `l`
Image::set(l, x, y, pixel) // sets the `(x, y)` pixel of the layer `l`
Image::mergeLayers(layers) // merges different layers, with `layers` being an array of indices, a single index or "all"
Image::width // the width of the first layer, null if the image has no layer
Image::height // the height of the first layer, null if the image has no layer

Layer::verifyCoordinates(x, y) // returns true if `(x, y)` are valid pixel coordinates for that layer
Layer::get(x, y) // returns the pixel at `(x, y)`
Layer::set(x, y, pixel) // sets the pixel at `(x, y)`
Layer::fill(pixel) // fills a layer with the pixel `pixel`
Layer.from(layer) // clones a layer

new Pixel(code, foreground, background) // creates a new Pixel, foreground and background should be Color instances
Pixel.from(pixel) // clones a pixel
Pixel.from([code, foreground, background]) // faster way to create a new Pixel, as foreground and background are passed to Color.from
Pixel.TRANSPARENT // the transparent pixel, will be interpreted as transparent by Image::mergeLayers
Pixel::unicodeChar // the unicode character associated with that pixel
Pixel::ansiString // the ANSI string for that pixel: contains the ANSI escape code for the foreground and background colors and the unicode character for the pixel

new Color(red, green, blue) // creates a new Color
Color.from(color) // clones a color
Color.from([red, green, blue]) // creates a new Color from the red, green and blue components
Color.from("rrggbb") // creates a new Color from a hex string, with `rr` the red channel, `gg` the green channel and `bb` the blue channel
```

### Writing

This fork includes a function to export an `Image` instance as a REXPaint XP file.
To do so, simply call `rexpaint.toBuffer(image [, callback])` with as argument your image:

```js
const fs = require("fs");

let buffer = fs.readFileSync("your_file.xp");

// === Callback method ===
rexpaint(buffer, (err, data) => {
  if (err) {
    throw new Error(err);
  }

  // Modify the image a bit:
  data.set(0, 1, 1, new rexpaint.Pixel(
    1, // ☺
    new rexpaint.Color(255, 16, 16), // Foreground: bright red
    new rexpaint.Color(0, 0, 0), // Background: black
  ));

  // Export
  rexpaint.toBuffer(data, (err, exported) => {
    if (err) {
      throw new Error(err);
    }

    // Write to file
    fs.writeFileSync("your_new_file.xp", exported);
  });
});

// === Async method ===
async function myFunction() {
  let data = await rexpaint(buffer);

  // Modify the image a bit:
  data.set(0, 1, 1, rexpaint.Pixel.from([1, "ff1010", "000000"])); // red on black ☺

  // Export
  let exported = await rexpaint.toBuffer(data);

  // Write to file
  fs.writeFileSync("your_new_file.xp", exported);
}
```

## License

This project is licensed under the ISC license. See the `LICENSE` file for more details!
