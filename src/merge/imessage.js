let assert = require('assert');
let cp = require('child_process');
let fs = require('fs');
let os = require('os');
let path = require('path');
let merge = require('./merge');
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
        data[id].assets.push([asset, path.basename(asset)]);
    });

    let posts = [];
    for (let [, value] of Object.entries(data)) {

        // Special case for entries consisting of ' ' with no assets.
        if (value.text == ' ' && value.assets == undefined)
            continue;

        if (value.assets != undefined) {
            value.text = value.assets.map(a => assetStr(a[1])).join('\n')
                + (value.text == '' ? '' : '\n\n' + value.text);
        }
        posts.push([value.text, dateformat(value.date, 'yyyy/mm/dd/HH-MM-ss".md"'), value.date, value.date]);
    }

    let assets = Object.values(data).filter(v => v.assets != undefined).flatMap(v => v.assets);

    merge(posts, assets, resolve);
}

module.exports = mergeImessage;
