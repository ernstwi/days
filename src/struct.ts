// This file contains classes for representing a post and its containers.
// Years hold months, month hold days, and days hold posts.
//
// Year, Month, Day, and Post each have a Date as a helper class. Posts
// additionally have a Time, unless they are allday posts.
//
// This approach replaces the CustomDate class, which extended JS Date class
// to work as a pointer to a post file.

import path = require('path');
import fs = require('fs');

import markdownIt = require('markdown-it');

import { markdownOptions } from './constants';

const markdown = markdownIt(markdownOptions);

class Year {
    private date: Date;
    months: Month[];

    constructor(year: string) {
        this.date = new Date(year);
        this.months = [
            new Month(year, '01'),
            new Month(year, '02'),
            new Month(year, '03'),
            new Month(year, '04'),
            new Month(year, '05'),
            new Month(year, '06'),
            new Month(year, '07'),
            new Month(year, '08'),
            new Month(year, '09'),
            new Month(year, '10'),
            new Month(year, '11'),
            new Month(year, '12')
        ];
    }

    get id(): string {
        return this.date.year;
    }
    get year(): string {
        return this.date.year;
    }
}

class Month {
    private date: Date;
    days: Day[];

    constructor(year: string, month: string) {
        this.date = new Date(year, month);
        this.days = [];
    }

    get id(): string {
        return [this.date.year, this.date.month].join('-');
    }
    get url(): string {
        return '/' + [this.date.year, this.date.month].join('/');
    }
    get year(): string {
        return this.date.year;
    }
    get month(): string {
        return this.date.month;
    }
    get shortName(): string {
        return this.date.shortMonthName;
    }
    get longName(): string {
        return this.date.longMonthName;
    }
}

class Day {
    private date: Date;
    timedPosts: Post[];
    alldayPost?: Post;

    constructor(year: string, month: string, day: string) {
        this.date = new Date(year, month, day);
        this.timedPosts = [];
    }

    get id(): string {
        return [this.date.year, this.date.month, this.date.day].join('-');
    }
    get year(): string {
        return this.date.year;
    }
    get month(): string {
        return this.date.month;
    }
    get day(): string {
        return this.date.day;
    }
    get shortName(): string {
        return this.date.shortDayName;
    }
    get longName(): string {
        return this.date.longDayName;
    }
    get shortDate(): string {
        return this.date.shortDate;
    }
    get longDate(): string {
        return this.date.longDate;
    }
}

class Post {
    date: Date;
    displayDate: Date;
    time?: Time;
    favorite: boolean;

    constructor(allday: boolean);
    constructor(year: string, month: string, day: string);
    constructor(
        year: string,
        month: string,
        day: string,
        hour: string,
        min: string,
        sec: string
    );
    constructor(
        yearOrAllday: string | boolean,
        month?: string,
        day?: string,
        hour?: string,
        min?: string,
        sec?: string
    ) {
        this.favorite = false;

        if (typeof yearOrAllday === 'boolean') {
            let allday = yearOrAllday;
            this.date = new Date();
            if (!allday) this.time = new Time();
        } else {
            let year = yearOrAllday;
            this.date = new Date(year, month, day);
            // TODO: Do we need to check all three? Should be caught by typechecker.
            if (hour !== undefined && min !== undefined && sec !== undefined)
                this.time = new Time(hour, min, sec);
        }

        if (this.time === undefined) {
            this.displayDate = this.date;
        } else {
            if (parseInt(this.time.hour) < 5) {
                this.displayDate = this.date.preceedingDate();
            } else {
                this.displayDate = this.date;
            }
        }
    }

    write(body: string) {
        fs.writeFileSync(this.filename, body + '\n');
    }

    get id(): string {
        if (this.time === undefined)
            return [this.date.year, this.date.month, this.date.day].join('-');
        return [
            this.date.year,
            this.date.month,
            this.date.day,
            this.time.hour,
            this.time.min,
            this.time.sec
        ].join('-');
    }

