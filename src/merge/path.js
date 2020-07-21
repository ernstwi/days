let fs = require('fs');
let path = require('path');
let merge = require('./merge');

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
        console.error(`${__binname}: \x1b[33mNote\x1b[0m: \x1b[36m/.fav\x1b[0m not merged.`);

    let assets = readdirRecursive(path.join(root, 'assets')).map(f => [f, f.replace(`${root}/assets/`, '')]);
    let posts = readdirRecursive(path.join(root, 'content')).map(f => [fs.readFileSync(f).toString(), f.replace(`${root}/content/`, '')]);
    merge(posts, assets, resolve);
}

module.exports = mergePath;
