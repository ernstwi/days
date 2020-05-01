function toggleMuted(elem) {
    if (elem.muted) {
        elem.muted = false;
    } else {
        elem.muted = true;
    }
}

Array.from(document.getElementsByTagName('video')).forEach(v => {
    v.setAttribute('autoplay', '');
    v.setAttribute('muted', '');
    v.setAttribute('loop', '');
    v.setAttribute('onclick', 'toggleMuted(this)');
});

Array.from(document.getElementsByTagName('audio')).forEach(v => {
    v.setAttribute('controls', '');
});
