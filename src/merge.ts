import { Post, Asset } from './struct';

export default function merge(posts: Post[], assets: Asset[]): void {
    if (checkCollisions(posts, assets)) return;

    for (let p of posts) p.write();
    for (let a of assets) a.write();
}

function checkCollisions(posts: Post[], assets: Asset[]): boolean {
    let postCollisions = posts.filter(p => p.fileExists());
    let assetCollisions = assets.filter(a => a.fileExists());

    if (postCollisions.length === 0 && assetCollisions.length === 0)
        return false;

    console.error('Collisions detected, merge aborted');
    if (postCollisions.length > 0) {
        console.error('Posts:');
        for (let p of postCollisions) console.error(p.path);
    }
    if (assetCollisions.length > 0) {
        console.error('Assets:');
        for (let a of assetCollisions) console.error(a.path);
    }
    return true;
}
