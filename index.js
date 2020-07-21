#!/usr/bin/env node

global.__basedir = __dirname;
global.__binname = process.argv[1].match(/[^\/]*$/)[0];
global.__favoritesFile = '.fav';
global.__title = 'days';

let assert = require('assert');
let cp = require('child_process');
let fs = require('fs');
let dateFormat = require('dateformat');
let { Server } = require('./src/server.js');
let mergePath = require('./src/merge/path.js');
let mergeImessage = require('./src/merge/imessage.js');
let prune = require('./src/prune.js');

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

if (!String.prototype.lines) {
    String.prototype.lines = function() {
        let res = this.split('\n');

        // Trailing newline
        if (res[res.length-1] == '') {
            res.splice(-1, 1);
        }

        return res;
    }
}

function usage(stdout) {
    let msg = `Usage:
  ${__binname} new [--no-edit] [--allday] [<year> <month> <day> [<hour> [<minute> [<second>]]]]
  ${__binname} server [--port <number>]
  ${__binname} merge [--resolve] (<path> | --imessage <ID>)
  ${__binname} prune`;

    if (stdout) {
        console.log(msg);
        process.exit(0);
    } else {
        console.error(msg);
        process.exit(1);
    }
}

if (process.argv.length < 3 || process.argv[2] == '--help') {
    usage(process.argv[2] == '--help');
}

switch (process.argv[2]) {
    case '--version':
        console.log(`${__binname} ${require('./package.json').version}`);
        return;
    case 'new':
        let args = {
            'noEdit': false,
            'allday': false,
            'date': []
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
        if (args.date.length >= 2)
            args.date[1]--; // Month

        let date;
        if (args.date.length == 0) {
            date = new Date();
            date.setUTCHours(date.getHours());
        } else {
            date = new Date(Date.UTC(...args.date));
        }

        let dir = `content/${dateFormat(date, 'UTC:yyyy/mm/dd')}`;

        let file = (args.allday || args.date.length == 3) ?
            `${dir}/allday.md` :
            `${dir}/${dateFormat(date, 'UTC:HH-MM-ss".md"')}`;

        if (fs.existsSync(file)) {
            console.error(`\x1b[31mError\x1b[0m: \x1b[36m${file}\x1b[0m already exists`);
            process.exit(1);
        }

        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, '');

        if (args.noEdit) {
            console.log(file);
            return;
        }

        let editor = process.env.EDITOR;
        if (editor == undefined || editor == '')
            editor = 'vi';

        cp.spawn(editor, [file], { stdio: 'inherit' }).on('error', err => {
            assert(err.code == 'ENOENT');
            console.error(`\x1b[31mError\x1b[0m: Could not start editor`);
            process.exit(1);
        });

        return;
    case 'server':
        let port = 3004;
        if (process.argv.length == 5 && process.argv[3] == '--port')
            port = process.argv[4];
        new Server().run(port);
        return;
    case 'merge':
        let resolve = false, imessage = false, pathOrId;
        for (i = 3; i < process.argv.length; i++) {
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
        if (pathOrId == undefined)
            usage(false);
        if (imessage)
            mergeImessage(pathOrId, resolve);
        else
            mergePath(pathOrId, resolve);
        return;
    case 'prune':
        prune('content');
        return;
}
