import { Post, Asset } from './struct';

export default function merge(posts: Post[], assets: Asset[]): string {
    for (let p of posts) {
        p.read();
        p.root = '.';
    }

    let collisions = checkCollisions(posts, assets);
    if (collisions !== '') return collisions;

    for (let p of posts) p.write();
    for (let a of assets) a.write();
    return '';
}

function checkCollisions(posts: Post[], assets: Asset[]): string {
    let postCollisions = posts.filter(p => p.fileExists());
    let assetCollisions = assets.filter(a => a.fileExists());

    if (postCollisions.length === 0 && assetCollisions.length === 0) return '';

    let res = [];
    res.push('Collisions detected, merge aborted');
    if (postCollisions.length > 0) {
        res.push('Posts:');
        for (let p of postCollisions) res.push(p.path);
    }
    if (assetCollisions.length > 0) {
        res.push('Assets:');
        for (let a of assetCollisions) res.push(a.path);
    }
    return res.join('\n');
}
