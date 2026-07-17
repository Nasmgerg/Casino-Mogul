$(document).ready(function () {

    //KÉPEK BETÖLTÉSE
    const images = {};
    let loadedCount = 0;
    const imageList = [
        {key: 'moneyBag', src: 'assets/images/money-bag.png'},
        {key: 'slotMachine', src: 'assets/images/slot-machine.png'},
        {key: 'charCollector', src: 'assets/images/character-male-b.png'},
        {key: 'charBouncer', src: 'assets/images/character-male-c.png'},
        {key: 'charScout', src: 'assets/images/character-male-d.png'}
    ];

    function loadImages(callback) {
        if (imageList.length === 0) {
            callback();
            return;
        }
        imageList.forEach(function (item) {
            const img = new Image();
            img.onload = img.onerror = function () {
                loadedCount++;
                if (loadedCount === imageList.length) callback();
            };
            img.src = item.src;
            images[item.key] = img;
        });
    }

    // INDÍTÁS
    loadImages(function () {
        const canvas = document.getElementById('game-canvas');
        Map.init(canvas, images);
        UI.showScreen('screen-menu');
        UI.updateMenuButtons();
        const savedConfig = Save.loadConfig();
        if (savedConfig) UI.applyTheme(savedConfig.theme);
        bindMenuEvents();
        bindGameEvents();
        bindModalEvents();
        bindKeyboardEvents();
        bindCanvasEvents();
        console.log('Casino Mogul betöltve!');
    });


    // FŐMENÜ ESEMÉNYEK

    function bindMenuEvents() {

        $('#btn-new-game').on('click', function () {
            // Ha van mentett játék, figyelmeztessük!
            if (Save.hasSavedGame()) {
                if (!confirm('Van egy mentett játékod! Ha új játékot kezdesz, a mentés törlődik.\nBiztosan folytatod?')) {
                    return;
                }
            }
            UI.showModal('modal-newgame');
            $('#input-p1-name').val('').focus();
            $('#input-p2-name').val('');
        });

        $('#btn-start-game').on('click', function () {
            const p1Name = $('#input-p1-name').val().trim() || 'Player 1';
            const p2Name = $('#input-p2-name').val().trim() || 'Player 2';
            UI.hideModal('modal-newgame');
            startNewGame(p1Name, p2Name);
        });

        // Enter a névbeviteli mezőben is indítja a játékot
        $('#input-p1-name, #input-p2-name').on('keydown', function (e) {
            if (e.key === 'Enter') $('#btn-start-game').click();
        });

        $('#btn-load-game').on('click', function () {
            loadSavedGame();
        });

        $('#btn-settings').on('click', function () {
            if (!window.gameState) {
                window.gameState = {
                    config: Save.loadConfig() || {
                        turnTimeLimit: 60,
                        theme: 'night',
                        soundEnabled: true
                    }
                };
            }
            UI.syncSettingsUI();
            UI.showModal('modal-settings');
        });

        $('#btn-help').on('click', function () {
            UI.showModal('modal-help');
        });
        $('#btn-cancel-newgame').on('click', function () {
            UI.hideModal('modal-newgame');
        });
    }

    // JÁTÉK KÖZBENI ESEMÉNYEK

    function bindGameEvents() {

        $('#btn-end-turn').on('click', function () {
            Game.endTurn();
        });

        $('#btn-build-casino').on('click', function () {
            const gs = window.gameState;
            if (!gs || gs.game.phase !== 'playing') return;
            gs.game.buildMode = true;
            gs.game.selectedBuildingId = null;
            gs.game.selectedUnitId = null;
            UI.addLog('Kattints egy szabad mezőre a casino építéséhez! (ESC = mégse)', gs.game.currentPlayerId);
            UI.updateActionButtons();
        });


        $(document).on('click', '.btn-manufacture', function () {
            const gs = window.gameState;
            if (!gs || gs.game.phase !== 'playing') return;
            const unitType = $(this).data('type');
            const buildingId = $(this).data('building');
            const success = Units.manufactureUnit(gs.game.currentPlayerId, unitType, buildingId);
            if (success) {
                const building = gs.buildings.find(function (b) {
                    return b.id === buildingId;
                });
                UI.updateBuildingPanel(building);
                UI.updateHUD();
                UI.flashCanvas();
                Map.render();
            }
        });

        $('#btn-save').on('click', function () {
            if (Save.saveGame()) UI.addLog('💾 Játékállás elmentve!', 0);
        });

        $('#btn-game-help').on('click', function () {
            UI.showModal('modal-help');
        });
        $('#btn-game-settings').on('click', function () {
            UI.syncSettingsUI();
            UI.showModal('modal-settings');
        });

        $('#btn-menu').on('click', function () {
            if (confirm('Visszamész a főmenübe?\n(A játékállás automatikusan mentésre kerül)')) {
                Save.saveGame();
                Game.stopTimer();
                Audio.stopBgMusic();
                window.gameState = null;
                UI.showScreen('screen-menu');
                UI.updateMenuButtons();
            }
        });

        $('#btn-play-again').on('click', function () {
            UI.showScreen('screen-menu');
            UI.showModal('modal-newgame');
        });

        $('#btn-back-menu').on('click', function () {
            window.gameState = null;
            UI.showScreen('screen-menu');
            UI.updateMenuButtons();
        });
    }


    // ESEMÉNYEK
    function bindModalEvents() {

        $('#btn-close-settings').on('click', function () {
            UI.hideModal('modal-settings');
        });
        $('#btn-close-help').on('click', function () {
            UI.hideModal('modal-help');
        });

        $(document).on('click', '.btn-option', function () {
            const setting = $(this).data('setting');
            const value = $(this).data('value');
            $('[data-setting="' + setting + '"]').removeClass('active');
            $(this).addClass('active');
            Game.applyConfig(setting, value);
        });

        $(document).on('click', '.modal', function (e) {
            if ($(e.target).hasClass('modal')) UI.hideAllModals();
        });
    }

    // BILLENTYŰZET
    function bindKeyboardEvents() {
        $(document).on('keydown', function (e) {
            const gs = window.gameState;
            switch (e.key) {
                case 'Enter':
                    if (gs && gs.game.phase === 'playing') {
                        e.preventDefault();
                        Game.endTurn();
                    }
                    break;
                case 'h':
                case 'H':
                    $('#modal-help').hasClass('hidden') ? UI.showModal('modal-help') : UI.hideModal('modal-help');
                    break;
                case 'Escape':
                    if (!$('.modal:not(.hidden)').length) {
                        if (gs) {
                            gs.game.buildMode = false;
                            Units.clearSelection();
                            UI.updateUnitPanel(null);
                            UI.updateActionButtons();
                            Map.render();
                        }
                    } else {
                        UI.hideAllModals();
                    }
                    break;
                case 's':
                case 'S':
                    if (gs && gs.game.phase === 'playing') {
                        if (Save.saveGame()) UI.addLog('💾 Gyors mentés!', 0);
                    }
                    break;
            }
        });
    }

    // CANVAS ESEMÉNYEK

    function bindCanvasEvents() {
        const $canvas = $('#game-canvas');

        $canvas.on('mousemove', function (e) {
            const gs = window.gameState;
            if (!gs || gs.game.phase !== 'playing') return;
            const pos = getCanvasPos(e), grid = Map.pixelToGrid(pos.x, pos.y);
            Map.setHover(grid.x, grid.y);
            Map.render();
        });

        $canvas.on('mouseleave', function () {
            Map.clearHover();
            if (window.gameState) Map.render();
        });

        $canvas.on('click', function (e) {
            const gs = window.gameState;
            if (!gs || gs.game.phase !== 'playing') return;
            const pos = getCanvasPos(e), grid = Map.pixelToGrid(pos.x, pos.y);
            handleCanvasClick(grid.x, grid.y);
        });
    }


    function handleCanvasClick(x, y) {
        const gs = window.gameState;


        if (gs.game.buildMode) {
            const success = Units.buildCasino(gs.game.currentPlayerId, x, y);
            if (success) {
                gs.game.buildMode = false;
                UI.updateHUD();
                UI.updateActionButtons();
                UI.flashCanvas();
                Map.render();
            }
            return;
        }

        const clickedUnit = Map.getUnitAt(x, y);
        const clickedBuilding = gs.buildings.find(function (b) {
            return b.x === x && b.y === y;
        });

        // ESET 1: Saját egységre kattintott, kijelölés
        if (clickedUnit && clickedUnit.ownerId === gs.game.currentPlayerId) {
            Units.selectUnit(clickedUnit.id);
            UI.updateUnitPanel(clickedUnit);
            Map.render();
            return;
        }

        // ESET 2: Saját casino épületre kattintott, gyártás panel
        if (clickedBuilding && clickedBuilding.ownerId === gs.game.currentPlayerId) {
            Units.selectBuilding(clickedBuilding.id);
            UI.updateBuildingPanel(clickedBuilding);
            Map.render();
            return;
        }

        // ESET 3: Van kijelölt egység, más mezőre kattintott → mozgás
        if (gs.game.selectedUnitId) {
            const result = Units.moveUnit(gs.game.selectedUnitId, x, y);
            switch (result) {
                case 'moved':
                case 'collected':
                case 'robbed':
                    Map.render();
                    UI.updateHUD();
                    UI.updateUnitPanel(null);
                    UI.flashCanvas();
                    break;
                case 'fought':
                    Map.render();
                    UI.updateHUD();
                    UI.updateUnitPanel(null);
                    UI.flashCanvas();
                    Game.checkWinCondition();
                    break;
                case 'invalid':
                    Units.clearSelection();
                    UI.updateUnitPanel(null);
                    Map.render();
                    break;
            }
            return;
        }

        // ESET 4: Egyéb, kijelölés törlése
        Units.clearSelection();
        UI.updateUnitPanel(null);
        Map.render();
    }


    // ÚJ JÁTÉK

    function startNewGame(p1Name, p2Name) {
        Save.deleteSave();
        window.gameState = Game.createInitialState(p1Name, p2Name);
        UI.applyTheme(window.gameState.config.theme);
        UI.showScreen('screen-game');
        UI.updateHUD();
        UI.addLog('🎰 Üdvözöllek a Casino Mogulban!', 0);
        UI.addLog('--- ' + p1Name + ' kezd (Kör 1/5) ---', 1);
        Audio.startBgMusic();
        Map.render();
        Game.startTimer();
    }


    // MENTETT JÁTÉK BETÖLTÉSE

    function loadSavedGame() {
        const savedState = Save.loadGame();
        if (!savedState) {
            alert('Nincs mentett játék!');
            return;
        }
        window.gameState = savedState;
        // game.buildMode és game.selectedBuildingId visszaállítása
        if (!window.gameState.game.buildMode) window.gameState.game.buildMode = false;
        if (!window.gameState.game.selectedBuildingId) window.gameState.game.selectedBuildingId = null;
        UI.applyTheme(window.gameState.config.theme);
        UI.showScreen('screen-game');
        UI.updateHUD();
        // Utolsó 10 napló visszatöltése
        const recent = window.gameState.log.slice(-10);
        recent.forEach(function (e) {
            UI.addLog(e.message, e.playerId);
        });
        UI.addLog('📂 Játékállás betöltve!', 0);
        Audio.startBgMusic();
        Map.render();
        Game.startTimer();
    }


    // Canvas pozíció

    function getCanvasPos(event) {
        const canvas = document.getElementById('game-canvas');
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (canvas.width / rect.width),
            y: (event.clientY - rect.top) * (canvas.height / rect.height)
        };
    }

});