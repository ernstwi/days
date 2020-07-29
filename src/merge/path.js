let assert = require('assert');
let fs = require('fs');
let path = require('path');
let merge = require('./merge');
let { NameCollision } = require('../error');

function readdirRecursive(dir) {
    let res = [];
    let list = fs.readdirSync(dir);
    for (let file of list) {
        // Ignore dotfiles
        if (file.startsWith('.'))
            continue;

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

function mergePath(root, resolve) {
    root = root.replace(/\/+$/, '');
    if (fs.existsSync(path.join(root, '.fav')))
        console.error(`\x1b[33mNote\x1b[0m: \x1b[36m/.fav\x1b[0m not merged`);

    let substitutions = {};

    readdirRecursive(path.join(root, 'assets')).forEach(src => {
        let dst = src.replace(`${root}/assets/`, '');
        let newDst;
        try {
            newDst = merge.mergeAsset(src, dst, resolve);
        } catch (err) {
            if (!(err instanceof NameCollision))
                throw err;
            console.error(`Name collision: ${err.message}`);
        }
        if (newDst != dst)
            substitutions[dst] = newDst;
    });

    readdirRecursive(path.join(root, 'content')).forEach(src => {
        let text = fs.readFileSync(src, 'utf8');
        let dst = src.replace(`${root}/content/`, '');
        let stat = fs.statSync(src);
        try {
            merge.mergePost(text, dst, stat.birthtime, stat.mtime, substitutions);
        } catch (err) {
            if (!(err instanceof NameCollision))
                throw err;
            console.error(`Name collision: ${err.message}`);
        }
    });
}

module.exports = mergePath;
