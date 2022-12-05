import http = require('http');

export type HandlerFunc = (
    req: http.IncomingMessage,
    res: http.ServerResponse
) => void;

export class Route {
    regexp: RegExp;
    handler: HandlerFunc;

    constructor(pattern: string, handler: HandlerFunc) {
        this.regexp = new RegExp('^' + pattern + '$');
        this.handler = handler;
    }

    captureGroups(str: string): string[] {
        let match = str.match(this.regexp);
        if (match === null) return [];
        return match.slice(1);
    }
}

export function router(routes: Route[]): http.RequestListener {
    return (req: http.IncomingMessage, res: http.ServerResponse) => {
        for (let r of routes) {
            if (r.regexp.test(req.url as string)) {
                r.handler(req, res);
                return;
            }
        }
        res.end('invalid url');
    };
}
