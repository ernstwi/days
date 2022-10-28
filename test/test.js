let assert = require('assert');
let cp = require('child_process');
let fs = require('fs');
let path = require('path');

let dateformat = require('dateformat');
let puppeteer = require('puppeteer');

let Server = require('../build/server').default;

let bin = path.join(__dirname, '../build/index.js');
let tmpDir = path.join(__dirname, 'test_data');

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

suite('CLI', function () {
    suite('new', function () {
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
                        cp.execSync(
                            `${bin} new --no-edit 1992 07 15 00 00 00`,
                            { stdio: 'ignore' }
                        );
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

    suite('merge', function () {
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
                cp.execSync(
                    'echo "image data in source dir" > assets/image.png'
                );
                process.chdir('../target');
            });

            teardown(function () {
                process.chdir('..');
                cp.execSync('rm -rf source target');
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
                });

                test('should set created and modified date on merged posts', function () {
                    cp.execSync(`${bin} merge ../source`);
                    let stat = fs.statSync('content/1992/07/15/00-00-00.md');
                    assert(
                        stat.birthtime.getTime() ===
                            new Date(1992, 07, 15).getTime()
                    );
                    assert(
                        stat.mtime.getTime() ===
                            new Date(1992, 07, 16).getTime()
                    );
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
                cp.execSync('rm -rf content');
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
});

suite('Web', function () {
    this.timeout(10000);

    let browser;
    let page;
    let server;

    suiteSetup(async function () {
        browser = await puppeteer.launch();
        page = await browser.pages().then(pages => pages[0]);
        cp.execSync(`${bin} new --no-edit 2020 01 01 12 00 00`);
        cp.execSync(`${bin} new --no-edit 2020 01 11 01 00 00`);
        server = new Server('days', 'fruchtig');
        await server.listen(3004);
    });

    suiteTeardown(async function () {
        await browser.close();
        await server.close();
        cp.execSync('rm -rf content');
    });

    suite('start page', function () {
        test('should display the start page', async function () {
            await page.goto('http://localhost:3004');

            // There should be a banner
            let banner = await page.$eval(
                '#banner',
                banner => banner.innerHTML
            );
            assert.strictEqual(banner, '<a href="/">days</a>');

            // And an index with one year, and only january should be a link
            let years = await page.$$eval('.row', rows => rows.length);
            assert.strictEqual(years, 1);

            let months = await page.$$eval('.month', months => months.length);
            assert.strictEqual(months, 12);

            let links = await page.$$eval('.month', months =>
                months
                    .filter(month => month.firstChild.tagName === 'A')
                    .map(month => month.innerHTML)
            );
            assert.strictEqual(links.length, 1);
            assert.strictEqual(links[0], '<a href="/2020/01">jan</a>');
        });
    });

    suite('edit post', function () {
        test('edit post', async function () {
            await page.goto('http://localhost:3004/2020/01/01/12/00/00/edit');
            await page.type('textarea', 'Hello, world!');
            await Promise.all([
                page.waitForNavigation(),
                page.click('#submit-edit')
            ]);
            let text = await page.evaluate(() => {
                return document.getElementsByClassName('post-body')[0]
                    .innerText;
            });

            assert(text === 'Hello, world!');
            assert(
                fs.readFileSync('content/2020/01/01/12-00-00.md', 'utf8') ===
                    'Hello, world!\n'
            );
        });
    });

    suite('month page', function () {
        test('should presents posts at 01:00 as belonging to the previous day', async function () {
            await page.goto('http://localhost:3004/2020/01');
            let oneAmHeader = await page.$eval(
                '.header:nth-child(3)',
                x => x.innerText
            );
            assert.strictEqual(oneAmHeader, 'Friday, January 10 2020');
        });

        test('should display the month page', async function () {
            await page.goto('http://localhost:3004/2020/01');

            let selectors = [
                '#banner',
                '#container',
                '#container > #sidebar',
                '#container > #primary',
                '#container > #primary > .header',
                '#container > #primary > .post',
                '#container > #primary > .post > .post-body.view',
                '#container > #primary > .post > .post-footer'
            ];
            for (let s of selectors) {
                assert.notStrictEqual(await page.$(s), null);
            }

            let postCount = await page.$$eval('.post', posts => posts.length);
            assert.strictEqual(postCount, 2);
        });

        test('should handle months without posts', async function () {
            await page.goto('http://localhost:3004/2020/02');
            let content = await page.$eval('#primary', x => x.innerHTML);
            assert.strictEqual(
                content,
                '<div id="no-posts-container"><div id="no-posts">No posts this February.</div></div>'
            );
        });
    });
});
