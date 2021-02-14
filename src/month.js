let fs = require('fs');

let CustomDate = require('./custom-date');

function posts(month) {
    if (!fs.existsSync(month.monthDir()))
        return null;

    let res = {};
    let day = new CustomDate(month);
    day.setDate(1);

    for (; day.getMonth() == month.getMonth(); day.setDate(day.getDate() + 1)) {
        if (!fs.existsSync(day.dayDir()))
            continue;

        fs.readdirSync(day.dayDir())
            .filter(f => /^\d{2}-\d{2}-\d{2}\.md$/.test(f))
            .forEach(f => {
                let [ , hour, minute, second] = f.match(/^(\d{2})-(\d{2})-(\d{2}).md$/);
                let postDate = new CustomDate(day);
                postDate.setHours(hour, minute, second);

                let postDay = new CustomDate(day);
                if (postDate.getHours() < 5)
                    postDay.setDate(postDay.getDate() - 1);

                if (!res.hasOwnProperty(postDay.dayMonthDateYearString()))
                    res[postDay.dayMonthDateYearString()] = [];
                res[postDay.dayMonthDateYearString()].push(postDate);
            });
        if (fs.existsSync(day.file())) {
            let postDate = new CustomDate(day);
            postDate.allday = true;

            if (!res.hasOwnProperty(postDate.dayMonthDateYearString()))
                res[postDate.dayMonthDateYearString()] = [];
            res[postDate.dayMonthDateYearString()].push(postDate);
        }
    }
    return res;
}

module.exports = {
    posts: posts
}