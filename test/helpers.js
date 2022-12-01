let assert = require('assert');
let cp = require('child_process');

function assertOutput(cmd, args, status, stdout, stderr) {
    let out = cp.spawnSync(cmd, args);
    assert.strictEqual(out.status, status);
    assert.strictEqual(out.stdout.toString(), stdout);
    assert.strictEqual(out.stderr.toString(), stderr);
}

module.exports = { assertOutput };
