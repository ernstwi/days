import cp = require('child_process');
import fs = require('fs');
import os = require('os');
import path = require('path');

import parse = require('csv-parse/lib/sync');

import { Post, Asset } from '../struct';

type csv = string[][];

function readImessage(id: string): [Post[], Asset[]] {
    // Collect data from Messages database
    let posts: Map<string, Post> = new Map();
    let assets: Map<string, Asset[]> = new Map();

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

    sqlite(id, 'asset.sql').forEach(([id, file]) => {
        file = file.replace(/^~/, os.homedir()); // Absoulte path of asset
        if (!assets.has(id)) assets.set(id, []);
        (assets.get(id) as Asset[]).push(new Asset(path.basename(file), file));
    });

    // Add assets to head of post text
    for (let [id, post] of posts) {
        if (!assets.has(id)) continue;

        let assetsHeader =
            (assets.get(id) as Asset[])
                .map((a: Asset) => a.htmlTag)
                .join('\n') + '\n';
        if (post.body === '') post.body = assetsHeader;
        else post.body = [assetsHeader, post.body].join('\n');
    }

    return [[...posts.values()], [...assets.values()].flatMap(x => x)];
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

export default readImessage;
