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
        assertOutput(bin, [], 1, '', help);
    });
    test('undefined command', function () {
        assertOutput(bin, [], 1, '', help);
    });
    test('--help', function () {
        assertOutput(bin, ['--help'], 0, help, '');
    });
    test('-h', function () {
        assertOutput(bin, ['-h'], 0, help, '');
    });
    test('--version', function () {
        assertOutput(bin, ['--version'], 0, version, '');
    });
    test('-v', function () {
        assertOutput(bin, ['-v'], 0, version, '');
    });
});

function assertOutput(cmd, args, status, stdout, stderr) {
    let out = cp.spawnSync(cmd, args);
    assert.strictEqual(out.status, status);
    assert.strictEqual(out.stdout.toString(), stdout);
    assert.strictEqual(out.stderr.toString(), stderr);
}
