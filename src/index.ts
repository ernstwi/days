#!/usr/bin/env node

import assert = require('assert');
import cp = require('child_process');
import fs = require('fs');
import path = require('path');

import CustomDate from './custom-date';
import Server from './server';
import mergeImessage from './merge/imessage';
import mergePath from './merge/path';
import prune from './prune';

const binname = 'days';

declare global {
    interface Number {
        zeropad: (width: number) => string;
    }

    interface Array<T> {
        last: () => T;
    }

    interface String {
        lines: () => string[]
    }
}

Number.prototype.zeropad = function(width) {
    let res = this.toString();
    return res.length >= width ? res :
        new Array(width - res.length + 1).join('0') + res;
}

Array.prototype.last = function() {
    return this[this.length - 1];
}

String.prototype.lines = function() {
    let res = this.split('\n');

    // Trailing newline
    if (res[res.length-1] == '') {
        res.splice(-1, 1);
    }

    return res;
}

let config = {
    title: 'days',
    port: 3004,
    theme: 'fruchtig'
};

try {
    Object.assign(config, JSON.parse(fs.readFileSync('config.json').toString()));
} catch(err) {}

function usage(stdout: boolean) {
    let msg = `Usage:
  ${binname} new [--no-edit] [--allday] [<year> <month> <day> [<hour> [<minute> [<second>]]]]
  ${binname} server [--port <number>] [--theme <name>]
  ${binname} merge [--resolve] (<path> | --imessage <ID>)
  ${binname} prune`;

    if (stdout) {
        console.log(msg);
        process.exit(0);
    } else {
        console.error(msg);
        process.exit(1);
    }
}

if (process.argv.length < 3) {
    usage(false);
}

if (/(--)?help/.test(process.argv[2])) {
    usage(true);
}

switch (process.argv[2]) {
    case '--version':
        console.log(`${binname} ${require('../package.json').version}`);
        break;
    case 'new':
        let args: {noEdit: boolean; allday: boolean; date: string[]} = {
            noEdit: false,
            allday: false,
            date: []
        };
        for (let i = 3; i < process.argv.length; i++) {
            if (process.argv[i] == '--no-edit') {
                args.noEdit = true;
                continue;
            }

            if (process.argv[i] == '--allday') {
                args.allday = true;
                continue;
            }

            if (/\d{4}/.test(process.argv[i])) {
                if (i+2 >= process.argv.length)
                    usage(false);
                while (i < process.argv.length) {
                    args.date.push(process.argv[i++]);
                }
                continue;
            }
            usage(false);
        }
        if (args.date.length > 6)
            usage(false);

        let date;
        if (args.date.length == 0) {
            date = new CustomDate();
        } else {
            date = new CustomDate(...args.date);
        }
        if (args.allday)
            date.allday = true;

        if (fs.existsSync(date.file())) {
            console.error(`\x1b[31mError\x1b[0m: \x1b[36m${date.file()}\x1b[0m already exists`);
            process.exit(1);
        }

        fs.mkdirSync(date.dayDir(), { recursive: true });
        fs.writeFileSync(date.file(), '');

        if (args.noEdit) {
            console.log(date.file());
            break;
        }

        let editor = process.env.EDITOR;
        if (editor == undefined || editor == '')
            editor = 'vi';

        cp.spawn(editor, [date.file()], { stdio: 'inherit' }).on('error',
            (err: NodeJS.ErrnoException): void => {
                assert(err.code == 'ENOENT');
                console.error(`\x1b[31mError\x1b[0m: Could not start editor`);
                process.exit(1);
            });
        break;
    case 'server':
        let { title, port, theme } = config;

        for (let i = 3; i < process.argv.length; i++) {
            switch(process.argv[i]) {
                case '--port':
                    if (++i >= process.argv.length)
                        usage(false);
                    port = Number(process.argv[i]);
                    break;
                case '--theme':
                    if (++i >= process.argv.length)
                        usage(false);
                    theme = process.argv[i];
                    break;
            }
        }

        new Server(title, port, theme).run().then(() => {
                console.log(`Server is listening on http://localhost:${port}`)
            }).catch((err: NodeJS.ErrnoException): void => {
                console.error(`\x1b[31mError\x1b[0m: Port ${port} is already in use`);
                process.exit(1);
            });
        break;
    case 'merge':
        let resolve = false, imessage = false, pathOrId = "";
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
        if (pathOrId === "")
            usage(false);
        if (imessage)
            mergeImessage(pathOrId, resolve);
        else
            mergePath(pathOrId, resolve);
        break;
    case 'prune':
        prune('content');
        break;
    default:
        usage(false);
}
