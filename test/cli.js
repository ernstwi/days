let assert = require('assert');
let cp = require('child_process');
let path = require('path');

let bin = path.join(__dirname, '../build/index.js');

let help = `Usage:
  days new [--no-edit] [--allday] [<year> <month> <day> [<hour> [<minute> [<second>]]]]
  days server [--port <number>] [--theme <name>]
  days merge [--resolve] (<path> | --imessage <ID>)
  days prune\n`;

let version = `days ${require('../package.json').version}\n`;

suite('cli', function () {
    test('no command', function () {
        let out = cp.spawnSync(bin);
        assert.strictEqual(out.status, 1);
        assert.strictEqual(out.stdout.toString(), '');
        assert.strictEqual(out.stderr.toString(), help);
    });
    test('undefined command', function () {
        let out = cp.spawnSync(bin, ['x']);
        assert.strictEqual(out.status, 1);
        assert.strictEqual(out.stdout.toString(), '');
        assert.strictEqual(out.stderr.toString(), help);
    });
    test('--help', function () {
        let out = cp.spawnSync(bin, ['--help']);
        assert.strictEqual(out.status, 0);
        assert.strictEqual(out.stdout.toString(), help);
        assert.strictEqual(out.stderr.toString(), '');
    });
    test('-h', function () {
        let out = cp.spawnSync(bin, ['-h']);
        assert.strictEqual(out.status, 0);
        assert.strictEqual(out.stdout.toString(), help);
        assert.strictEqual(out.stderr.toString(), '');
    });
    test('--version', function () {
        let out = cp.spawnSync(bin, ['--version']);
        assert.strictEqual(out.status, 0);
        assert.strictEqual(out.stdout.toString(), version);
        assert.strictEqual(out.stderr.toString(), '');
    });
    test('-v', function () {
        let out = cp.spawnSync(bin, ['-v']);
        assert.strictEqual(out.status, 0);
        assert.strictEqual(out.stdout.toString(), version);
        assert.strictEqual(out.stderr.toString(), '');
    });
});
