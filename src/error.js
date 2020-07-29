class NameCollision extends Error {
    constructor(message) {
        super(message);
        this.name = 'NameCollision';
    }
}

exports.NameCollision = NameCollision;
