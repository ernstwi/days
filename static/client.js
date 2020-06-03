function fav(elem, id) {
    elem.classList.toggle('active');
    fetch(`${id}?favorite`);
}

Array.from(document.getElementsByTagName('video')).forEach(v => {
    v.muted = true;
    v.loop = true;
    v.autoplay = true;
    v.onclick = function() {
        if (v.muted) {
            v.muted = false;
        } else {
            v.muted = true;
        }
    };
});

Array.from(document.getElementsByTagName('audio')).forEach(v => {
    v.controls = true;
});
