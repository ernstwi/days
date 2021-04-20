import assert = require('assert');
import cp = require('child_process');
import fs = require('fs');
import os = require('os');
import path = require('path');

import parse = require('csv-parse/lib/sync');
import pug = require('pug');

import * as merge from './merge';
import CustomDate from '../custom-date';
import { NameCollision } from '../error';

let pugAsset = pug.compileFile(`${__dirname}/asset.pug`);

function assetStr(filename: string) {
    let extension = path.extname(filename).substring(1);
    return pugAsset({
        extension: extension,
        filename: filename
    });
}

type csv = string[][];
interface asset {
    src: string;
    dst: string;
}

function sqlite(id: string, file: string): csv {
    let sql = fs
        .readFileSync(path.join(__dirname, file), 'utf8')
        .split('$ID')
        .join(id);
    return parse(
        cp.execSync(`sqlite3 -csv ~/Library/Messages/chat.db`, { input: sql })
    );
}

function mergeImessage(id: string, resolve: boolean) {
    // Collect data from Messages database
    let data: any = {};
    sqlite(id, 'time.sql').forEach(row => {
        let [id, time] = row;
        data[id] = {};
        data[id].date = new CustomDate(Number(time) * 1000);
    });
    sqlite(id, 'text.sql').forEach(row => {
        let [id, text] = row;
        // Remove U+FFFC (object replacement character)
        data[id].text = text.replace(/￼/g, '');
        data[id].text += '\n';
    });
    sqlite(id, 'asset.sql').forEach(row => {
        let [id, asset] = row;
        asset = asset.replace(/^~/, os.homedir());
        if (data[id].assets === undefined) data[id].assets = new Array<asset>();
        data[id].assets.push({
            src: asset,
            dst: path.basename(asset)
        });
    });

    // Add assets to head of post text
    Object.values(data).forEach((post: any) => {
        if (post.assets !== undefined) {
            post.text =
                post.assets.map((a: asset) => assetStr(a.dst)).join('\n') +
                (post.text === '' ? '' : '\n\n' + post.text);
        }
    });

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

export default mergeImessage;
