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

function merge(root, resolve) {
    root = root.replace(/\/+$/, '');
    if (fs.existsSync(`${root}/.fav`))
        console.error(`${__binname}: \x1b[33mNote\x1b[0m: \x1b[36m/.fav\x1b[0m not merged.`);

    let substitutions = new Object();
    for (let src of tree(`${root}/assets`)) {
        let dst = {
            dir: src.dir.replace(root, '.'),
            file: src.file.replace(root, '.')
        };

        // Make the parent directory if it doesn't already exist
        fs.mkdirSync(dst.dir, { recursive: true });

        {
            let suffix = -1;
            while (true) {
                try {
                    if (suffix == -1) {
                        fs.copyFileSync(src.file, dst.file, fs.constants.COPYFILE_EXCL);
                    } else {
                        dst.fileNew = dst.file.replace(/\.[^\.]*$/, `-${suffix}$&`);
                        substitutions[dst.file.replace(/^\.\/assets/, '')] = dst.fileNew.replace(/^\.\/assets/, '');
                        fs.copyFileSync(src.file, dst.fileNew, fs.constants.COPYFILE_EXCL);
                    }
                    break;
                } catch(err) {
                    assert(err.code == 'EEXIST');
                    if (!resolve) {
                        console.error(`${__binname}: \x1b[31mName collision\x1b[0m: \x1b[36m${src.file.replace(root, '')}\x1b[0m not merged.`);
                        break;
                    } else {
                        suffix++;
                    }
                }
            }
        }
    }

    for (let [key, value] of Object.entries(substitutions)) {
        console.error(`${__binname}: \x1b[35mName collision\x1b[0m: Renaming \x1b[36m/assets${key}\x1b[0m to \x1b[36m/assets${value}\x1b[0m.`);
    }

    for (let src of tree(`${root}/content`)) {
        src.text = fs.readFileSync(src.file).toString();

        let dst = {
            dir: src.dir.replace(root, '.'),
            file: src.file.replace(root, '.'),
            text: src.text
        };

        for (let [key, value] of Object.entries(substitutions)) {
            dst.text = dst.text.split(key).join(value);
        }

        fs.mkdirSync(dst.dir, { recursive: true });

        try {
            fs.writeFileSync(dst.file, dst.text, { flag: 'wx' });
        } catch(err) {
            assert(err.code == 'EEXIST');
            console.error(`${__binname}: \x1b[31mName collision\x1b[0m: \x1b[36m${src.file.replace(root, '')}\x1b[0m not merged.`);
        }
    }
}

module.exports = merge;
