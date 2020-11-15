let assert = require('assert');
let cp = require('child_process');
let events = require('events');
let fs = require('fs');
let http = require('http');

let md = require('markdown-it')({
    html: true,
    breaks: true
});
let pug = require('pug');
let qs = require('querystring');
let serveStatic = require('serve-static');

let CustomDate = require('./custom-date');
let stat = require('./stat');

class Server {
    #port;
    #server;

    constructor(title, port, theme) {
        if (!fs.existsSync('content')) {
            console.error(`\x1b[31mError\x1b[0m: No content`);
            process.exit(1);
        }

        let root = serveStatic(__basedir);
        let assets = serveStatic('assets');

        let pugStart     = pug.compileFile(`${__basedir}/templates/start.pug`);
        let pugMonth     = pug.compileFile(`${__basedir}/templates/month/main.pug`);
        let pugFavorites = pug.compileFile(`${__basedir}/templates/favorites.pug`);
        let pugPostView  = pug.compileFile(`${__basedir}/templates/post-view/main.pug`);
        let pugPostEdit  = pug.compileFile(`${__basedir}/templates/post-edit/main.pug`);
        let pugStatDay   = pug.compileFile(`${__basedir}/templates/stat/day.pug`);
        let pugStatMonth = pug.compileFile(`${__basedir}/templates/stat/month.pug`);
        let pugStatYear  = pug.compileFile(`${__basedir}/templates/stat/year.pug`);

        let firstYear  = parseInt(fs.readdirSync('content').filter(f => /\d{4}/.test(f))[0]);
        let firstMonth = parseInt(fs.readdirSync(`content/${firstYear}`).filter(f => /\d{2}/.test(f))[0]);
        let lastYear   = parseInt(fs.readdirSync('content').filter(f => /\d{4}/.test(f)).last());
        let lastMonth  = parseInt(fs.readdirSync(`content/${lastYear}`).filter(f => /\d{2}/.test(f)).last());

        let favorites;
        try {
            favorites = new Set(fs.readFileSync(__favoritesFile).toString().lines());
        } catch(err) {
            favorites = new Set();
        }

        let pugVars = {
            title: title,
            theme: theme,
            fs: fs,
            md: md,
            CustomDate: CustomDate,
            favorites: favorites,
            firstYear: firstYear,
            firstMonth: firstMonth,
            lastYear: lastYear,
            lastMonth: lastMonth
        }

        this.#port = port;

        this.#server = http.createServer((req, res) => {
            let url = decodeURI(req.url);

            // Home
            if (url == '/') {
                res.end(pugStart(Object.create(pugVars)));
                return;
            }

            // Month view
            if (/^\/(\d{4})\/(\d{2})$/.test(url)) {
                res.end(pugMonth(Object.assign(Object.create(pugVars), {
                    date: new CustomDate(url)
                })));
                return;
            }

            // Favorites view
            if (/^\/favorites$/.test(url)) {
                res.end(pugFavorites(Object.create(pugVars)));
                return;
            }

            // Post view
            if (/(\d{4})\/(\d{2})\/(\d{2})(\/(\d{2})\/(\d{2})\/(\d{2}))?$/.test(url)) {
                res.end(pugPostView(Object.assign(Object.create(pugVars), {
                    date: new CustomDate(url)
                })));
                return;
            }

            // Edit view
            if (/(\d{4})\/(\d{2})\/(\d{2})(\/(\d{2})\/(\d{2})\/(\d{2}))?\/edit$/.test(url)) {
                res.end(pugPostEdit(Object.assign(Object.create(pugVars), {
                    date: new CustomDate(url)
                })));
                return;
            }

            // Edit submitted
            if (/(\d{4})\/(\d{2})\/(\d{2})(\/(\d{2})\/(\d{2})\/(\d{2}))?\?edited$/.test(url)) {
                let chunks = [];
                req.on('data', chunk => chunks.push(chunk));
                req.on('end', () => {
                    let data = qs.parse(Buffer.concat(chunks).toString()).message.replace(/\r/g, '') + '\n';
                    let date = new CustomDate(url);
                    fs.writeFileSync(date.file(), data);
                    res.writeHead(301, {Location: date.postUrl()});
                    res.end();
                })
                return;
            }

            // Favorite submitted
            if (/^(\/\d{4}\/\d{2}\/\d{2}(\/\d{2}\/\d{2}\/\d{2})?)\?favorite$/.test(url)) {
                res.end();
                let id = new CustomDate(url).postUrl();
                if (favorites.has(id))
                    favorites.delete(id);
                else
                    favorites.add(id);

                if (favorites.size == 0)
                    fs.unlinkSync(__favoritesFile);
                else
                    fs.writeFileSync(__favoritesFile, [...favorites].join('\n'));
                return;
            }

            // Stat view (day)
            if (/^\/stat(\/day)?$/.test(url)) {
                let [data, max] = stat.day();
                res.end(pugStatDay(Object.assign(Object.create(pugVars), {
                    data: data,
                    max: max
                })));
                return;
            }

            // Stat view (month)
            if (/^\/stat\/month/.test(url)) {
                let [data, max] = stat.month();
                res.end(pugStatMonth(Object.assign(Object.create(pugVars), {
                    data: data,
                    max: max
                })));
                return;
            }

            // Stat view (year)
            if (/^\/stat\/year/.test(url)) {
                let [data, max] = stat.year();
                res.end(pugStatYear(Object.assign(Object.create(pugVars), {
                    data: data,
                    max: max
                })));
                return;
            }

            // Static file
            root(req, res, () => assets(req, res, () => res.end('File not found')));
        });
    }

    run() {
        return events.once(this.#server.listen(this.#port), 'listening');
    }

    close() {
        return this.#server.close();
    }
}

module.exports = Server;
