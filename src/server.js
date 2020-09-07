let assert = require('assert');
let cp = require('child_process');
let events = require('events');
let fs = require('fs');
let http = require('http');

let dateFormat = require('dateformat');
let md = require('markdown-it')({
    html: true,
    breaks: true
});
let pug = require('pug');
let qs = require('querystring');
let serveStatic = require('serve-static');

let stat = require('./stat');

class Server {
    #server;

    constructor() {
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

        let config = null;
        try {
            config = JSON.parse(fs.readFileSync('config.json'));
        } catch(err) {}

        if (config != null && config.title != undefined) {
            __title = config.title;
        }

        let favorites;
        try {
            favorites = new Set(fs.readFileSync(__favoritesFile).toString().lines());
        } catch(err) {
            favorites = new Set();
        }

        let pugVars = {
            fs: fs,
            dateFormat: dateFormat,
            md: md,
            title: __title,
            favorites: favorites,
            firstYear: firstYear,
            firstMonth: firstMonth,
            lastYear: lastYear,
            lastMonth: lastMonth
        }

        this.#server = http.createServer((req, res) => {
            let url = decodeURI(req.url);

            // Home
            if (url == '/') {
                res.end(pugStart(Object.create(pugVars)));
                return;
            }

            {
                // Month view
                let match = url.match(/^\/(\d{4})\/(\d{2})$/);
                if (match != null) {
                    let [ , year, month] = match;
                    res.end(pugMonth(Object.assign(Object.create(pugVars), {
                        year: year,
                        month: month
                    })));
                    return;
                }
            }

            {
                // Favorites view
                let match = url.match(/^\/favorites$/);
                if (match != null) {
                    res.end(pugFavorites(Object.create(pugVars)));
                    return;
                }
            }

            {
                // Post view
                let match = url.match(/(\d{4})\/(\d{2})\/(\d{2})(\/(\d{2})\/(\d{2})\/(\d{2}))?$/);
                if (match != null) {
                    let [ , year, month, day, , hour, minute, second] = match;
                    res.end(pugPostView(Object.assign(Object.create(pugVars), {
                        year: year,
                        month: month,
                        day: day,
                        hour: hour,
                        minute: minute,
                        second: second
                    })));
                    return;
                }
            }

            {
                // Edit view
                let match = url.match(/(\d{4})\/(\d{2})\/(\d{2})(\/(\d{2})\/(\d{2})\/(\d{2}))?\/edit$/);
                if (match != null) {
                    let [ , year, month, day, , hour, minute, second] = match;
                    res.end(pugPostEdit(Object.assign(Object.create(pugVars), {
                        year: year,
                        month: month,
                        day: day,
                        hour: hour,
                        minute: minute,
                        second: second
                    })));
                    return;
                }
            }

            {
                // Edit submitted
                let match = url.match(/(\d{4})\/(\d{2})\/(\d{2})(\/(\d{2})\/(\d{2})\/(\d{2}))?\?edited$/);
                if (match != null) {
                    let [ , year, month, day, , hour, minute, second] = match;
                    let chunks = [];
                    req.on('data', chunk => chunks.push(chunk));
                    req.on('end', () => {
                        let data = qs.parse(Buffer.concat(chunks).toString()).message.replace(/\r/g, '') + '\n';
                        if (hour === undefined) {
                            fs.writeFileSync(`content/${year}/${month}/${day}/allday.md`, data);
                            res.writeHead(301, {Location: `/${year}/${month}/${day}`});
                        } else {
                            fs.writeFileSync(`content/${year}/${month}/${day}/${hour}-${minute}-${second}.md`, data);
                            res.writeHead(301, {Location: `/${year}/${month}/${day}/${hour}/${minute}/${second}`});
                        }
                        res.end();
                    })
                    return;
                }
            }

            {
                // Favorite submitted
                let match = url.match(/^(\/\d{4}\/\d{2}\/\d{2}(\/\d{2}\/\d{2}\/\d{2})?)\?favorite$/);
                if (match != null) {
                    res.end();
                    let id = match[1];
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
            }

            {
                // Stat view (day)
                let match = url.match(/^\/stat(\/day)?$/);
                if (match != null) {
                    let [data, max] = stat.day();
                    res.end(pugStatDay(Object.assign(Object.create(pugVars), {
                        data: data,
                        max: max
                    })));
                    return;
                }
            }

            {
                // Stat view (month)
                let match = url.match(/^\/stat\/month/);
                if (match != null) {
                    let [data, max] = stat.month();
                    res.end(pugStatMonth(Object.assign(Object.create(pugVars), {
                        data: data,
                        max: max
                    })));
                    return;
                }
            }

            {
                // Stat view (year)
                let match = url.match(/^\/stat\/year/);
                if (match != null) {
                    let [data, max] = stat.year();
                    res.end(pugStatYear(Object.assign(Object.create(pugVars), {
                        data: data,
                        max: max
                    })));
                    return;
                }
            }

            // Static file
            root(req, res, () => assets(req, res, () => res.end('File not found')));
        });
    }

    run(port) {
        return events.once(this.#server.listen(port), 'listening');
    }

    close() {
        return this.#server.close();
    }
}

module.exports = Server;