    get filename(): string {
        if (this.time === undefined)
            return path.join(
                'content',
                this.date.year,
                this.date.month,
                this.date.day,
                'allday.md'
            );
        return path.join(
            'content',
            this.date.year,
            this.date.month,
            this.date.day,
            [this.time.hour, this.time.min, this.time.sec].join('-') + '.md'
        );
    }

    get markdown(): string {
        return fs
            .readFileSync(this.filename, { encoding: 'utf8' })
            .replace(/\n$/, '');
    }

    get html(): string {
        return markdown.render(this.markdown);
    }

    get timeString(): string {
        if (this.time === undefined) return 'allday';
        return this.time.hourMin;
    }

    get url(): string {
        if (this.time === undefined)
            return (
                '/' + [this.date.year, this.date.month, this.date.day].join('/')
            );
        return (
            '/' +
            [
                this.date.year,
                this.date.month,
                this.date.day,
                this.time.hour,
                this.time.min,
                this.time.sec
            ].join('/')
        );
    }

    get editUrl(): string {
        return [this.url, 'edit'].join('/');
    }

    get submitEditUrl(): string {
        return this.url + '?edited'; // TODO: Use URL class?
    }
}

class Date {
    year: string;
    month: string;
    day: string;

    constructor();
    constructor(year: string, month?: string, day?: string);
    constructor(year?: string, month?: string, day?: string) {
        if (year === undefined) {
            let d = new global.Date();
            this.year = d.getFullYear().zeropad(4);
            this.month = (d.getMonth() + 1).zeropad(2);
            this.day = d.getDate().zeropad(2);
            return;
        }
        this.year = year;
        this.month = month === undefined ? '00' : month; // TODO: Make month and day fields optional?
        this.day = day === undefined ? '00' : day;
    }

    toString(): string {
        return [this.year, this.month, this.day].join('-');
    }

    preceedingDate(): Date {
        let d = new global.Date(
            parseInt(this.year),
            parseInt(this.month) - 1,
            parseInt(this.day)
        );
        d.setDate(d.getDate() - 1);
        return new Date(
            d.getFullYear().zeropad(4),
            (d.getMonth() + 1).zeropad(2),
            d.getDate().zeropad(2)
        );
    }

    // The day of week, where 0 represents Sunday
    private get weekday(): number {
        return new global.Date(
            parseInt(this.year),
            parseInt(this.month) - 1,
            parseInt(this.day)
        ).getDay();
    }

    get shortDayName(): string {
        return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][this.weekday];
    }

    get longDayName(): string {
        return [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ][this.weekday];
    }

    get shortMonthName(): string {
        return [
            'jan',
            'feb',
            'mar',
            'apr',
            'may',
            'jun',
            'jul',
            'aug',
            'sep',
            'oct',
            'nov',
            'dec'
        ][parseInt(this.month) - 1];
    }

    get longMonthName(): string {
        return [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December'
        ][parseInt(this.month) - 1];
    }

    get shortDate(): string {
        return [this.day, this.month].join('/');
    }

    get longDate(): string {
        return `${this.longDayName}, ${this.longMonthName} ${parseInt(
            this.day
        )} ${this.year}`;
    }
}

class Time {
    hour: string;
    min: string;
    sec: string;

    constructor();
    constructor(hour: string, min: string, sec: string);
    constructor(hour?: string, min?: string, sec?: string) {
        if (hour === undefined || min === undefined || sec === undefined) {
            let d = new global.Date();
            this.hour = d.getHours().zeropad(2);
            this.min = d.getMinutes().zeropad(2);
            this.sec = d.getSeconds().zeropad(2);
            return;
        }
        this.hour = hour;
        this.min = min;
        this.sec = sec;
    }

    toString(): string {
        return [this.hour, this.min, this.sec].join('-');
    }

    get hourMin(): string {
        return [this.hour, this.min].join(':');
    }
}

export { Year, Month, Day, Post };
