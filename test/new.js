let assert = require('assert');
let cp = require('child_process');
let fs = require('fs');
let path = require('path');

let bin = path.join(__dirname, '../build/index.js');
let tmpDir = path.join(__dirname, 'test_data');

suite('new', function () {
    suiteSetup(function () {
        fs.mkdirSync(tmpDir);
        process.chdir(tmpDir);
    });

    suiteTeardown(function () {
        cp.execSync(`rm -r ${tmpDir}`);
    });

    suite('with a specified date', function () {
        teardown(function () {
            cp.execSync('rm -r content');
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
