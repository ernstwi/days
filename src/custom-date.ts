import assert = require('assert');

import dateFormat from 'dateformat';

class CustomDate extends Date {
    allday = false;

    // args := year, month [, day [, hours [, minutes [, seconds]]]]
    //       | url
    //       | file
    //       | CustomDate
    //       | Date
    //       | Unix epoch (milliseconds)
    //       | []
    constructor(...args: any) {
        super();

        // []
        if (args.length === 0) {
            return;
        }

        // Unix epoch (milliseconds)
        if (args.length === 1 && typeof args[0] === 'number') {
            this.setTime(args[0]);
            return;
        }

        // CustomDate
        if (args[0] instanceof CustomDate) {
            this.setTime(args[0].valueOf());
            this.allday = args[0].allday;
            return;
        }

        // Date
        if (args[0] instanceof Date) {
            this.setTime(args[0].valueOf());
            return;
        }

        // url | file
        if (typeof args[0] === 'string') {
            let match = args[0].match(
                /^(http:\/\/localhost:\d{4})?\/(\d{4})\/(\d{2})(\/(\d{2}))?(\/(\d{2})\/(\d{2})\/(\d{2}))?.*$/
            );
            if (match === null)
                match = args[0].match(
                    /(\d{4})\/(\d{2})\/(\d{2})\/((\d{2})-(\d{2})-(\d{2})|allday).md/
                );
            if (match !== null) args = match.filter(x => /^\d+$/.test(x));
        }

        // year, month [, day [, hours [, minutes [, seconds]]]]
        assert(args.length >= 2);
        this.setFullYear(args[0]);
        this.setMonth(args[1] - 1, 1);

        if (args.length > 2) this.setDate(args[2]);
        if (args.length > 3) this.setHours(args[3]);
        if (args.length > 4) this.setMinutes(args[4]);
        if (args.length > 5) this.setSeconds(args[5]);

        if (args.length < 4) this.allday = true;
    }

    // ---- File paths ---------------------------------------------------------

    yearDir() {
        return dateFormat(this, '/yyyy');
    }

    monthDir() {
        return dateFormat(this, '/yyyy/mm');
    }

    dayDir() {
        return dateFormat(this, '/yyyy/mm/dd');
    }

    file() {
        return dateFormat(
            this,
            `/yyyy/mm/dd/${this.allday ? '"allday"' : 'HH-MM-ss'}".md"`
        );
    }

    // ---- URLs ---------------------------------------------------------------

    postUrl() {
        return dateFormat(this, `/yyyy/mm/dd${this.allday ? '' : '/HH/MM/ss'}`);
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

export default CustomDate;
