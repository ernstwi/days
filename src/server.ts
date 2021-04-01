import assert = require('assert');
import cp = require('child_process');
import events = require('events');
import fs = require('fs');
import http = require('http');
import path = require('path');

import pug = require('pug');
import qs = require('querystring');
import serveStatic = require('serve-static');
import markdownIt = require('markdown-it');

import * as month from './month';
import * as stat from './stat';
import CustomDate from './custom-date';

let templateDir = path.join(__dirname, '../templates');

class Server {
    #port;
    #server;

    constructor(title: string, port: number, theme: string) {
        if (!fs.existsSync('content')) {
            console.error(`\x1b[31mError\x1b[0m: No content`);
            process.exit(1);
        }

        let root = serveStatic(path.join(__dirname, '..'));
        let assets = serveStatic('assets');

        let md = markdownIt({
            html: true,
            breaks: true
        });

        let pugStart     = pug.compileFile(`${templateDir}/start.pug`);
        let pugMonth     = pug.compileFile(`${templateDir}/month/main.pug`);
        let pugFavorites = pug.compileFile(`${templateDir}/favorites.pug`);
        let pugPostView  = pug.compileFile(`${templateDir}/post-view/main.pug`);
        let pugPostEdit  = pug.compileFile(`${templateDir}/post-edit/main.pug`);
        let pugStatDay   = pug.compileFile(`${templateDir}/stat/day.pug`);
        let pugStatMonth = pug.compileFile(`${templateDir}/stat/month.pug`);
        let pugStatYear  = pug.compileFile(`${templateDir}/stat/year.pug`);

        let firstYear  = parseInt(fs.readdirSync('content').filter(f => /\d{4}/.test(f))[0]);
        let firstMonth = parseInt(fs.readdirSync(`content/${firstYear}`).filter(f => /\d{2}/.test(f))[0]);
        let lastYear   = parseInt(fs.readdirSync('content').filter(f => /\d{4}/.test(f)).last());
        let lastMonth  = parseInt(fs.readdirSync(`content/${lastYear}`).filter(f => /\d{2}/.test(f)).last());

        let favorites: Set<string>;
        try {
            favorites = new Set(fs.readFileSync('.fav').toString().lines());
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
            let url = decodeURI(req.url as string);

            // Home
            if (url == '/') {
                res.end(pugStart(Object.create(pugVars)));
                return;
            }

            // Month view
            if (/^\/(\d{4})\/(\d{2})$/.test(url)) {
                res.end(pugMonth(Object.assign(Object.create(pugVars), {
                    date: new CustomDate(url),
                    data: month.posts(new CustomDate(url))
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
                let chunks: Buffer[] = [];
                req.on('data', (chunk: Buffer) => chunks.push(chunk));
                req.on('end', () => {
                    let data = (qs.parse(Buffer.concat(chunks).toString()).message as string)
                        .replace(/\r/g, '') + '\n';
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
                    fs.unlinkSync('.fav');
                else
                    fs.writeFileSync('.fav', [...favorites].sort().join('\n'));
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

export default Server;
