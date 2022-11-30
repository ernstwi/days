import cp = require('child_process');
import fs = require('fs');
import os = require('os');
import path = require('path');

import parse = require('csv-parse/lib/sync');
import pug = require('pug');

import * as merge from './merge';
import CustomDate from '../custom-date';
import { NameCollision } from '../error';
import { Post } from '../struct';

let pugAsset = pug.compileFile(`${__dirname}/asset.pug`);

type csv = string[][];

function mergeImessage(id: string, resolve: boolean) {
    // Collect data from Messages database
    let posts: Map<string, Post> = new Map();
    let assets: Map<string, string[]> = new Map();

    let data: any = {};

    sqlite(id, 'time.sql').forEach(([id, time]) => {
        posts.set(id, new Post(false, new Date(Number(time) * 1000)));
    });

    sqlite(id, 'text.sql').forEach(([id, text]) => {
        // HACK: Remove U+FFFC (object replacement character) which is sometimes
        // mysteriously present
        text = text.replace(/￼/g, '');

        text += '\n';

        (posts.get(id) as Post).body = text; // Works because map stores Post by reference
    });

    sqlite(id, 'asset.sql').forEach(([id, asset]) => {
        asset = asset.replace(/^~/, os.homedir()); // Absoulte path of asset
        if (!assets.has(id)) assets.set(id, []);
        (assets.get(id) as string[]).push(asset);
    });

    // Add assets to head of post text
    for (let [id, post] of posts) {
        if (!assets.has(id)) continue;

        let assetsHeader =
            (assets.get(id) as string[])
                .map((a: string) => assetStr(path.basename(a)))
                .join('\n') + '\n';
        if (post.body === '') post.body = assetsHeader;
        else post.body = [assetsHeader, post.body].join('\n');
    }

    // Check for post collisions
    let postCollisions = posts.values().filter(p => p.fileExists());

    // ---- Progress bar -------------------------------------------------------

    // Merge assets
    let substitutions = new Map<string, string>();
    Object.values(data)
        .filter((post: any) => post.assets !== undefined)
        .forEach((post: any) => {
            post.assets.forEach((asset: asset) => {
                let newDst = '';
                try {
                    newDst = merge.mergeAsset(asset.src, asset.dst, resolve);
                } catch (err) {
                    if (!(err instanceof NameCollision)) throw err;
                    console.error(`Name collision: ${err.message}`);
                }
                if (newDst !== asset.dst) substitutions.set(asset.dst, newDst);
            });
        });

    // Merge posts
    Object.values(data).forEach((post: any) => {
        // Special case for entries consisting of ' ' with no assets.
        if (post.text === ' ' && post.assets === undefined) return;

        post.dst = post.date.file();
        try {
            merge.mergePost(
                post.text,
                post.dst,
                post.date,
                post.date,
                substitutions
            );
        } catch (err) {
            if (!(err instanceof NameCollision)) throw err;
            console.error(`Name collision: ${err.message}`);
        }
    });
}

// Run sqlite template `file` with `$ID` = `id`.
function sqlite(id: string, file: string): csv {
    let sql = fs
        .readFileSync(path.join(__dirname, file), 'utf8')
        .split('$ID')
        .join(id);
    return parse(
        cp.execSync(`sqlite3 -csv ~/Library/Messages/chat.db`, { input: sql })
    );
}

// Return an html tag for displaying file `filename`.
function assetStr(filename: string) {
    let extension = path.extname(filename).substring(1).toLowerCase();
    return pugAsset({
        extension: extension,
        filename: filename
    });
}

export default mergeImessage;
