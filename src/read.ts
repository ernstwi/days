import path = require('path');
import fs = require('fs');

import { Year, Month, Day, Date, Post } from './struct';

type PostFilter = (post: Post) => boolean;

function readPosts(filter?: PostFilter): Map<string, Post> {
    let res = new Map<string, Post>();
    let favorites = fs.existsSync('.fav')
        ? new Set(fs.readFileSync('.fav', { encoding: 'utf8' }).lines())
        : new Set();
    let years = filterDir('content', /^\d{4}$/);
    for (let y of years) {
        for (let m of filterDir(path.join('content', y), /^\d{2}$/)) {
            for (let d of filterDir(path.join('content', y, m), /^\d{2}$/)) {
                for (let f of filterDir(
                    path.join('content', y, m, d),
                    /^(\d{2}-\d{2}-\d{2}\.md)|(allday\.md)$/
                )) {
                    let p;
                    if (f === 'allday.md') {
                        p = new Post(y, m, d);
                    } else {
                        let [, h, M, s] = f.match(
                            /^(\d{2})-(\d{2})-(\d{2})\.md$/
                        ) as RegExpMatchArray;
                        p = new Post(y, m, d, h, M, s);
                    }
                    if (favorites.has(p.id)) p.favorite = true;
                    if (filter === undefined || filter(p)) res.set(p.id, p);
                }
            }
        }
    }
    return res;
}

function content(
    filter?: PostFilter
): {
    years: Map<string, Year>;
    months: Map<string, Month>;
    days: Map<string, Day>;
    posts: Map<string, Post>;
} {
    let years = new Map<string, Year>();
    let months = new Map<string, Month>();
    let days = new Map<string, Day>();
    let posts = readPosts(filter);

    {
        // Prefill years with every year between the first and last in file system
        let yearsDir = filterDir('content', /^\d{4}$/);
        for (
            let i = parseInt(yearsDir[0]);
            i <= parseInt(yearsDir.last());
            i++
        ) {
            let y = i.toString(); // Assumption: Year has four digits
            years.set(y, new Year(y));
        }
    }

    for (let p of posts.values()) {
        let y = getOrMake(years, new Year(p.displayDate.year));
        let m = getOrMake(
            months,
            new Month(p.displayDate.year, p.displayDate.month)
        );
        let d = getOrMake(
            days,
            new Day(p.displayDate.year, p.displayDate.month, p.displayDate.day)
        );

        if (p.time === undefined) d.alldayPost = p;
        else d.timedPosts.push(p);

        if (m.days.last() !== d) m.days.push(d);

        y.months[parseInt(m.month) - 1] = m;
    }

    return { years, months, days, posts };
}

interface Identifiable {
    id: string;
}

// If map does not contain elem.id, set map[elem.id] := elem. Return map[elem].
function getOrMake<T extends Identifiable>(map: Map<string, T>, elem: T): T {
    let old = map.get(elem.id);
    if (old !== undefined) return old;
    map.set(elem.id, elem);
    return elem;
}

// Return all filenames in dir matching filter.
function filterDir(dir: string, filter: RegExp): string[] {
    return fs.readdirSync(dir).filter(f => filter.test(f));
}

export { content };
