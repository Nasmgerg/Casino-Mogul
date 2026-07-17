const UI = (function () {

    function showScreen(screenId) {
        $('.screen').removeClass('active');
        $('#' + screenId).addClass('active');
    }

    function updateHUD() {
        const gs = window.gameState;
        if (!gs) return;
        const p1 = gs.players[0], p2 = gs.players[1];
        $('#p1-money').text(p1.money);
        $('#p1-kills').text(p1.kills);
        $('#p2-money').text(p2.money);
        $('#p2-kills').text(p2.kills);
        $('#current-round').text(gs.game.round);
        $('#timer-display').text(gs.game.timerSeconds);
        updateActivePlayer();
        updateActionButtons();
    }

    function updateActivePlayer() {
        const gs = window.gameState;
        if (!gs) return;
        const active = gs.players.find(function (p) {
            return p.id === gs.game.currentPlayerId;
        });
        $('#active-player-name').text(active.name);
        $('#hud-p1').toggleClass('active-turn', gs.game.currentPlayerId === 1);
        $('#hud-p2').toggleClass('active-turn', gs.game.currentPlayerId === 2);
    }

    function updateTimer(seconds) {
        $('#timer-display').text(seconds);
    }

    function setTimerWarning(level) {
        const $t = $('.timer-box');
        $t.removeClass('warning danger');
        if (level === 'warning') $t.addClass('warning');
        if (level === 'danger') $t.addClass('danger');
    }

    function updateActionButtons() {
        const gs = window.gameState;
        if (!gs) return;
        const player = gs.players.find(function (p) {
            return p.id === gs.game.currentPlayerId;
        });
        const canBuild = player.money >= 20 && !gs.game.buildMode;
        $('#btn-build-casino')
            .prop('disabled', !canBuild)
            .toggleClass('btn-action-active', !!gs.game.buildMode);
    }

    //SEGÉDEK
    function makeEl(tag, className, text) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text !== undefined) el.textContent = text;
        return el;
    }

    function makeStatRow(label, value) {
        const row = makeEl('div', 'unit-stat-row');
        row.appendChild(makeEl('span', null, label));
        const val = makeEl('span');
        val.innerHTML = value;
        row.appendChild(val);
        return row;
    }

    //EGYSÉG INFO PANEL
    function updateUnitPanel(unit) {
        $('#building-panel').hide();
        $('#unit-info-panel').show();

        const container = document.getElementById('unit-info-content');
        container.innerHTML = '';

        if (!unit) {
            const p = makeEl('p', 'panel-empty');
            p.innerHTML = 'Kattints egy egységre<br>vagy casino épületre!';
            container.appendChild(p);
            return;
        }

        const player = window.gameState.players.find(function (p) {
            return p.id === unit.ownerId;
        });
        const hpRatio = unit.hp / unit.maxHp;
        const hpClass = hpRatio > 0.6 ? '' : hpRatio > 0.3 ? 'medium' : 'low';
        const emoji = unit.type === 'collector' ? '💵' : unit.type === 'bouncer' ? '👊' : '🕵️';

        const name = makeEl('div', 'unit-info-name', emoji + ' ' + unit.themeName);
        name.style.color = player.color;
        container.appendChild(name);

        const barWrap = makeEl('div', 'hp-bar-container');
        const bar = makeEl('div', 'hp-bar ' + hpClass);
        bar.style.width = Math.round(hpRatio * 100) + '%';
        barWrap.appendChild(bar);
        container.appendChild(barWrap);

        const movedColor = unit.hasMovedThisTurn ? '#ff6666' : '#39ff14';
        const movedText = unit.hasMovedThisTurn ? 'Már lépett' : 'Tud lépni';
        const movedSpan = '<span style="color:' + movedColor + '">' + movedText + '</span>';

        container.appendChild(makeStatRow('HP', unit.hp + ' / ' + unit.maxHp));
        container.appendChild(makeStatRow('Mozgás', unit.moveRange + ' mező'));
        container.appendChild(makeStatRow('Támadás', unit.attack));
        container.appendChild(makeStatRow('Állapot', movedSpan));
    }

    //ÉPÜLET
    function updateBuildingPanel(building) {
        if (!building) {
            updateUnitPanel(null);
            return;
        }

        const gs = window.gameState;
        const player = gs.players.find(function (p) {
            return p.id === building.ownerId;
        });

        $('#unit-info-panel').hide();
        $('#building-panel').show();

        const container = document.getElementById('building-info-content');
        container.innerHTML = '';

        const title = makeEl('div', 'unit-info-name', '🎰 Casino (' + building.x + ',' + building.y + ')');
        title.style.color = player.color;
        container.appendChild(title);
        container.appendChild(makeStatRow('Bevétel/kör', '+5💰'));
        container.appendChild(makeStatRow('Te pénzed', player.money + '💰'));
        container.appendChild(makeEl('p', 'panel-subtitle', 'Egység gyártása:'));

        var unitDefs = [
            {type: 'collector', emoji: '💵', name: 'Kasszás', cost: Units.UNIT_COSTS.collector},
            {type: 'bouncer', emoji: '👊', name: 'Bouncer', cost: Units.UNIT_COSTS.bouncer},
            {type: 'scout', emoji: '🕵️', name: 'Besúgó', cost: Units.UNIT_COSTS.scout}
        ];

        unitDefs.forEach(function (u) {
            const btn = makeEl('button', 'btn btn-manufacture');
            btn.disabled = player.money < u.cost;
            btn.dataset.type = u.type;
            btn.dataset.building = building.id;

            const costSpan = makeEl('span', 'manufacture-cost', '(' + u.cost + '💰)');
            btn.appendChild(document.createTextNode(u.emoji + ' ' + u.name + ' '));
            btn.appendChild(costSpan);
            container.appendChild(btn);
        });
    }

    //NAPLÓ
    function addLog(message, playerId) {
        const gs = window.gameState;
        if (!gs) return;
        gs.log.push({round: gs.game.round, playerId: playerId, message: message});
        const cssClass = playerId === 1 ? 'log-p1' : playerId === 2 ? 'log-p2' : '';
        const $entry = $('<div class="log-entry ' + cssClass + '">' + message + '</div>');
        $('#log-content').prepend($entry);
        $('#log-content .log-entry:gt(29)').remove();
    }

    function applyTheme(theme) {
        theme === 'day' ? $('body').addClass('theme-day') : $('body').removeClass('theme-day');
    }

    function showModal(id) {
        $('#' + id).removeClass('hidden');
    }

    function hideModal(id) {
        $('#' + id).addClass('hidden');
    }

    function hideAllModals() {
        $('.modal').addClass('hidden');
    }

    function syncSettingsUI() {
        const gs = window.gameState;
        if (!gs) return;
        $('.btn-option').removeClass('active');
        $('[data-setting="turnTimeLimit"][data-value="' + gs.config.turnTimeLimit + '"]').addClass('active');
        $('[data-setting="theme"][data-value="' + gs.config.theme + '"]').addClass('active');
        $('[data-setting="soundEnabled"][data-value="' + gs.config.soundEnabled + '"]').addClass('active');
    }

    function showGameOver(winner, p1, p2) {
        const gs = window.gameState;
        var titleText, winnerText;
        if (winner === 'draw') {
            titleText = 'Döntetlen!';
            winnerText = 'Mindkét játékos ugyanannyi pénzt gyűjtött!';
        } else {
            const w = gs.players.find(function (p) {
                return p.id === winner;
            });
            titleText = 'Győzelem!';
            winnerText = w.name + ' nyert!';
        }
        $('#gameover-title').text(titleText);
        $('#gameover-winner').text(winnerText);
        $('#gameover-stats').html(
            p1.name + ': ' + p1.money + '💰 | ' + p1.kills + ' ölés<br>' +
            p2.name + ': ' + p2.money + '💰 | ' + p2.kills + ' ölés'
        );
        showScreen('screen-gameover');
    }

    function updateMenuButtons() {
        const hasSave = Save.hasSavedGame();
        $('#btn-load-game').prop('disabled', !hasSave).css('opacity', hasSave ? '1' : '0.4');
    }

    function flashCanvas() {
        const $c = $('#game-canvas');
        $c.addClass('flash');
        setTimeout(function () {
            $c.removeClass('flash');
        }, 200);
    }

    return {
        showScreen, updateHUD, updateActivePlayer, updateTimer,
        setTimerWarning, updateActionButtons, updateUnitPanel,
        updateBuildingPanel, addLog, applyTheme, showModal,
        hideModal, hideAllModals, syncSettingsUI, showGameOver,
        updateMenuButtons, flashCanvas
    };

})();