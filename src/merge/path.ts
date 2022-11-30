import fs = require('fs');
import path = require('path');

import { Post, Asset } from '../struct';
import { readPosts } from '../read';

function readPath(root: string): [Post[], Asset[]] {
    let posts = [...readPosts(root).values()];
    let assets = readAssets(root).map(f => new Asset(f, path.join(root, f)));
    return [posts, assets];
}

function readAssets(root: string) {
    return readdirRecursive(path.join(root, 'assets'));
}

function readdirRecursive(root: string): string[] {
    let res = [];
    let list = fs.readdirSync(root);
    for (let file of list) {
        // Ignore dotfiles
        if (file.startsWith('.')) continue;

        let next = path.join(root, file);
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
