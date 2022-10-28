let assert = require('assert');
let cp = require('child_process');
let fs = require('fs');
let path = require('path');

let bin = path.join(__dirname, '../build/index.js');
let tmpDir = path.join(__dirname, 'test_data');

suite('new', function () {
    suiteSetup(function () {
        Number.prototype.zeropad = function (width) {
            let res = this.toString();
            return res.length >= width
                ? res
                : new Array(width - res.length + 1).join('0') + res;
        };

        Array.prototype.last = function () {
            return this[this.length - 1];
        };

        String.prototype.lines = function () {
            let res = this.split('\n');

            // Trailing newline
            if (res[res.length - 1] === '') {
                res.splice(-1, 1);
            }

            return res;
        };

        fs.mkdirSync(tmpDir);
        process.chdir(tmpDir);
    });

    suiteTeardown(function () {
        cp.execSync(`rm -rf ${tmpDir}`);
    });

    suite('with a specified date', function () {
        teardown(function () {
            cp.execSync('rm -rf content');
        });

        suite('no collision', function () {
            test('should create a new file', function () {
                cp.execSync(`${bin} new --no-edit 1992 07 15 00 00 00`);
                fs.accessSync('content/1992/07/15/00-00-00.md');
            });
        });

        suite('collision', function () {
            test('should not overwrite an existing file', function () {
                cp.execSync(
                    `echo "Hello, world!" > $(${bin} new --no-edit 1992 07 15 00 00 00)`
                );
                assert.throws(() => {
                    cp.execSync(`${bin} new --no-edit 1992 07 15 00 00 00`, {
                        stdio: 'ignore'
                    });
                });
                assert(
                    fs.readFileSync(
                        'content/1992/07/15/00-00-00.md',
                        'utf8'
                    ) === 'Hello, world!\n'
                );
            });
        });
    });
});
