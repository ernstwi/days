function fav(elem, id) {
    elem.classList.toggle('active');
    fetch(`${id}?favorite`);
}

Array.from(document.getElementsByTagName('video')).forEach(video => {
    video.muted = true;
    video.loop = true;
    video.autoplay = true;

    let wrapper = document.createElement('div');
    wrapper.className = 'video-wrapper';
    video.replaceWith(wrapper);
    wrapper.appendChild(video);

    let controls = document.createElement('button');
    controls.innerHTML = 'Controls';
    controls.onclick = function() {
        video.controls = !video.controls;
    };
    wrapper.appendChild(controls);

    let slow = document.createElement('button');
    slow.innerHTML = 'Slow motion';
    slow.onclick = function() {
        video.playbackRate = video.playbackRate == 1 ? 0.25 : 1;
    };
    wrapper.appendChild(slow);

    let audio = document.createElement('button');
    audio.innerHTML = 'Audio';
    audio.onclick = function() {
        video.muted = !video.muted;
    };
    wrapper.appendChild(audio);

    let mpv = document.createElement('button');
    mpv.innerHTML = 'mpv';
    mpv.onclick = function() {
        fetch(`/mpv?${video.src}`);
    };
    wrapper.appendChild(mpv);
});

Array.from(document.getElementsByTagName('audio')).forEach(e => {
    e.controls = true;
});

Array.from(document.getElementsByTagName('img')).forEach(e => {
    e.onclick = function() {
        if (this.hasAttribute('style'))
            this.removeAttribute('style');
        else
            this.style.maxHeight = 'none';
    };
});
