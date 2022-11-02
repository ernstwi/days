#!/usr/bin/env node

import assert = require('assert');
import cp = require('child_process');
import fs = require('fs');
import path = require('path');

import './extensions';
import Server from './server';
import mergeImessage from './merge/imessage';
import mergePath from './merge/path';
import prune from './prune';
import { Post } from './struct';

const binname = 'days';

let config = {
    title: 'days',
    port: 3004,
    theme: 'fruchtig'
};

try {
    Object.assign(
        config,
        JSON.parse(fs.readFileSync('config.json').toString())
    );
} catch {}

if (process.argv.length < 3) {
    usage(true);
}

switch (process.argv[2]) {
    case '--help':
    case '-h':
        cmd_help();
        break;
    case '--version':
    case '-v':
        cmd_version();
        break;
    case 'new':
        cmd_new(process.argv.slice(3));
        break;
    case 'server':
        cmd_server(process.argv.slice(3));
        break;
    case 'merge':
        cmd_merge(process.argv.slice(3));
        break;
    case 'prune':
        cmd_prune();
        break;
    default:
        usage(true);
}

function cmd_help(): void {
    usage(false);
}

function cmd_version(): void {
    console.log(`${binname} ${require('../package.json').version}`);
}

function cmd_new(argv: string[]): void {
    let options: { noEdit: boolean; allday: boolean; date: string[] } = {
        noEdit: false,
        allday: false,
        date: []
    };

    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--no-edit') {
            options.noEdit = true;
            continue;
        }

        if (argv[i] === '--allday') {
            options.allday = true;
            continue;
        }

        if (/\d{4}/.test(argv[i])) {
            if (i + 2 >= argv.length) usage(true);
            while (i < argv.length) {
                options.date.push(argv[i++]);
            }
            continue;
        }
        usage(true);
    }

    if (options.date.length > 6) usage(true);

    let post: Post;
    if (options.date.length === 0) {
        if (options.allday) post = new Post(true);
        else post = new Post(false);
    } else if (options.date.length < 3) {
        usage(true);
        // Note: usage() always calls process.exit() so this return statement
        // is redundant, but fixes compiler error TS2454.
        return;
    } else {
        let [year, month, day, hour, min, sec] = options.date;
        if (hour === undefined) post = new Post(year, month, day);
        else {
            if (min === undefined) min = '00';
            if (sec === undefined) sec = '00';
            post = new Post(year, month, day, hour, min, sec);
        }
    }

    if (fs.existsSync(post.filename)) {
        console.error(
            `\x1b[31mError\x1b[0m: \x1b[36m${post.filename}\x1b[0m already exists`
        );
        process.exit(1);
    }

    fs.mkdirSync(path.dirname(post.filename), { recursive: true });
    fs.writeFileSync(post.filename, '');

    if (options.noEdit) {
        console.log(post.filename);
        return;
    }

    let editor = process.env.EDITOR;
    if (editor === undefined || editor === '') editor = 'vi';

    cp.spawn(editor, [post.filename], { stdio: 'inherit' }).on(
        'error',
        (err: NodeJS.ErrnoException): void => {
            assert(err.code === 'ENOENT');
            console.error(`\x1b[31mError\x1b[0m: Could not start editor`);
            process.exit(1);
        }
    );
}

function cmd_server(argv: string[]): void {
    let { title, port, theme } = config;

    for (let i = 0; i < argv.length; i++) {
        switch (argv[i]) {
            case '--port':
                if (++i >= argv.length) usage(true);
                port = Number(argv[i]);
                break;
            case '--theme':
                if (++i >= argv.length) usage(true);
                theme = argv[i];
                break;
        }
    }

    new Server(title, theme)
        .listen(port)
        .then(() => {
            console.log(`Server is listening on http://localhost:${port}`);
        })
        .catch((err: NodeJS.ErrnoException): void => {
            if (err.code === 'EADDRINUSE')
                console.error(
                    `\x1b[31mError\x1b[0m: Port ${port} is already in use`
                );
            else console.error(`\x1b[31mError\x1b[0m: ${err.code}`);
            process.exit(1);
        });
}

function cmd_merge(argv: string[]): void {
    let resolve = false,
        imessage = false,
        pathOrId = '';
    for (let a of argv) {
        switch (a) {
            case '--resolve':
                resolve = true;
                break;
            case '--imessage':
                imessage = true;
                break;
            default:
                pathOrId = a;
                break;
        }
    }
    if (pathOrId === '') usage(true);
    if (imessage) mergeImessage(pathOrId, resolve);
    else mergePath(pathOrId, resolve);
}

function cmd_prune(): void {
    prune('content');
}

function usage(error: boolean): void {
    let msg = `Usage:
  ${binname} new [--no-edit] [--allday] [<year> <month> <day> [<hour> [<minute> [<second>]]]]
  ${binname} server [--port <number>] [--theme <name>]
  ${binname} merge [--resolve] (<path> | --imessage <ID>)
  ${binname} prune`;

    if (error) {
        console.error(msg);
        process.exit(1);
    } else {
        console.log(msg);
        process.exit(0);
    }
}
