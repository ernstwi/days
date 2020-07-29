let assert = require('assert');
let cp = require('child_process');
let fs = require('fs');
let os = require('os');
let path = require('path');
let merge = require('./merge');
let { NameCollision } = require('../error');
let parse = require('csv-parse/lib/sync');
let pug = require('pug');
let dateformat = require('dateformat');

let pugAsset = pug.compileFile(`${__dirname}/asset.pug`);

function assetStr(filename) {
    let extension = path.extname(filename).substring(1);
    return pugAsset({
        extension: extension,
        filename: filename
    });
}

function sqlite(id, file) {
    let sql = fs.readFileSync(path.join(__dirname, file), 'utf8').split('$ID').join(id);
    return parse(cp.execSync(`sqlite3 -csv ~/Library/Messages/chat.db`, { input: sql }));
}

function mergeImessage(id, resolve) {
    // Collect data from Messages database
    let data = {};
    sqlite(id, 'time.sql').forEach(row => {
        let [id, time] = row;
        data[id] = {};
        data[id].date = new Date(time*1000);
    });
    sqlite(id, 'text.sql').forEach(row => {
        let [id, text] = row;
        data[id].text = text.replace(/￼/g, '');
            // Remove U+FFFC (object replacement character)
    });
    sqlite(id, 'asset.sql').forEach(row => {
        let [id, asset] = row;
        asset = asset.replace(/^~/, os.homedir());
        if (data[id].assets == undefined)
            data[id].assets = [];
        data[id].assets.push({
            src: asset,
            dst: path.basename(asset)
        });
    });

    // Add assets to head of post text
    Object.values(data).forEach(post => {
        if (post.assets != undefined) {
            post.text = post.assets.map(a => assetStr(a[1])).join('\n')
                + (post.text == '' ? '' : '\n\n' + post.text);
        }
    });

    // Merge assets
    let substitutions = {};
    Object.values(data).filter(p => p.assets != undefined).forEach(post => {
        post.assets.forEach(asset => {
            let newDst;
            try {
                newDst = merge.mergeAsset(asset.src, asset.dst, resolve);
            } catch (err) {
                if (!(err instanceof NameCollision))
                    throw err;
                console.error(`Name collision: ${err.message}`);
            }
            if (newDst != dst)
                substitutions[dst] = newDst;
        });
    });

    // Merge posts
    Object.values(data).forEach(post => {
        // Special case for entries consisting of ' ' with no assets.
        if (post.text == ' ' && post.assets == undefined)
            return;

        post.dst = dateformat(post.date, 'yyyy/mm/dd/HH-MM-ss".md"');
        try {
            merge.mergePost(post.text, post.dst, post.date, post.date, substitutions);
        } catch (err) {
            if (!(err instanceof NameCollision))
                throw err;
            console.error(`Name collision: ${err.message}`);
        }
    });
}

module.exports = mergeImessage;
