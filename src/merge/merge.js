let assert = require('assert');
let fs = require('fs');
let path = require('path');

function mergeAssets(assets, resolve) {
    let substitutions = new Object();
    for (let [src, dst] of assets) {
        dst = path.join('assets', dst);

        // Make the parent directory if it doesn't already exist
        fs.mkdirSync(path.dirname(dst), { recursive: true });

        {
            let suffix = -1;
            while (true) {
                try {
                    if (suffix == -1) {
                        fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL);
                    } else {
                        let components = path.parse(dst);
                        delete components.base;
                        components.name += `-${suffix}`;
                        let newDst = path.format(components);

                        let dstUrl = dst.replace('assets', '')
                        let newDstUrl = newDst.replace('assets', '');

                        substitutions[dstUrl] = newDstUrl;

                        fs.copyFileSync(src, newDst, fs.constants.COPYFILE_EXCL);
                        console.error(`${__binname}: \x1b[35mName collision\x1b[0m: Renaming \x1b[36m/assets${dstUrl}\x1b[0m to \x1b[36m/assets${newDstUrl}\x1b[0m.`);
                    }
                    break;
                } catch(err) {
                    assert(err.code == 'EEXIST');
                    if (!resolve) {
                        console.error(`${__binname}: \x1b[31mName collision\x1b[0m: \x1b[36m${src}\x1b[0m not merged.`);
                        break;
                    } else {
                        suffix++;
                    }
                }
            }
        }
    }
    return substitutions;
}

function mergePosts(posts, substitutions) {
    for (let [txt, dst] of posts) {
        dst = path.join('content', dst);

        for (let [key, value] of Object.entries(substitutions)) {
            txt = txt.split(key).join(value);
        }

        fs.mkdirSync(path.dirname(dst), { recursive: true });

        try {
            fs.writeFileSync(dst, txt, { flag: 'wx' });
        } catch(err) {
            assert(err.code == 'EEXIST');
            console.error(`${__binname}: \x1b[31mName collision\x1b[0m: \x1b[36m${dst}\x1b[0m not merged.`);
        }
    }
}

// posts: [ txt, dst ]
// assets: [ src, dst ]
// resolve: bool
function merge(posts, assets, resolve) {
    mergePosts(posts, mergeAssets(assets, resolve));
}

module.exports = merge;
