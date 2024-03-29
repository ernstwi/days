import events = require('events');
import fs = require('fs');
import http = require('http');
import path = require('path');
import qs = require('querystring');

import pug = require('pug');
import serveStatic = require('serve-static');

import './extensions';
import { Route, router, HandlerFunc } from './router';
import { Month, Post } from './struct';
import { readPostsStructured } from './read';
import { templateDir, staticDir, assetDir } from './constants';

export default class Server {
    #server: http.Server;

    constructor(title: string, theme: string) {
        let templates: Record<string, pug.compileTemplate> = {
            start: pug.compileFile(path.join(templateDir, 'start.pug')),
            month: pug.compileFile(path.join(templateDir, 'month.pug')),
            postView: pug.compileFile(path.join(templateDir, 'post-view.pug')),
            postEdit: pug.compileFile(path.join(templateDir, 'post-edit.pug')),
            favorites: pug.compileFile(path.join(templateDir, 'favorites.pug'))
        };
        let staticServer = serveStatic(staticDir);
        let assetServer = serveStatic(assetDir);

        let routes = [
            new Route('/', startHandler(templates.start, title, theme)),
            new Route(
                '/(\\d{4})/(\\d{2})',
                monthHandler(templates.month, title, theme)
            ),
            new Route(
                '/(\\d{4})/(\\d{2})/(\\d{2})(/(\\d{2})/(\\d{2})/(\\d{2}))?',
                postHandler(templates.postView, title, theme)
            ),
            new Route(
                '/(\\d{4})/(\\d{2})/(\\d{2})(/(\\d{2})/(\\d{2})/(\\d{2}))?/edit',
                postHandler(templates.postEdit, title, theme)
            ),
            new Route(
                '/(\\d{4})/(\\d{2})/(\\d{2})(/(\\d{2})/(\\d{2})/(\\d{2}))?\\?edited',
                editSubmitHandler()
            ),
            new Route(
                '/(\\d{4})/(\\d{2})/(\\d{2})(/(\\d{2})/(\\d{2})/(\\d{2}))?\\?favorite',
                favoriteSubmitHandler()
            ),
            new Route(
                '/favorites',
                favoritesHandler(templates.favorites, title, theme)
            ),
            new Route('/static/.*', staticHandler(staticServer)),
            new Route('.*', assetHandler(assetServer))
        ];

        this.#server = http.createServer(router(routes));
    }

    // TODO: What type should this be? events.once resolves to an array of
    // arguments emitted to the event. But `listening` on http.server has no arguments.
    listen(port: number): Promise<any[]> {
        return events.once(this.#server.listen(port, 'localhost'), 'listening');
    }

    close(): void {
        this.#server.close();
    }
}

function startHandler(
    template: pug.compileTemplate,
    title: string,
    theme: string
): HandlerFunc {
    return function (_req, res) {
        let { years } = readPostsStructured();
        res.end(
            template({
                title: title,
                theme: theme,
                years: [...years.values()]
            })
        );
    };
}

function monthHandler(
    template: pug.compileTemplate,
    title: string,
    theme: string
): HandlerFunc {
    return function (this: Route, req, res) {
        let [year, month] = this.captureGroups(req.url as string);
        let { years, months } = readPostsStructured();
        let emptyMonth = new Month(year, month);
        res.end(
            template({
                title: title,
                theme: theme,
                years: [...years.values()],
                month: months.get(emptyMonth.id) || emptyMonth
            })
        );
    };
}

function postHandler(
    template: pug.compileTemplate,
    title: string,
    theme: string
): HandlerFunc {
    return function (this: Route, req, res) {
        let [year, month, day, , hour, min, sec] = this.captureGroups(
            req.url as string
        );
        let { years, months, posts } = readPostsStructured();
        res.end(
            template({
                title: title,
                theme: theme,
                years: [...years.values()],
                month: months.get(new Month(year, month).id) as Month,
                post: posts.get(
                    new Post(year, month, day, hour, min, sec).id
                ) as Post
            })
        );
    };
}

function favoritesHandler(
    template: pug.compileTemplate,
    title: string,
    theme: string
): HandlerFunc {
    return function (this: Route, _req, res) {
        let { years } = readPostsStructured();
        let { days } = readPostsStructured(p => p.favorite);
        res.end(
            template({
                title: title,
                theme: theme,
                years: [...years.values()],
                days: [...days.values()]
            })
        );
    };
}

function editSubmitHandler(): HandlerFunc {
    return function (this: Route, req, res) {
        let [year, month, day, , hour, min, sec] = this.captureGroups(
            req.url as string
        );
        let post = new Post(year, month, day, hour, min, sec);
        let chunks: Buffer[] = [];

        req.on('data', (chunk: Buffer) => chunks.push(chunk));

        req.on('end', () => {
            post.body =
                (qs.parse(Buffer.concat(chunks).toString())
                    .message as string).replace(/\r/g, '') + '\n';
            post.write();
            res.writeHead(301, { Location: post.url });
            res.end();
        });
    };
}

function favoriteSubmitHandler(): HandlerFunc {
    return function (this: Route, req, res) {
        res.end();
        let [year, month, day, , hour, min, sec] = this.captureGroups(
            req.url as string
        );
        let post = new Post(year, month, day, hour, min, sec);
        let favorites = fs.existsSync('.fav')
            ? new Set(fs.readFileSync('.fav', { encoding: 'utf8' }).lines())
            : new Set();

        if (favorites.has(post.id)) favorites.delete(post.id);
        else favorites.add(post.id);

        if (favorites.size === 0) fs.unlinkSync('.fav');
        else fs.writeFileSync('.fav', [...favorites].sort().join('\n'));
    };
}

function staticHandler(
    server: serveStatic.RequestHandler<http.ServerResponse>
): HandlerFunc {
    return function (req, res) {
        req.url = (req.url as string).substring('/static/'.length);
        server(req, res, () => res.end('File not found')); // TODO: Proper error
    };
}

function assetHandler(
    server: serveStatic.RequestHandler<http.ServerResponse>
): HandlerFunc {
    return function (req, res) {
        server(req, res, () => res.end('File not found'));
    };
}
