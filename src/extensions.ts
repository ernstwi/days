export {};

declare global {
    interface Number {
        zeropad: (width: number) => string;
    }

    interface Array<T> {
        last: () => T;
    }

    interface String {
        lines: () => string[];
    }
}

Number.prototype.zeropad = function (width) {
    let res = this.toString();
    return res.length >= width
        ? res
        : new Array(width - res.length + 1).join('0') + res;
};

Array.prototype.last = function () {
    return this[this.length - 1];
};

String.prototype.lines = function () {
    let res = this.split('\n');

    // Trailing newline
    if (res[res.length - 1] === '') {
        res.splice(-1, 1);
    }

    return res;
};
