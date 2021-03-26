let assert = require('assert');

let dateFormat = require('dateformat');

class CustomDate extends Date {
    allday = false;

    // args := year, month [, day [, hours [, minutes [, seconds]]]]
    //       | url
    //       | file
    //       | customDate
    //       | Date
    //       | Unix epoch (milliseconds)
    //       | undefined
    constructor(...args) {
        if (args[0] === undefined) {
            super();
            return;
        }

        if (args[0] instanceof CustomDate) {
            super(args[0].valueOf());
            this.allday = args[0].allday;
            return;
        }

        if (args[0] instanceof Date) {
            super(args[0].valueOf());
            return;
        }

        let match = args[0].toString().match(/^(http:\/\/localhost:\d{4})?\/(\d{4})\/(\d{2})\/(\d{2})(\/(\d{2})\/(\d{2})\/(\d{2}))?.*$/);
        if (match == null)
            match = args[0].toString().match(/(\d{4})\/(\d{2})\/(\d{2})\/((\d{2})-(\d{2})-(\d{2})|allday).md/);
        if (match != null)
            args = match.filter(x => /^\d+$/.test(x));

        if (args.length > 1)
            args[1]--;
        super(...args);
        if (args.length > 1 && args.length < 4)
            this.allday = true;
    }

    // ---- File paths ---------------------------------------------------------

    yearDir() {
        return dateFormat(this, '"content"/yyyy');
    }

    monthDir() {
        return dateFormat(this, '"content"/yyyy/mm');
    }

    dayDir() {
        return dateFormat(this, '"content"/yyyy/mm/dd');
    }

    file() {
        return dateFormat(this, `"content"/yyyy/mm/dd/${this.allday
            ? '"allday"'
            : 'HH-MM-ss'}".md"`);
    }

    // ---- URLs ---------------------------------------------------------------

    postUrl() {
        return dateFormat(this, `/yyyy/mm/dd${this.allday
            ? ''
            : '/HH/MM/ss'}`);
    }

    postEditUrl() {
        return `${this.postUrl()}/edit`;
    }

    monthUrl() {
        return dateFormat(this, '/yyyy/mm');
    }

    // ---- UI strings ---------------------------------------------------------

    monthString() {
        return dateFormat(this, 'mmmm');
    }

    monthStringShort() {
        return dateFormat(this, 'mmm').toLowerCase();
    }

    dayStringShort() {
        return dateFormat(this, 'ddd').toLowerCase();
    }

    timeString() {
        return this.allday ? 'all day' : dateFormat(this, 'HH:MM');
    }

    dateMonthStringShort() {
        return dateFormat(this, 'dd/mm');
    }

    dayMonthDateYearString() {
        return dateFormat(this, 'dddd, mmmm d yyyy');
    }
}

module.exports = CustomDate;
