class NameCollision extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NameCollision';
    }
}

export { NameCollision };
