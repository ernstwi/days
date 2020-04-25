#!/usr/bin/env node

global.__basedir = __dirname;
global.__binname = process.argv[1].match(/[^\/]*$/)[0];

let fs = require('fs');
let dateFormat = require('dateformat');
let { Server } = require('./src/server.js');

function error(stream) {
    stream.write(`Usage:
  ${__binname} new [<year> <month> <day> [<hour> [<minute> [<second>]]]]
  ${__binname} server [--port <number>]`);
    process.exit(stream == process.stderr ? 1 : 0);
}

if (process.argv.length < 3 || process.argv[2] == '--help') {
    let stream = process.argv.length < 3 ?  process.stderr : process.stdout;
    error(stream);
}

switch (process.argv[2]) {
    case 'new':
        let argn = process.argv.length;

        if (!(argn == 3 || argn >= 6)) {
            error(process.stderr);
        }

        let date = new Date();

        if (argn >= 6) {
                process.argv[4]--; // Month number
            date = new Date(Date.UTC(...process.argv.splice(3)));
        }

        let dir = `content/${dateFormat(date, 'UTC:yyyy/mm/dd')}`;

        let file = (argn == 3 || argn > 6) ?
            `${dir}/${dateFormat(date, 'UTC:HH-MM-ss".md"')}` :
            `${dir}/allday.md`;

        if (fs.existsSync(file)) {
            process.stderr.write(`${__binname}: \x1b[31mError\x1b[0m: ${file} already exists.`);
            process.exit(1);
        }

        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, '');

        console.log(file);
        return;
    case 'server':
        let port = 3004;
        if (process.argv.length == 5 && process.argv[3] == '--port')
            port = process.argv[4];
        new Server().run(port);
        return;
}
