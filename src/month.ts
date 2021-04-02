import fs = require('fs');

import CustomDate from './custom-date';

function posts(month: CustomDate): null | Map<string, CustomDate[]> {
    if (!fs.existsSync(month.monthDir()))
        return null;

    let res = new Map<string, CustomDate[]>();
    let day = new CustomDate(month);
    day.setDate(1);

    for (; day.getMonth() === month.getMonth(); day.setDate(day.getDate() + 1)) {
        if (!fs.existsSync(day.dayDir()))
            continue;

        fs.readdirSync(day.dayDir())
            .filter(f => /^\d{2}-\d{2}-\d{2}\.md$/.test(f))
            .forEach(f => {
                let [ , hour, minute, second] = 
                    f.match(/^(\d{2})-(\d{2})-(\d{2}).md$/) as RegExpMatchArray;
                let postDate = new CustomDate(day);
                postDate.allday = false;
                postDate.setHours(Number(hour), Number(minute), Number(second));

                let postDay = new CustomDate(day);
                if (postDate.getHours() < 5)
                    postDay.setDate(postDay.getDate() - 1);

                if (!res.has(postDay.dayMonthDateYearString()))
                    res.set(postDay.dayMonthDateYearString(), []);
                (res.get(postDay.dayMonthDateYearString()) as CustomDate[]).push(postDate);
            });

        {
            let allday = new CustomDate(day);
            allday.allday = true;
            if (fs.existsSync(allday.file())) {
                if (!res.has(allday.dayMonthDateYearString()))
                    res.set(allday.dayMonthDateYearString(), []);
                (res.get(allday.dayMonthDateYearString()) as CustomDate[]).push(allday);
            }
        }
    }
    return res;
}

export { posts };
