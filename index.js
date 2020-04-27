#!/usr/bin/env node

global.__basedir = __dirname;
global.__binname = process.argv[1].match(/[^\/]*$/)[0];

let cp = require('child_process');
let fs = require('fs');
let dateFormat = require('dateformat');
let { Server } = require('./src/server.js');

function error(stream) {
    stream.write(`Usage:
  ${__binname} new [--no-edit] [<year> <month> <day> [<hour> [<minute> [<second>]]]]
  ${__binname} server [--port <number>]`);
    process.exit(stream == process.stderr ? 1 : 0);
}

if (process.argv.length < 3 || process.argv[2] == '--help') {
    let stream = process.argv.length < 3 ?  process.stderr : process.stdout;
    error(stream);
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
                    error(process.stderr);
                while (i < process.argv.length) {
                    args.date.push(process.argv[i++]);
                }
                continue;
            }
            error(process.stderr);
        }
        if (args.date.length > 6)
            error(process.stderr);
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
            process.stderr.write(`${__binname}: \x1b[31mError\x1b[0m: ${file} already exists.`);
            process.exit(1);
        }

        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, '');

        if (args.noEdit)
            console.log(file);
        else
            cp.spawn(process.env.EDITOR, [file], { stdio: 'inherit' });
        return;
    case 'server':
        let port = 3004;
        if (process.argv.length == 5 && process.argv[3] == '--port')
            port = process.argv[4];
        new Server().run(port);
        return;
}
