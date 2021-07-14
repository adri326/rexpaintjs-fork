const rexpaint = require("../index.js");
const fs = require("fs");
const assert = require("assert");
const zlip = require("zlib");

(async () => {
  let buffer = fs.readFileSync("test.xp");
  let rp = await rexpaint.fromBuffer(buffer);
  let exported = await rexpaint.toBuffer(rp);

  zlip.unzip(buffer, (err, expected) => {
    assert.equal(err, null);
    zlip.unzip(exported, (err, actual) => {
      assert.equal(err, null);
      assert.equal(actual.compare(expected), 0);
    });
  });
})();
