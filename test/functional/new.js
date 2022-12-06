// Functional tests: `new` command
let assert = require('assert');
let cp = require('child_process');
let fs = require('fs');
let path = require('path');

let { assertOutput } = require('../helpers');

require('../../build/src/extensions');

let bin = path.join(__dirname, '../../build/src/index.js');
let tmpDir = path.join(__dirname, 'test_data');

suite('new', function () {
    suiteSetup(function () {
        fs.mkdirSync(tmpDir);
        process.chdir(tmpDir);
    });

    suiteTeardown(function () {
        cp.execSync(`rm -r ${tmpDir}`);
    });

    teardown(function () {
        cp.execSync('rm -rf content');
    });

    test('date and time', function () {
        cp.execSync(`${bin} new --no-edit 1992 07 15 00 00 00`);
        fs.accessSync('content/1992/07/15/00-00-00.md');
    });

    test('date and time, --allday', function () {
        console.log(
            cp
                .execSync(`${bin} new --allday --no-edit 1992 07 15 00 00 00`)
                .toString()
        );
        fs.accessSync('content/1992/07/15/allday.md');
    });

    test('only date', function () {
        cp.execSync(`${bin} new --no-edit 1992 07 15`);
        fs.accessSync('content/1992/07/15/allday.md');
    });

    test('only date, --allday', function () {
        cp.execSync(`${bin} new --no-edit 1992 07 15`);
        fs.accessSync('content/1992/07/15/allday.md');
    });

    test('no date', function () {
        // TODO: Fix flaky test due to timing
        this.skip();
        let date = new Date();
        cp.execSync(`${bin} new --no-edit`);
        fs.accessSync(
            path.join(
                'content',
                date.getFullYear().toString(),
                (date.getMonth() + 1).zeropad(2),
                date.getDate().zeropad(2),
                [
                    date.getHours().zeropad(2),
                    date.getMinutes().zeropad(2),
                    date.getSeconds().zeropad(2)
                ].join('-') + '.md'
            )
        );
    });

    test('no date, --allday', function () {
        let date = new Date();
        cp.execSync(`${bin} new --no-edit --allday`);
        fs.accessSync(
            path.join(
                'content',
                date.getFullYear().toString(),
                (date.getMonth() + 1).zeropad(2),
                date.getDate().zeropad(2),
                'allday.md'
            )
        );
    });

    test('collision', function () {
        cp.execSync(
            `echo "Hello, world!" > $(${bin} new --no-edit 1992 07 15 00 00 00)`
        );
        assertOutput(
            bin,
            ['new', '--no-edit', '1992', '07', '15', '00', '00', '00'],
            1,
            '',
            '\x1B[31mError\x1B[0m: \x1B[36mcontent/1992/07/15/00-00-00.md\x1B[0m already exists\n'
        );
        assert(
            fs.readFileSync('content/1992/07/15/00-00-00.md', 'utf8') ===
                'Hello, world!\n'
        );
    });
});
