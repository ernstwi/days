let assert = require('assert');
let cp = require('child_process');
let fs = require('fs');
let path = require('path');

let dateformat = require('dateformat');

let bin = path.join(__dirname, '../build/index.js');
let tmpDir = path.join(__dirname, 'test_data');

let mergePath = require(path.join(__dirname, '../build/merge/path')).default;

// TODO: Check entire tree, i.e. make sure no other files are added.

suite('merge', function () {
    suiteSetup(function () {
        fs.mkdirSync(tmpDir);
        process.chdir(tmpDir);
    });

    suiteTeardown(function () {
        cp.execSync(`rm -r ${tmpDir}`);
    });

    suite('path', function () {
        setup(function () {
            fs.mkdirSync('source');
            fs.mkdirSync('target');
            process.chdir('source');
            cp.execSync(
                `echo "a reference to /image.png" > $(${bin} new --no-edit 1992 07 15 00 00 00)`
            );
            fs.utimesSync(
                'content/1992/07/15/00-00-00.md',
                new Date(),
                new Date(1992, 07, 15)
            );
            fs.utimesSync(
                'content/1992/07/15/00-00-00.md',
                new Date(),
                new Date(1992, 07, 16)
            );
            fs.mkdirSync('assets/subdir', { recursive: true });
            cp.execSync('echo "image data in source dir" > assets/image.png');
            process.chdir('../target');
        });

        teardown(function () {
            process.chdir('..');
            cp.execSync('rm -r source target');
        });

        suite('no conflict', function () {
            test('should merge all posts and assets', function () {
                cp.execSync(`${bin} merge ../source`);
                assert(
                    fs.readFileSync(
                        'content/1992/07/15/00-00-00.md',
                        'utf8'
                    ) === 'a reference to /image.png\n'
                );
                assert(
                    fs.readFileSync('assets/image.png', 'utf8') ===
                        'image data in source dir\n'
                );
            });

            test('should set created and modified date on merged posts', function () {
                cp.execSync(`${bin} merge ../source`);
                let stat = fs.statSync('content/1992/07/15/00-00-00.md');
                assert(
                    stat.birthtime.getTime() ===
                        new Date(1992, 07, 15).getTime()
                );
                assert(
                    stat.mtime.getTime() === new Date(1992, 07, 16).getTime()
                );
            });

            test('no asset dir', function () {
                cp.execSync(`rm -r ${path.join(tmpDir, 'source', 'assets')}`);
                assert.doesNotThrow(() => {
                    mergePath(path.join(tmpDir, 'source'), false);
                });
                assert(
                    fs.readFileSync(
                        'content/1992/07/15/00-00-00.md',
                        'utf8'
                    ) === 'a reference to /image.png\n'
                );
            });

            test('no content dir', function () {
                cp.execSync(`rm -r ${path.join(tmpDir, 'source', 'content')}`);
                assert.doesNotThrow(() => {
                    mergePath(path.join(tmpDir, 'source'), false);
                });
                assert(
                    fs.readFileSync('assets/image.png', 'utf8') ===
                        'image data in source dir\n'
                );
            });

            test('no asset or content dir', function () {
                cp.execSync(`rm -r ${path.join(tmpDir, 'source', 'assets')}`);
                cp.execSync(`rm -r ${path.join(tmpDir, 'source', 'content')}`);
                assert.doesNotThrow(() => {
                    mergePath(path.join(tmpDir, 'source'), false);
                });
            });
        });

        suite('post conflict', function () {
            test('should not overwrite an existing post', function () {
                cp.execSync(
                    `echo "new content in target dir" > $(${bin} new --no-edit 1992 07 15 00 00 00)`
                );
                cp.execSync(`${bin} merge ../source`, { stdio: 'ignore' });
                assert(
                    fs.readFileSync(
                        'content/1992/07/15/00-00-00.md',
                        'utf8'
                    ) === 'new content in target dir\n'
                );
            });
        });

        suite('asset conflict', function () {
            setup(function () {
                fs.mkdirSync('assets');
                cp.execSync(
                    'echo "image data in target dir" > assets/image.png'
                );
            });

            suite('no --resolve', function () {
                test('should ignore the colliding merged asset', function () {
                    cp.execSync(`${bin} merge ../source`, {
                        stdio: 'ignore'
                    });
                    assert(
                        fs.readFileSync('assets/image.png', 'utf8') ===
                            'image data in target dir\n'
                    );
                });
            });

            suite('--resolve', function () {
                test('should rename the colliding merged asset', function () {
                    cp.execSync(`${bin} merge --resolve ../source`, {
                        stdio: 'ignore'
                    });
                    assert(
                        fs.readFileSync('assets/image.png', 'utf8') ===
                            'image data in target dir\n'
                    );
                    assert(
                        fs.readFileSync('assets/image-0.png', 'utf8') ===
                            'image data in source dir\n'
                    );
                    assert(
                        fs.readFileSync(
                            'content/1992/07/15/00-00-00.md',
                            'utf8'
                        ) === 'a reference to /image-0.png\n'
                    );
                });
            });
        });
    });

    suite('imessage', function () {
        suiteTeardown(async function () {
            cp.execSync('rm -r content');
        });

        this.timeout(10000);
        suite('no conflict', function () {
            test('should set created and modified date on merged posts', function () {
                cp.execSync(
                    'osascript ../send-imessage.applescript "ernstwi_days_testing@icloud.com" "new message"'
                );
                cp.execSync(
                    `${bin} merge --imessage "ernstwi_days_testing@icloud.com"`
                );
                let postDate = new Date();
                let dir = dateformat(postDate, '"content"/yyyy/mm/dd');
                let post = fs.readdirSync(dir)[0];
                let [hr, min, sec] = post.split('-');
                sec = sec.substring(0, 2);
                postDate.setHours(hr, min, sec, 0);
                let stat = fs.statSync(path.join(dir, post));
                assert(stat.birthtime.getTime() === postDate.getTime());
                assert(stat.mtime.getTime() === postDate.getTime());
                let text = fs.readFileSync(path.join(dir, post), 'utf8');
                assert(text === 'new message\n');
            });
        });
    });
});
