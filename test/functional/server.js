// Functional tests: Web UI
let assert = require('assert');
let cp = require('child_process');
let fs = require('fs');
let path = require('path');

let puppeteer = require('puppeteer');

let Server = require('../../build/server').default;

let bin = path.join(__dirname, '../../build/index.js');
let tmpDir = path.join(__dirname, 'test_data');

suite('server', function () {
    let browser;
    let page;
    let server;

    suiteSetup(async function () {
        fs.mkdirSync(tmpDir);
        process.chdir(tmpDir);

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
        cp.execSync(`rm -r ${tmpDir}`);
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

            assert.strictEqual(text, 'Hello, world!');
            assert.strictEqual(
                fs.readFileSync('content/2020/01/01/12-00-00.md', 'utf8'),
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
