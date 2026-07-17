const Audio = (function () {


    const sounds = {
        bgMusic: new window.Audio('assets/sounds/bg_music.wav'),
        collect: new window.Audio('assets/sounds/collect.wav'),
        hit: new window.Audio('assets/sounds/hit.wav'),
        turn: new window.Audio('assets/sounds/turn.wav'),
        win: new window.Audio('assets/sounds/win.wav')
    };


    sounds.bgMusic.loop = true;
    sounds.bgMusic.volume = 0.35;


    sounds.collect.volume = 0.7;
    sounds.hit.volume = 0.8;
    sounds.turn.volume = 0.6;
    sounds.win.volume = 1.0;


    function isEnabled() {
        return window.gameState &&
            window.gameState.config &&
            window.gameState.config.soundEnabled === true;
    }


    function play(soundKey) {
        if (!isEnabled()) return;
        const sound = sounds[soundKey];
        if (!sound) return;

        sound.currentTime = 0;
        sound.play().catch(function () {

        });
    }

    // Háttérzene külön kezelés
    function startBgMusic() {
        if (!isEnabled()) return;
        sounds.bgMusic.currentTime = 0;
        sounds.bgMusic.play().catch(function () {
        });
    }

    function stopBgMusic() {
        sounds.bgMusic.pause();
        sounds.bgMusic.currentTime = 0;
    }

    function pauseBgMusic() {
        sounds.bgMusic.pause();
    }

    //Hang be/ki kapcsolás
    function setSoundEnabled(enabled) {
        if (!enabled) {
            stopBgMusic();
        } else {
            startBgMusic();
        }
    }

    return {
        play: play,
        startBgMusic: startBgMusic,
        stopBgMusic: stopBgMusic,
        pauseBgMusic: pauseBgMusic,
        setSoundEnabled: setSoundEnabled
    };

})();