#!/usr/bin/env node

let assert = require('assert');
let cp = require('child_process');
let fs = require('fs');

let CustomDate = require('./src/custom-date');
let Server = require('./src/server');
let mergeImessage = require('./src/merge/imessage');
let mergePath = require('./src/merge/path');
let prune = require('./src/prune');

global.__basedir = __dirname;
global.__binname = process.argv[1].match(/[^\/]*$/)[0];
global.__favoritesFile = '.fav';
global.__title = 'days';

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

if (process.argv.length < 3) {
    usage(false);
}

if (/(--)?help/.test(process.argv[2])) {
    usage(true);
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

        let date;
        if (args.date.length == 0) {
            date = new CustomDate();
        } else {
            date = new CustomDate(...args.date);
        }

        if (fs.existsSync(date.file())) {
            console.error(`\x1b[31mError\x1b[0m: \x1b[36m${date.file()}\x1b[0m already exists`);
            process.exit(1);
        }

        fs.mkdirSync(date.dayDir(), { recursive: true });
        fs.writeFileSync(date.file(), '');

        if (args.noEdit) {
            console.log(date.file());
            return;
        }

        let editor = process.env.EDITOR;
        if (editor == undefined || editor == '')
            editor = 'vi';

        cp.spawn(editor, [date.file()], { stdio: 'inherit' }).on('error', err => {
            assert(err.code == 'ENOENT');
            console.error(`\x1b[31mError\x1b[0m: Could not start editor`);
            process.exit(1);
        });

        return;
    case 'server':
        let port = 3004;
        if (process.argv.length == 5 && process.argv[3] == '--port')
            port = process.argv[4];
        new Server().run(port).then(() => {
                console.log(`Server is listening on http://localhost:${port}`)
            }).catch(err => {
                console.error(`\x1b[31mError\x1b[0m: Port ${port} is already in use`);
                process.exit(1);
            });
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
    default:
        usage(false);
}
