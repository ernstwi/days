import assert = require('assert');
import fs = require('fs');
import path = require('path');

function countPosts(dir: string): any {
    let res: any = {};
    let files = 0;

    let dirContent = fs.readdirSync(dir);
    dirContent.filter(file => !file.startsWith('.')).forEach(file => {
        let next = path.join(dir, file);
        let stat = fs.statSync(next);
        if (stat.isDirectory()) {
            res[file] = countPosts(next);
        } else if (path.extname(file) === '.md') {
            files++;
        }
    });

    if (files > 0)
        return files;
    return res;
}

function day() {
    let data = countPosts('content');
    let max = 0;
    for (let [, monthData] of Object.entries(data)) {
        for (let [month, dayData] of Object.entries(monthData as any)) {
            for (let [day, n] of Object.entries(dayData as any)) {
                assert(typeof n === "number");
                if (n as number > max) max = n as number;
            }
        }
    }
    return [data, max];
}

function month() {
    let [data, ] = day();
    let res: any = {};
    let max = 0;
    for (let [year, monthData] of Object.entries(data)) {
        res[year] = {};
        for (let [month, dayData] of Object.entries(monthData as any)) {
            res[year][month] = 0;
            for (let [day, n] of Object.entries(dayData as any)) {
                res[year][month] += n;
            }
            if (res[year][month] > max) max = res[year][month];
        }
    }
    return [res, max];
}

function year() {
    let [data, ] = month();
    let res: any = {};
    let max = 0;
    for (let [year, monthData] of Object.entries(data)) {
        res[year] = 0;
        for (let [month, n] of Object.entries(monthData as any)) {
            res[year] += n;
        }
        if (res[year] > max) max = res[year];
    }
    return [res, max];
}

export { day, month, year };
