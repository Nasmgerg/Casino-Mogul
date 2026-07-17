const Save = (function () {

    const SAVE_KEY   = 'casinoMogul_saveGame';
    const CONFIG_KEY = 'casinoMogul_config';

    function storageSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Mentési hiba:', e);
            return false;
        }
    }

    function storageGet(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Betöltési hiba:', e);
            return null;
        }
    }

    function saveGame() {
        if (!window.gameState) { console.warn('Save: nincs gameState!'); return false; }
        return storageSet(SAVE_KEY, window.gameState);
    }

    function loadGame()      { return storageGet(SAVE_KEY); }
    function hasSavedGame()  { return localStorage.getItem(SAVE_KEY) !== null; }
    function deleteSave()    { localStorage.removeItem(SAVE_KEY); }
    function saveConfig(cfg) { storageSet(CONFIG_KEY, cfg); }
    function loadConfig()    { return storageGet(CONFIG_KEY); }

    return { saveGame, loadGame, hasSavedGame, deleteSave, saveConfig, loadConfig };

})();