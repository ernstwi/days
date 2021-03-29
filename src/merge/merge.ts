import assert = require('assert');
import fs = require('fs');
import path = require('path');

import { NameCollision } from '../error';

/**
 * @param {string} src Source path (full).
 * @param {string} dst Destination path (relative to 'assets').
 * @param {boolean} resolve Resolve name collisions.
 * @returns {string} New {@param dst}, possibly updated to avoid name collision.
 * @throws {NameCollision} If {@param resolve} is false and {@param dst} exists.
 */
function mergeAsset(src, dst, resolve) {
    // Make the parent directory if it doesn't already exist
    fs.mkdirSync(path.dirname(path.join('assets', dst)), { recursive: true });

    {
        let suffix = -1;
        while (true) {
            try {
                if (suffix == -1) {
                    fs.copyFileSync(src, path.join('assets', dst), fs.constants.COPYFILE_EXCL);
                    return dst;
                } else {
                    let components = path.parse(dst);
                    delete components.base;
                    components.name += `-${suffix}`;
                    let newDst = path.format(components);

                    fs.copyFileSync(src, path.join('assets', newDst), fs.constants.COPYFILE_EXCL);
                    return newDst;
                }
            } catch(err) {
                assert(err.code == 'EEXIST');
                if (!resolve) {
                    throw new NameCollision(`\x1b[36m${dst}\x1b[0m not merged`);
                } else {
                    suffix++;
                }
            }
        }
    }
}

/**
 * @param {string} text Post body.
 * @param {string} dst Destination path (relative to root).
 * @param {Date} birthtime Creation date.
 * @param {Date} mtime Modification date.
 * @param {Object.<string, string>} substitutions Dictionary of asset name
 * substitutions (due to name collisions).
 * @throws {NameCollision} If {@param dst} exists.
 */
function mergePost(text, dst, birthtime, mtime, substitutions) {
    for (let [key, value] of Object.entries(substitutions)) {
        text = text.split(key).join(value);
    }

    fs.mkdirSync(path.dirname(dst), { recursive: true });

    try {
        fs.writeFileSync(dst, text, { flag: 'wx' });
        fs.utimesSync(dst, new Date(), birthtime);
        fs.utimesSync(dst, new Date(), mtime);
    } catch(err) {
        assert(err.code == 'EEXIST');
        throw new NameCollision(`\x1b[36m${dst}\x1b[0m not merged`);
    }
}

export { mergeAsset, mergePost };
