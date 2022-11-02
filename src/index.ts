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

function usage(error: boolean) {
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
        cmd_new();
        break;
    case 'server':
        cmd_server();
        break;
    case 'merge':
        cmd_merge();
        break;
    case 'prune':
        prune('content');
        break;
    default:
        usage(true);
}

function cmd_help() {
    usage(false);
}

function cmd_version() {
    console.log(`${binname} ${require('../package.json').version}`);
}

function cmd_new() {
    let args: { noEdit: boolean; allday: boolean; date: string[] } = {
        noEdit: false,
        allday: false,
        date: []
    };

    for (let i = 3; i < process.argv.length; i++) {
        if (process.argv[i] === '--no-edit') {
            args.noEdit = true;
            continue;
        }

        if (process.argv[i] === '--allday') {
            args.allday = true;
            continue;
        }

        if (/\d{4}/.test(process.argv[i])) {
            if (i + 2 >= process.argv.length) usage(true);
            while (i < process.argv.length) {
                args.date.push(process.argv[i++]);
            }
            continue;
        }
        usage(true);
    }

    if (args.date.length > 6) usage(true);

    let post: Post;
    if (args.date.length === 0) {
        if (args.allday) post = new Post(true);
        else post = new Post(false);
    } else if (args.date.length < 3) {
        usage(true);
        // Note: usage() always calls process.exit() so this return statement
        // is redundant, but fixes compiler error TS2454.
        return;
    } else {
        let [year, month, day, hour, min, sec] = args.date;
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

    if (args.noEdit) {
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

function cmd_server() {
    let { title, port, theme } = config;

    for (let i = 3; i < process.argv.length; i++) {
        switch (process.argv[i]) {
            case '--port':
                if (++i >= process.argv.length) usage(true);
                port = Number(process.argv[i]);
                break;
            case '--theme':
                if (++i >= process.argv.length) usage(true);
                theme = process.argv[i];
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

function cmd_merge() {
    let resolve = false,
        imessage = false,
        pathOrId = '';
    for (let i = 3; i < process.argv.length; i++) {
        switch (process.argv[i]) {
            case '--resolve':
                resolve = true;
                break;
            case '--imessage':
                imessage = true;
                break;
            default:
                pathOrId = process.argv[i];
                break;
        }
    }
    if (pathOrId === '') usage(true);
    if (imessage) mergeImessage(pathOrId, resolve);
    else mergePath(pathOrId, resolve);
}
