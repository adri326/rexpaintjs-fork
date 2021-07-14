const rexpaint = require("../index.js");
const fs = require("fs");
const assert = require("assert");

(async () => {
    let rp = await rexpaint.fromBuffer(fs.readFileSync("test.xp"));
    let expected = JSON.parse(fs.readFileSync("test/expected.json", "utf8"));

    assert.deepEqual(rp, expected);
})();
