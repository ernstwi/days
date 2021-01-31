let assert = require('assert');
let cp = require('child_process');
let fs = require('fs');
let path = require('path');

let dateformat = require('dateformat');
let puppeteer = require('puppeteer');

let Server = require('../src/server');

before(function() {
    global.__basedir = path.join(__dirname, '..');
    global.__binname = 'days';
    global.__favoritesFile = '.fav';

    if (!Number.prototype.zeropad) {
        Number.prototype.zeropad = function(width) {
            let res = this.toString();
            return res.length >= width ? res :
                new Array(width - res.length + 1).join('0') + res;
        }
    }

    if (!Array.prototype.last) {
        Array.prototype.last = function() {
            return this[this.length - 1];
        }
    }

    if (!String.prototype.lines) {
        String.prototype.lines = function() {
            let res = this.split('\n');

            // Trailing newline
            if (res[res.length-1] == '') {
                res.splice(-1, 1);
            }

            return res;
        }
    }

    cp.execSync('npm install -g');
    process.chdir('test');
});

describe('CLI', function() {
    describe('new', function() {
        context('with a specified date', function() {
            afterEach(function() {
                cp.execSync('rm -rf content');
            });

            context('no collision', function() {
                it('should create a new file', function() {
                    cp.execSync('days new --no-edit 1992 07 15 00 00 00');
                    fs.accessSync('content/1992/07/15/00-00-00.md');
                });
            });
            context('collision', function() {
                it('should not overwrite an existing file', function() {
                    cp.execSync('echo "Hello, world!" > $(days new --no-edit 1992 07 15 00 00 00)');
                    assert.throws(() => {
                        cp.execSync('days new --no-edit 1992 07 15 00 00 00', { stdio: 'ignore' })
                    });
                    assert(fs.readFileSync('content/1992/07/15/00-00-00.md', 'utf8') == 'Hello, world!\n');
                });
            });
        });
    });

    describe('merge', function() {
        describe('path', function() {
            beforeEach(function() {
                fs.mkdirSync('source');
                fs.mkdirSync('target');
                process.chdir('source');
                cp.execSync('echo "a reference to /image.png" > $(days new --no-edit 1992 07 15 00 00 00)');
                fs.utimesSync('content/1992/07/15/00-00-00.md', new Date(), new Date(1992, 07, 15));
                fs.utimesSync('content/1992/07/15/00-00-00.md', new Date(), new Date(1992, 07, 16));
                fs.mkdirSync('assets/subdir', { recursive: true });
                cp.execSync('echo "image data in source dir" > assets/image.png');
                process.chdir('../target');
            });

            afterEach(function() {
                process.chdir('..');
                cp.execSync('rm -rf source target');
            });

            context('no conflict', function() {
                it('should merge all posts and assets', function() {
                    cp.execSync('days merge ../source');
                    assert(fs.readFileSync('content/1992/07/15/00-00-00.md', 'utf8') == 'a reference to /image.png\n');
                });

                it('should set created and modified date on merged posts', function() {
                    cp.execSync('days merge ../source');
                    let stat = fs.statSync('content/1992/07/15/00-00-00.md');
                    assert(stat.birthtime.getTime() == new Date(1992, 07, 15).getTime());
                    assert(stat.mtime.getTime() == new Date(1992, 07, 16).getTime());
                });

            });

            context('post conflict', function() {
                it('should not overwrite an existing post', function() {
                    cp.execSync('echo "new content in target dir" > $(days new --no-edit 1992 07 15 00 00 00)');
                    cp.execSync('days merge ../source', { stdio: 'ignore' });
                    assert(fs.readFileSync('content/1992/07/15/00-00-00.md', 'utf8') == 'new content in target dir\n');
                });
            });

            context('asset conflict', function() {
                beforeEach(function() {
                    fs.mkdirSync('assets');
                    cp.execSync('echo "image data in target dir" > assets/image.png');
                });

                context('no --resolve', function() {
                    it('should ignore the colliding merged asset', function() {
                        cp.execSync('days merge ../source', { stdio: 'ignore' });
                        assert(fs.readFileSync('assets/image.png', 'utf8') == 'image data in target dir\n');
                    });
                });

                context('--resolve', function() {
                    it('should rename the colliding merged asset', function() {
                        cp.execSync('days merge --resolve ../source', { stdio: 'ignore' });
                        assert(fs.readFileSync('assets/image.png', 'utf8') == 'image data in target dir\n');
                        assert(fs.readFileSync('assets/image-0.png', 'utf8') == 'image data in source dir\n');
                        assert(fs.readFileSync('content/1992/07/15/00-00-00.md', 'utf8') == 'a reference to /image-0.png\n');
                    });
                });
            });
        });

        describe('imessage', function() {
            context('no conflict', function() {
                it('should set created and modified date on merged posts', function() {
                    cp.execSync('osascript send-imessage.applescript "ernstwi_days_testing@icloud.com" "new message"');
                    cp.execSync('days merge --imessage "ernstwi_days_testing@icloud.com"');
                    let postDate = new Date();
                    let dir = dateformat(postDate, '"content"/yyyy/mm/dd');
                    let post = fs.readdirSync(dir)[0];
                    let [hr, min, sec] = post.split('-');
                    sec = sec.substring(0, 2);
                    postDate.setHours(hr, min, sec, 0);
                    let stat = fs.statSync(path.join(dir, post));
                    assert(stat.birthtime.getTime() == postDate.getTime());
                    assert(stat.mtime.getTime() == postDate.getTime());
                    let text = fs.readFileSync(path.join(dir, post), 'utf8');
                    assert(text == 'new message\n');
                });
            });
        });
    });
});

describe('Web', function() {
    let server;

    before(async function() {
        cp.execSync('days new --no-edit 2020 01 01 12 00 00');
        server = new Server('days', 3004, 'fruchtig');
        await server.run();
    });

    after(async function() {
        await server.close();
        cp.execSync('rm -rf content');
    });

    describe('edit post', function() {
        it('edit post', async function() {
            let browser = await puppeteer.launch();
            let page = await browser.pages().then(pages => pages[0]);
            await page.goto('http://localhost:3004/2020/01/01/12/00/00/edit');
            await page.type('textarea', 'Hello, world!');
            await Promise.all([
                page.waitForNavigation(),
                page.click('#submit-edit')
            ]);
            let text = await page.evaluate(() => {
                return document.getElementsByClassName('post-body')[0].innerText;
            });
            await browser.close();

            assert(text == 'Hello, world!');
            assert(fs.readFileSync('content/2020/01/01/12-00-00.md', 'utf8') == 'Hello, world!\n');
        });
    });
});
