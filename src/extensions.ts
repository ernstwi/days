export {}; // To mark this as a module

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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
Number.prototype.zeropad = function (width) {
    let res = this.toString();
    return res.length >= width
        ? res
        : new Array(width - res.length + 1).join('0') + res;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
Array.prototype.last = function () {
    return this[this.length - 1];
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
String.prototype.lines = function () {
    let res = this.split('\n');

    // Trailing newline
    if (res[res.length - 1] === '') {
        res.splice(-1, 1);
    }

    return res;
};
