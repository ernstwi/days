let assert = require('assert');

let CustomDate = require('../build/custom-date').default;

describe('CustomDate', function () {
    describe('constructor', function () {
        specify(
            'new CustomDate(year, month [, day [, hours [, minutes [, seconds]]]])',
            function () {
                let date = new CustomDate(2020, 9);
                assert.strictEqual(date.getFullYear(), 2020);
                assert.strictEqual(date.getMonth(), 8);
            }
        );
        describe('new CustomDate(url)', function () {
            specify('timed', function () {
                let date = new CustomDate(
                    'http://localhost:3004/1910/11/28/10/09/22'
                );
                assert.strictEqual(date.getFullYear(), 1910);
                assert.strictEqual(date.getMonth(), 10);
                assert.strictEqual(date.getDate(), 28);
                assert.strictEqual(date.getHours(), 10);
                assert.strictEqual(date.getMinutes(), 9);
                assert.strictEqual(date.getSeconds(), 22);
                assert.strictEqual(date.allday, false);
            });
            specify('allday', function () {
                let date = new CustomDate('http://localhost:3004/1910/11/28');
                assert.strictEqual(date.getFullYear(), 1910);
                assert.strictEqual(date.getMonth(), 10);
                assert.strictEqual(date.getDate(), 28);
                assert.strictEqual(date.allday, true);
            });
            specify('month', function () {
                let date = new CustomDate('http://localhost:3004/1910/11');
                assert.strictEqual(date.getFullYear(), 1910);
                assert.strictEqual(date.getMonth(), 10);
                assert.strictEqual(date.allday, true);
            });
        });
        describe('new CustomDate(file)', function () {
            specify('timed', function () {
                let date = new CustomDate('content/1910/11/28/10-09-22.md');
                assert.strictEqual(date.getFullYear(), 1910);
                assert.strictEqual(date.getMonth(), 10);
                assert.strictEqual(date.getDate(), 28);
                assert.strictEqual(date.getHours(), 10);
                assert.strictEqual(date.getMinutes(), 9);
                assert.strictEqual(date.getSeconds(), 22);
                assert.strictEqual(date.allday, false);
            });
            specify('allday', function () {
                let date = new CustomDate('content/1910/11/28/allday.md');
                assert.strictEqual(date.getFullYear(), 1910);
                assert.strictEqual(date.getMonth(), 10);
                assert.strictEqual(date.getDate(), 28);
                assert.strictEqual(date.allday, true);
            });
        });
        describe('new CustomDate(customDate)', function () {
            specify('timed', function () {
                let a = new CustomDate(1910, 11, 28, 10, 9, 22);
                let b = new CustomDate(a);
                assert.strictEqual(b.getFullYear(), 1910);
                assert.strictEqual(b.getMonth(), 10);
                assert.strictEqual(b.getDate(), 28);
                assert.strictEqual(b.getHours(), 10);
                assert.strictEqual(b.getMinutes(), 9);
                assert.strictEqual(b.getSeconds(), 22);
                assert.strictEqual(b.allday, false);
            });
            specify('allday', function () {
                let a = new CustomDate(1910, 11, 28);
                let b = new CustomDate(a);
                assert.strictEqual(b.getFullYear(), 1910);
                assert.strictEqual(b.getMonth(), 10);
                assert.strictEqual(b.getDate(), 28);
                assert.strictEqual(b.allday, true);
            });
        });
    });
});
