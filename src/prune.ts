import assert = require('assert');
import fs = require('fs');

export default function prune(dir: string): boolean {
    let empty = true;
    fs.readdirSync(dir)
        .filter(file => file !== '.DS_Store')
        .forEach(file => {
            let path = [dir, file].join('/');
            if (fs.statSync(path).isFile()) empty = false;
            else empty = prune(path) && empty;
        });
    if (empty) {
        console.log(`Removing: ${dir}`);
        try {
            fs.unlinkSync(`${dir}/.DS_Store`);
        } catch (err) {
            assert(err.code === 'ENOENT');
        }
        fs.rmdirSync(dir);
    }
    return empty;
}
