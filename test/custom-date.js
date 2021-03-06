let assert = require('assert');

let CustomDate = require('../build/custom-date').default;

describe('CustomDate', function () {
    describe('constructor', function () {
        specify(
            'new CustomDate(year, month [, day [, hours [, minutes [, seconds]]]])',
            function () {
                let date = new CustomDate(2020, 9);
                assert.equal(date.getFullYear(), 2020);
                assert.equal(date.getMonth(), 8);
            }
        );
        describe('new CustomDate(url)', function () {
            specify('timed', function () {
                let date = new CustomDate(
                    'http://localhost:3004/1910/11/28/10/09/22'
                );
                assert.equal(date.getFullYear(), 1910);
                assert.equal(date.getMonth(), 10);
                assert.equal(date.getDate(), 28);
                assert.equal(date.getHours(), 10);
                assert.equal(date.getMinutes(), 9);
                assert.equal(date.getSeconds(), 22);
                assert.equal(date.allday, false);
            });
            specify('allday', function () {
                let date = new CustomDate('http://localhost:3004/1910/11/28');
                assert.equal(date.getFullYear(), 1910);
                assert.equal(date.getMonth(), 10);
                assert.equal(date.getDate(), 28);
                assert.equal(date.allday, true);
            });
            specify('month', function () {
                let date = new CustomDate('http://localhost:3004/1910/11');
                assert.equal(date.getFullYear(), 1910);
                assert.equal(date.getMonth(), 10);
                assert.equal(date.allday, true);
            });
        });
        describe('new CustomDate(file)', function () {
            specify('timed', function () {
                let date = new CustomDate('content/1910/11/28/10-09-22.md');
                assert.equal(date.getFullYear(), 1910);
                assert.equal(date.getMonth(), 10);
                assert.equal(date.getDate(), 28);
                assert.equal(date.getHours(), 10);
                assert.equal(date.getMinutes(), 9);
                assert.equal(date.getSeconds(), 22);
                assert.equal(date.allday, false);
            });
            specify('allday', function () {
                let date = new CustomDate('content/1910/11/28/allday.md');
                assert.equal(date.getFullYear(), 1910);
                assert.equal(date.getMonth(), 10);
                assert.equal(date.getDate(), 28);
                assert.equal(date.allday, true);
            });
        });
        describe('new CustomDate(customDate)', function () {
            specify('timed', function () {
                let a = new CustomDate(1910, 11, 28, 10, 9, 22);
                let b = new CustomDate(a);
                assert.equal(b.getFullYear(), 1910);
                assert.equal(b.getMonth(), 10);
                assert.equal(b.getDate(), 28);
                assert.equal(b.getHours(), 10);
                assert.equal(b.getMinutes(), 9);
                assert.equal(b.getSeconds(), 22);
                assert.equal(b.allday, false);
            });
            specify('allday', function () {
                let a = new CustomDate(1910, 11, 28);
                let b = new CustomDate(a);
                assert.equal(b.getFullYear(), 1910);
                assert.equal(b.getMonth(), 10);
                assert.equal(b.getDate(), 28);
                assert.equal(b.allday, true);
            });
        });
    });
});
