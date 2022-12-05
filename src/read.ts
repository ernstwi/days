// This module contains functions returning sets of structured journal data from
// various sources.

import cp = require('child_process');
import fs = require('fs');
import os = require('os');
import path = require('path');

import parse = require('csv-parse/lib/sync');

import './extensions';
import { Year, Month, Day, Post, Asset } from './struct';

type PostFilter = (post: Post) => boolean;

interface Identifiable {
    id: string;
}

type csv = string[][];

// Read posts and assets from `root`.
export function readPath(root: string): [Post[], Asset[]] {
    let posts = [...readPosts(root).values()];
    let assets = readAssets(root).map(
        f => new Asset(path.relative(path.join(root, 'assets'), f), f)
    ); // TODO: Make this cleaner?
    return [posts, assets];
}

// Read posts and assets from iMessage.
export function readImessage(user: string): [Post[], Asset[]] {
    // Collect data from Messages database
    let posts: Map<string, Post> = new Map();
    let assets: Map<string, Asset[]> = new Map();

    for (let [id, time] of sqlite(user, 'sql/time.sql')) {
        let date = new Date(Number(time) * 1000);
        let post = new Post(false, date);
        post.birthtime = post.mtime = date;
        posts.set(id, post);
    }

    for (let [id, text] of sqlite(user, 'sql/text.sql')) {
        // HACK: Remove U+FFFC (object replacement character) which is sometimes
        // mysteriously present
        text = text.replace(/￼/g, '');

        text += '\n';

        (posts.get(id) as Post).body = text; // Works because map stores Post by reference
    }

    for (let [id, file] of sqlite(user, 'sql/asset.sql')) {
        file = file.replace(/^~/, os.homedir()); // Absoulte path of asset
        if (!assets.has(id)) assets.set(id, []);
        (assets.get(id) as Asset[]).push(new Asset(path.basename(file), file));
    }

    // Add assets to head of post text
    for (let [id, post] of posts) {
        if (!assets.has(id)) continue;

        let assetsHeader =
            (assets.get(id) as Asset[])
                .map((a: Asset) => a.htmlTag)
                .join('\n') + '\n';
        if (post.body === '') post.body = assetsHeader;
        else post.body = [assetsHeader, post.body].join('\n');
    }

    return [[...posts.values()], [...assets.values()].flatMap(x => x)];
}

// Read posts from the current dir and package into a struct tree (used by
// Server).
export function readPostsStructured(
    filter?: PostFilter
): {
    years: Map<string, Year>;
    months: Map<string, Month>;
    days: Map<string, Day>;
    posts: Map<string, Post>;
} {
    let years = new Map<string, Year>();
    let months = new Map<string, Month>();
    let days = new Map<string, Day>();
    let posts = readPosts('.', filter);

    {
        // Prefill years with every year between the first and last in file system
        let yearsDir = filterDir('content', /^\d{4}$/);
        for (
            let i = parseInt(yearsDir[0]);
            i <= parseInt(yearsDir.last());
            i++
        ) {
            let y = i.toString(); // Assumption: Year has four digits
            years.set(y, new Year(y));
        }
    }

    for (let p of posts.values()) {
        let y = getOrMake(years, new Year(p.displayDate.year));
        let m = getOrMake(
            months,
            new Month(p.displayDate.year, p.displayDate.month)
        );
        let d = getOrMake(
            days,
            new Day(p.displayDate.year, p.displayDate.month, p.displayDate.day)
        );

        if (p.time === undefined) d.alldayPost = p;
        else d.timedPosts.push(p);

        if (m.days.last() !== d) m.days.push(d);

        y.months[parseInt(m.month) - 1] = m;
    }

    return { years, months, days, posts };
}

// ---- Helpers ----------------------------------------------------------------

// Read posts from `root`.
function readPosts(root = '.', filter?: PostFilter): Map<string, Post> {
    let res = new Map<string, Post>();
    let favorites = fs.existsSync('.fav')
        ? new Set(fs.readFileSync('.fav', { encoding: 'utf8' }).lines())
        : new Set();
    let years = filterDir(path.join(root, 'content'), /^\d{4}$/);
    for (let y of years) {
        for (let m of filterDir(path.join(root, 'content', y), /^\d{2}$/)) {
            for (let d of filterDir(
                path.join(root, 'content', y, m),
                /^\d{2}$/
            )) {
                for (let f of filterDir(
                    path.join(root, 'content', y, m, d),
                    /^(\d{2}-\d{2}-\d{2}\.md)|(allday\.md)$/
                )) {
                    let p;
                    if (f === 'allday.md') {
                        p = new Post(y, m, d);
                    } else {
                        let [, h, M, s] = f.match(
                            /^(\d{2})-(\d{2})-(\d{2})\.md$/
                        ) as RegExpMatchArray;
                        p = new Post(y, m, d, h, M, s);
                    }
                    if (favorites.has(p.id)) p.favorite = true;
                    p.root = root;
                    if (filter === undefined || filter(p)) res.set(p.id, p);
                }
            }
        }
    }
    return res;
}

// Read assets from `root`.
function readAssets(root: string): string[] {
    return readdirRecursive(path.join(root, 'assets'));
}

// If map does not contain elem.id, set map[elem.id] := elem. Return map[elem].
function getOrMake<T extends Identifiable>(map: Map<string, T>, elem: T): T {
    let old = map.get(elem.id);
    if (old !== undefined) return old;
    map.set(elem.id, elem);
    return elem;
}

// Return all filenames in dir matching filter.
function filterDir(dir: string, filter: RegExp): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => filter.test(f));
}

// Run sqlite template `file` with `$ID` = `id`.
function sqlite(id: string, file: string): csv {
    let sql = fs
        .readFileSync(path.join(__dirname, file), 'utf8')
        .split('$ID')
        .join(id);
    return parse(
        cp.execSync(`sqlite3 -csv ~/Library/Messages/chat.db`, { input: sql })
    );
}

// Read a directory recursively and return all files in a flat array.
function readdirRecursive(root: string): string[] {
    let res = [];
    if (!fs.existsSync(root)) return [];
    let list = fs.readdirSync(root);
    for (let file of list) {
        // Ignore dotfiles
        if (file.startsWith('.')) continue;

        let next = path.join(root, file);
        let stat = fs.statSync(next);
        if (stat.isDirectory()) {
            // Recurse into a subdirectory
            res.push(...readdirRecursive(next));
        } else {
            // Is a file
            res.push(next);
        }
    }
    return res;
}
