let assert = require('assert');
let fs = require('fs');

// Recursive directory content
function tree(dir) {
    let res = [];
    let list = fs.readdirSync(dir);
    for (let file of list) {
        // Ignore dotfiles
        if (file.startsWith('.'))
            continue;

        file = `${dir}/${file}`;

        let stat = fs.statSync(file);
        if (stat.isDirectory()) {
            // Recurse into a subdirectory
            res.push(...tree(file));
        } else {
            // Is a file
            res.push({ dir: dir, file: file });
        }
    }
    return res;
}

function merge(root) {
    root = root.replace(/\/+$/, '');
    if (fs.existsSync(`${root}/.fav`))
        console.error(`${__binname}: \x1b[33mNote\x1b[0m: ${root}/.fav not merged.`);

    for (let src of tree(root)) {
        let dst = {
            dir: src.dir.replace(root, '.'),
            file: src.file.replace(root, '.')
        };

        // Make the parent directory if it doesn't already exist
        fs.mkdirSync(dst.dir, { recursive: true });

        try {
            fs.copyFileSync(src.file, dst.file, fs.constants.COPYFILE_EXCL);
        } catch(err) {
            assert(err.code == 'EEXIST');
            console.error(`${__binname}: \x1b[31mName collision\x1b[0m: ${src.file} not merged.`);
        }
    }
}

module.exports = merge;
