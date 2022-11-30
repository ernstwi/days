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
import pug = require('pug');

import './extensions';
import { markdownOptions } from './constants';

const markdown = markdownIt(markdownOptions);

class Year {
    private date: PlainDate;
    months: Month[];

    constructor(year: string) {
        this.date = new PlainDate(year);
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
    private date: PlainDate;
    days: Day[];

    constructor(year: string, month: string) {
        this.date = new PlainDate(year, month);
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
    private date: PlainDate;
    timedPosts: Post[];
    alldayPost?: Post;

    constructor(year: string, month: string, day: string) {
        this.date = new PlainDate(year, month, day);
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
    date: PlainDate;
    displayDate: PlainDate;
    time?: Time;
    favorite: boolean;
    body: string;
    birthtime: Date;
    mtime: Date;

    constructor(allday: boolean);
    constructor(allday: boolean, date: Date);
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
        x: boolean | string,
        y?: Date | string,
        day?: string,
        hour?: string,
        min?: string,
        sec?: string
    ) {
        // TODO: Refactor for clarity
        this.favorite = false;
        this.body = '';
        this.birthtime = this.mtime = new Date();

        if (typeof x === 'boolean') {
            let allday = x as boolean;
            if (y === undefined) {
                this.date = new PlainDate();
                if (!allday) this.time = new Time();
            } else {
                let date = y as Date;
                this.date = new PlainDate(date);
                if (!allday) this.time = new Time(date);
            }
        } else {
            let year = x as string;
            let month = y as string;
            this.date = new PlainDate(year, month, day);
            // TODO: Do we need to check all three? Should be caught by typechecker.
            if (hour !== undefined && min !== undefined && sec !== undefined)
                this.time = new Time(hour, min, sec);
        }

        if (this.time === undefined) {
            this.displayDate = this.date;
        } else {
            if (parseInt(this.time.hour) < 5) {
                this.displayDate = this.date.preceedingPlainDate();
            } else {
                this.displayDate = this.date;
            }
        }
    }

    read(): void {
        if (this.fileExists()) this.body = fs.readFileSync(this.path, 'utf8');
    }

    write(): void {
        // Make directory if it doesn't exist
        fs.mkdirSync(path.dirname(this.path), { recursive: true });

        // Delete and readd file if it exists. This is a hack so that we can
        // manipulate `birthtime` using `fs.utimesSync`.
        if (this.fileExists()) fs.unlinkSync(this.path);
        fs.writeFileSync(this.path, this.body);

        // Set `birthtime` and `mtime` by making two changes to `mtime`. `atime`
        // (access time) is set to now.
        let now = new Date();
        fs.utimesSync(this.path, now, this.birthtime);
        fs.utimesSync(this.path, now, this.mtime);
    }

    fileExists(): boolean {
        return fs.existsSync(this.path);
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

    get path(): string {
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
            .readFileSync(this.path, { encoding: 'utf8' })
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

// Simple date representation without a time element
class PlainDate {
    year: string;
    month: string;
    day: string;

    constructor();
    constructor(date: Date);
    constructor(year: string, month?: string, day?: string);
    constructor(x?: string | Date, month?: string, day?: string) {
        if (x === undefined || x instanceof Date) {
            let d = x === undefined ? new Date() : (x as Date);
            this.year = d.getFullYear().zeropad(4);
            this.month = (d.getMonth() + 1).zeropad(2);
            this.day = d.getDate().zeropad(2);
            return;
        }

        let year = x as string;
        this.year = year;
        this.month = month === undefined ? '00' : month; // TODO: Make month and day fields optional?
        this.day = day === undefined ? '00' : day;
    }

    toString(): string {
        return [this.year, this.month, this.day].join('-');
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

    preceedingPlainDate(): PlainDate {
        let d = this.date;
        d.setDate(d.getDate() - 1);
        return new PlainDate(d);
    }

    private get date(): Date {
        return new Date(
            parseInt(this.year),
            parseInt(this.month) - 1,
            parseInt(this.day)
        );
    }

    // The day of week, where 0 represents Sunday
    private get weekday(): number {
        return this.date.getDay();
    }
}

class Time {
    hour: string;
    min: string;
    sec: string;

    constructor();
    constructor(date: Date);
    constructor(hour: string, min: string, sec: string);
    constructor(x?: string | Date, min?: string, sec?: string) {
        if (x === undefined || x instanceof Date) {
            let d = x === undefined ? new Date() : (x as Date);
            this.hour = d.getHours().zeropad(2);
            this.min = d.getMinutes().zeropad(2);
            this.sec = d.getSeconds().zeropad(2);
            return;
        }

        this.hour = x as string;
        this.min = min as string;
        this.sec = sec as string;
    }

    toString(): string {
        return [this.hour, this.min, this.sec].join('-');
    }

    get hourMin(): string {
        return [this.hour, this.min].join(':');
    }
}

// Light wrapper around asset files, to mirror file API of Post
class Asset {
    // Path relative to `assets`
    filename: string;

    // Absolute path somewhere else on the system, used when this Asset is to be merged
    altPath?: string;

    #pugAsset: any; // TODO: Pug types

    constructor(filename: string, altPath?: string) {
        this.filename = filename;
        this.altPath = altPath;

        this.#pugAsset = pug.compileFile(`${__dirname}/asset.pug`);
    }

    fileExists(): boolean {
        return fs.existsSync(this.path);
    }

    get path(): string {
        return path.join('assets', this.filename);
    }

    // Return an html tag for referencing Asset in post body
    get htmlTag() {
        let extension = path.extname(this.path).substring(1).toLowerCase();
        return this.#pugAsset({
            extension: extension,
            path: this.path
        });
    }
}

export { Year, Month, Day, Post, Asset };
