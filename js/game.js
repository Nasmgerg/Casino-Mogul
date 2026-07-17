const Game = (function () {

    let timerInterval = null;


    function createInitialState(p1Name, p2Name) {
        const savedConfig = Save.loadConfig();

        return {
            config: {
                turnTimeLimit: savedConfig ? savedConfig.turnTimeLimit : 60,
                theme: savedConfig ? savedConfig.theme : 'night',
                soundEnabled: savedConfig ? savedConfig.soundEnabled : true
            },
            game: {
                currentPlayerId: 1,
                round: 1,
                maxRounds: 5,
                timerSeconds: savedConfig ? savedConfig.turnTimeLimit : 60,
                phase: 'playing',
                selectedUnitId: null,
                winner: null
            },
            players: [
                {
                    id: 1, name: p1Name || 'Player 1',
                    money: 20, kills: 0,
                    color: '#ff4444', isActive: true
                },
                {
                    id: 2, name: p2Name || 'Player 2',
                    money: 20, kills: 0,
                    color: '#4488ff', isActive: false
                }
            ],
            units: Units.createInitialUnits(),
            map: Map.generateMap(),
            buildings: [],
            log: []
        };
    }


    function startTimer() {
        stopTimer();

        timerInterval = setInterval(function () {
            const gs = window.gameState;
            if (!gs || gs.game.phase !== 'playing') return;

            gs.game.timerSeconds--;
            UI.updateTimer(gs.game.timerSeconds);


            if (gs.game.timerSeconds <= 10) {
                UI.setTimerWarning('danger');
            } else if (gs.game.timerSeconds <= 20) {
                UI.setTimerWarning('warning');
            }

            if (gs.game.timerSeconds <= 0) {
                UI.addLog('⏰ Idő lejárt! Automatikus körváltás.', gs.game.currentPlayerId);
                endTurn();
            }
        }, 1000);
    }


    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

//Kör vége
    function endTurn() {
        const gs = window.gameState;
        if (gs.game.phase !== 'playing') return;

        stopTimer();

        // Casino passzív jövedelem kör végén
        Units.collectBuildingIncome();


        Units.resetMovement();


        Units.clearSelection();


        let nextPlayerId;
        if (gs.game.currentPlayerId === 1) {
            nextPlayerId = 2;
        } else {
            nextPlayerId = 1;
        }

        // Ha Player 2 volt akkor kör száma növekszik
        if (gs.game.currentPlayerId === 2) {
            gs.game.round++;

            // Elértük az utolsó kört?
            if (gs.game.round > gs.game.maxRounds) {
                endGame();
                return;
            }
        }

        gs.game.currentPlayerId = nextPlayerId;
        gs.game.timerSeconds = gs.config.turnTimeLimit;


        gs.players.forEach(function (p) {
            p.isActive = (p.id === nextPlayerId);
        });


        Save.saveGame();


        Audio.play('turn');
        UI.updateHUD();
        UI.updateActivePlayer();
        UI.setTimerWarning('normal');

        UI.addLog(
            '--- ' + getPlayer(nextPlayerId).name + ' következik (Kör ' + gs.game.round + '/5) ---',
            nextPlayerId
        );


        startTimer();
        Map.render();
    }
//Játék vége
    function endGame() {
        const gs = window.gameState;
        stopTimer();

        gs.game.phase = 'gameover';

        // Győztes meghatározása
        const p1 = gs.players[0];
        const p2 = gs.players[1];

        let winner = null;

        if (p1.money > p2.money) {
            winner = p1.id;
        } else if (p2.money > p1.money) {
            winner = p2.id;
        } else {
            // Ha gyenlő pénz akkor több kill dönt
            if (p1.kills > p2.kills) {
                winner = p1.id;
            } else if (p2.kills > p1.kills) {
                winner = p2.id;
            } else {
                winner = 'draw';
            }
        }

        gs.game.winner = winner;
        Save.deleteSave();


        Audio.stopBgMusic();
        Audio.play('win');

        // Rövid delay a win hang miatt
        setTimeout(function () {
            UI.showGameOver(winner, p1, p2);
        }, 800);
    }


    function applyConfig(key, value) {
        const gs = window.gameState;
        if (!gs) return;


        if (key === 'turnTimeLimit') value = parseInt(value);
        if (key === 'soundEnabled') value = (value === 'true' || value === true);

        gs.config[key] = value;


        if (key === 'theme') {
            UI.applyTheme(value);
        }

        if (key === 'soundEnabled') {
            Audio.setSoundEnabled(value);
        }

        if (key === 'turnTimeLimit') {
            // Ha változott az időlimit, a következő kör már ezt használja
            gs.game.timerSeconds = value;
            UI.updateTimer(value);
        }

        Save.saveConfig(gs.config);
    }

    // Ha egy játékosnak nincs több egysége, a játék véget ér
    function checkWinCondition() {
        const gs = window.gameState;
        if (gs.game.phase !== 'playing') return;

        const p1HasUnits = Units.hasUnits(1);
        const p2HasUnits = Units.hasUnits(2);

        if (!p1HasUnits || !p2HasUnits) {
            UI.addLog('🏁 Minden egység megsemmisült, játék vége!', 0);
            endGame();
        }
    }


    function getPlayer(id) {
        return window.gameState.players.find(function (p) {
            return p.id === id;
        });
    }


    return {
        createInitialState: createInitialState,
        startTimer: startTimer,
        stopTimer: stopTimer,
        endTurn: endTurn,
        endGame: endGame,
        applyConfig: applyConfig,
        checkWinCondition: checkWinCondition
    };

})();