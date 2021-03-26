class NameCollision extends Error {
    constructor(message) {
        super(message);
        this.name = 'NameCollision';
    }
}

module.exports = {
    NameCollision: NameCollision
};
