let cp = require('child_process');
let fs = require('fs');
let http = require('http');
let qs = require('querystring');

let pug = require('pug');
let serveStatic = require('serve-static');
let dateFormat = require('dateformat');
let md = require('markdown-it')({
    html: true,
    breaks: true
});

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

class Server {
    #server;

    constructor() {
        if (!fs.existsSync('content')) {
            console.error(`${__binname}: \x1b[31mError\x1b[0m: No content.`);
            process.exit(1);
        }

        let root = serveStatic(__basedir);
        let assets = serveStatic('assets');

        let pugStartView = pug.compileFile(`${__basedir}/templates/view/start.pug`);
        let pugMonthView = pug.compileFile(`${__basedir}/templates/view/month.pug`);
        let pugPostView  = pug.compileFile(`${__basedir}/templates/view/post.pug`);
        let pugPostEdit  = pug.compileFile(`${__basedir}/templates/view/edit.pug`);

        let firstYear  = parseInt(fs.readdirSync('content').filter(f => /\d{4}/.test(f))[0]);
        let firstMonth = parseInt(fs.readdirSync(`content/${firstYear}`).filter(f => /\d{2}/.test(f))[0]);
        let lastYear   = parseInt(fs.readdirSync('content').filter(f => /\d{4}/.test(f)).last());
        let lastMonth  = parseInt(fs.readdirSync(`content/${lastYear}`).filter(f => /\d{2}/.test(f)).last());

        let title = 'Journal';
        let config = null;
        try {
            config = JSON.parse(fs.readFileSync('config.json'));
        } catch(err) {}

        if (config != null && config.title != undefined) {
            title = config.title;
        }

        let pugVars = {
            fs: fs,
            dateFormat: dateFormat,
            md: md,
            title: title,
            firstYear: firstYear,
            firstMonth: firstMonth,
            lastYear: lastYear,
            lastMonth: lastMonth
        }

        this.#server = http.createServer((req, res) => {
            let url = decodeURI(req.url);

            // Home
            if (url == '/') {
                res.end(pugStartView(Object.assign(Object.create(pugVars), {
                    monthIndexLayout: 'horizontal'
                })));
                return;
            }

            {
                // Month view
                let match = url.match(/^\/(\d{4})\/(\d{2})$/);
                if (match != null) {
                    let [_, year, month] = match;
                    res.end(pugMonthView(Object.assign(Object.create(pugVars), {
                        monthIndexLayout: 'vertical',
                        year: year,
                        month: month
                    })));
                    return;
                }
            }

            {
                // Post view
                let match = url.match(/(\d{4})\/(\d{2})\/(\d{2})(\/(\d{2})\/(\d{2})\/(\d{2}))?$/);
                if (match != null) {
                    let [_, year, month, day, __, hour, minute, second] = match;
                    res.end(pugPostView(Object.assign(Object.create(pugVars), {
                        monthIndexLayout: 'vertical',
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
                    let [_, year, month, day, __, hour, minute, second] = match;
                    res.end(pugPostEdit(Object.assign(Object.create(pugVars), {
                        monthIndexLayout: 'vertical',
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
                    let [_, year, month, day, __, hour, minute, second] = match;
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

            // Static file
            root(req, res, () => assets(req, res, () => res.end('File not found')));
        });
    }

    run(port) {
        this.#server.on('error', err => {
            console.error(`${__binname}: \x1b[31mError\x1b[0m: Port ${port} is already in use.`);
            process.exit(1);
        });

        this.#server.listen(port, () => console.log(`Server is listening on http://localhost:${port}`));
    }
}

exports.Server = Server;
