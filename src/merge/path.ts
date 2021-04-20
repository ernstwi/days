import assert = require('assert');
import fs = require('fs');
import path = require('path');

import * as merge from './merge';
import { NameCollision } from '../error';

function readdirRecursive(dir: string): string[] {
    let res = [];
    let list = fs.readdirSync(dir);
    for (let file of list) {
        // Ignore dotfiles
        if (file.startsWith('.')) continue;

        let next = path.join(dir, file);
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

function mergePath(root: string, resolve: boolean): void {
    root = root.replace(/\/+$/, '');
    if (fs.existsSync(path.join(root, '.fav')))
        console.error(`\x1b[33mNote\x1b[0m: \x1b[36m/.fav\x1b[0m not merged`);

    let substitutions = new Map<string, string>();

    readdirRecursive(path.join(root, 'assets')).forEach(src => {
        let dst = src.replace(`${root}/assets/`, '');
        let newDst = '';
        try {
            newDst = merge.mergeAsset(src, dst, resolve);
        } catch (err) {
            if (!(err instanceof NameCollision)) throw err;
            console.error(`Name collision: ${err.message}`);
        }
        if (newDst !== dst) substitutions.set(dst, newDst);
    });

    readdirRecursive(path.join(root, 'content')).forEach(src => {
        let text = fs.readFileSync(src, 'utf8');
        let dst = src.replace(`${root}/`, '');
        let stat = fs.statSync(src);
        try {
            merge.mergePost(
                text,
                dst,
                stat.birthtime,
                stat.mtime,
                substitutions
            );
        } catch (err) {
            if (!(err instanceof NameCollision)) throw err;
            console.error(`Name collision: ${err.message}`);
        }
    });
}

export default mergePath;
