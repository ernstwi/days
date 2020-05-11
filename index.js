#!/usr/bin/env node

global.__basedir = __dirname;
global.__binname = process.argv[1].match(/[^\/]*$/)[0];

let assert = require('assert');
let cp = require('child_process');
let fs = require('fs');
let dateFormat = require('dateformat');
let { Server } = require('./src/server.js');
let merge = require('./src/merge.js');

function usage(stdout) {
    let msg = `Usage:
  ${__binname} new [--no-edit] [<year> <month> <day> [<hour> [<minute> [<second>]]]]
  ${__binname} server [--port <number>]
  ${__binname} merge <path>`;

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
    case 'new':
        let args = {
            'noEdit': false,
            'date': []
        };
        for (let i = 3; i < process.argv.length; i++) {
            if (process.argv[i] == '--no-edit') {
                args['noEdit'] = true;
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
        let file = (args.date.length == 3) ?
            `${dir}/allday.md` :
            `${dir}/${dateFormat(date, 'UTC:HH-MM-ss".md"')}`;

        if (fs.existsSync(file)) {
            console.error(`${__binname}: \x1b[31mError\x1b[0m: ${file} already exists.`);
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
            console.error(`${__binname}: \x1b[31mError\x1b[0m: Could not start editor.`);
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
        if (process.argv.length < 4)
            usage(false);
        merge(process.argv[3]);
        return;
}
