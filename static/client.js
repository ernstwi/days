function fav(elem, id) {
    elem.classList.toggle('active');
    fetch(`${id}?favorite`);
}

Array.from(document.getElementsByTagName('video')).forEach(e => {
    e.muted = true;
    e.loop = true;
    e.autoplay = true;
    e.onclick = function () {
        this.muted = !this.muted;
    };
});

Array.from(document.getElementsByTagName('audio')).forEach(e => {
    e.controls = true;
});

Array.from(document.getElementsByTagName('img')).forEach(e => {
    e.onclick = function () {
        if (this.hasAttribute('style')) this.removeAttribute('style');
        else this.style.maxHeight = 'none';
    };
});
