const Units = (function () {

    const UNIT_COSTS = {collector: 10, bouncer: 20, scout: 12};
    const UNIT_NAMES = {collector: 'Kasszás', bouncer: 'Bouncer', scout: 'Besúgó'};
    const UNIT_STATS = {
        collector: {hp: 3, maxHp: 3, moveRange: 4, attack: 1},
        bouncer: {hp: 5, maxHp: 5, moveRange: 3, attack: 3},
        scout: {hp: 2, maxHp: 2, moveRange: 5, attack: 1}
    };

    function createInitialUnits() {
        return [
            {
                id: 'u1', ownerId: 1, type: 'collector', themeName: 'Kasszás',
                x: 0, y: 0, hp: 3, maxHp: 3, moveRange: 4, attack: 1, hasMovedThisTurn: false
            },
            {
                id: 'u2', ownerId: 1, type: 'bouncer', themeName: 'Bouncer',
                x: 1, y: 0, hp: 5, maxHp: 5, moveRange: 3, attack: 3, hasMovedThisTurn: false
            },
            {
                id: 'u3', ownerId: 1, type: 'scout', themeName: 'Besúgó',
                x: 0, y: 1, hp: 2, maxHp: 2, moveRange: 5, attack: 1, hasMovedThisTurn: false
            },
            {
                id: 'u4', ownerId: 2, type: 'collector', themeName: 'Kasszás',
                x: 9, y: 9, hp: 3, maxHp: 3, moveRange: 4, attack: 1, hasMovedThisTurn: false
            },
            {
                id: 'u5', ownerId: 2, type: 'bouncer', themeName: 'Bouncer',
                x: 8, y: 9, hp: 5, maxHp: 5, moveRange: 3, attack: 3, hasMovedThisTurn: false
            },
            {
                id: 'u6', ownerId: 2, type: 'scout', themeName: 'Besúgó',
                x: 9, y: 8, hp: 2, maxHp: 2, moveRange: 5, attack: 1, hasMovedThisTurn: false
            }
        ];
    }

    function selectUnit(unitId) {
        const gs = window.gameState;
        const unit = gs.units.find(function (u) {
            return u.id === unitId;
        });
        if (!unit) return false;
        if (unit.ownerId !== gs.game.currentPlayerId) return false;
        if (unit.hasMovedThisTurn) {
            UI.addLog('Ez az egység már lépett ebben a körben!', gs.game.currentPlayerId);
            return false;
        }
        gs.game.selectedUnitId = unitId;
        gs.game.selectedBuildingId = null;
        return true;
    }

    function selectBuilding(buildingId) {
        const gs = window.gameState;
        const building = gs.buildings.find(function (b) {
            return b.id === buildingId;
        });
        if (!building || building.ownerId !== gs.game.currentPlayerId) return false;
        gs.game.selectedBuildingId = buildingId;
        gs.game.selectedUnitId = null;
        return true;
    }

    function clearSelection() {
        if (window.gameState) {
            window.gameState.game.selectedUnitId = null;
            window.gameState.game.selectedBuildingId = null;
        }
    }
// [MOZGAS] moveUnit()
    function moveUnit(unitId, targetX, targetY) {
        const gs = window.gameState;
        const unit = gs.units.find(function (u) {
            return u.id === unitId;
        });
        if (!unit || unit.hasMovedThisTurn) return 'invalid';

        const reachable = Map.getReachableTiles(unit);
        const canReach = reachable.some(function (t) {
            return t.x === targetX && t.y === targetY;
        });
        if (!canReach) return 'invalid';

        const enemy = gs.units.find(function (u) {
            return u.x === targetX && u.y === targetY && u.ownerId !== unit.ownerId;
        });
        if (enemy) return fight(unit, enemy);

        const ownBuilding = gs.buildings.find(function (b) {
            return b.x === targetX && b.y === targetY && b.ownerId === unit.ownerId;
        });
        if (ownBuilding) return 'invalid';

        unit.x = targetX;
        unit.y = targetY;
        unit.hasMovedThisTurn = true;
        gs.game.selectedUnitId = null;

        const tile = gs.map[targetY][targetX];
        if (tile.type === 'money') return collect(unit, tile);

        const enemyBuilding = gs.buildings.find(function (b) {
            return b.x === targetX && b.y === targetY && b.ownerId !== unit.ownerId;
        });
        if (enemyBuilding) return robCasino(unit, enemyBuilding);

        UI.addLog(unit.themeName + ' lépett (' + targetX + ',' + targetY + ')', unit.ownerId);
        return 'moved';
    }
// [HARC] fight() + killUnit()
    function fight(attacker, defender) {
        const gs = window.gameState;
        defender.hp -= attacker.attack;
        UI.addLog(attacker.themeName + ' megtámadta: ' + defender.themeName +
            ' (-' + attacker.attack + ' HP)', attacker.ownerId);
        if (defender.hp <= 0) killUnit(defender, attacker.ownerId);
        attacker.hasMovedThisTurn = true;
        gs.game.selectedUnitId = null;
        Audio.play('hit');
        return 'fought';
    }

    function killUnit(unit, killerPlayerId) {
        const gs = window.gameState;
        const idx = gs.units.indexOf(unit);
        if (idx !== -1) gs.units.splice(idx, 1);
        const killer = gs.players.find(function (p) {
            return p.id === killerPlayerId;
        });
        if (killer) killer.kills++;
        UI.addLog('💀 ' + unit.themeName + ' meghalt!', killerPlayerId);
    }
// [PENZ-BEGYUJTES] collect()
    function collect(unit, tile) {
        const gs = window.gameState;
        const player = gs.players.find(function (p) {
            return p.id === unit.ownerId;
        });
        const amount = unit.type === 'collector' ? tile.moneyValue * 2 : tile.moneyValue;
        player.money += amount;
        tile.type = 'empty';
        tile.moneyValue = 0;
        UI.addLog(unit.themeName + ' begyűjtött ' + amount + '💰 pénzt!', unit.ownerId);
        Audio.play('collect');
        return 'collected';
    }
// [CASINO-RABLAS] robCasino()
    function robCasino(unit, building) {
        const gs = window.gameState;
        const robAmount = 5;
        const victim = gs.players.find(function (p) {
            return p.id === building.ownerId;
        });
        const robber = gs.players.find(function (p) {
            return p.id === unit.ownerId;
        });
        const actual = Math.min(robAmount, victim.money);
        victim.money -= actual;
        robber.money += actual;
        UI.addLog(unit.themeName + ' kirabolta az ellenfél casinóját! (+' + actual + '💰)', unit.ownerId);
        Audio.play('collect');
        return 'robbed';
    }
// [CASINO-EPITES] buildCasino()
    function buildCasino(playerId, x, y) {
        const gs = window.gameState;
        const player = gs.players.find(function (p) {
            return p.id === playerId;
        });
        if (player.money < 20) {
            UI.addLog('Nincs elég pénz! (kell: 20💰)', playerId);
            return false;
        }
        const tile = gs.map[y][x];
        if (tile.type !== 'empty') {
            UI.addLog('Ez a mező nem szabad!', playerId);
            return false;
        }
        if (gs.units.some(function (u) {
            return u.x === x && u.y === y;
        })) {
            UI.addLog('Egy egység áll a mezőn!', playerId);
            return false;
        }
        const buildingId = 'b' + Date.now();
        gs.buildings.push({
            id: buildingId, ownerId: playerId, x: x, y: y,
            type: 'casino', incomePerRound: 5
        });
        tile.type = 'building';
        tile.buildingId = buildingId;
        player.money -= 20;
        UI.addLog('🎰 Casino épült (' + x + ',' + y + ')! (-20💰)', playerId);
        return true;
    }
// [GYARTAS] manufactureUnit()
    function manufactureUnit(playerId, unitType, buildingId) {
        const gs = window.gameState;
        const player = gs.players.find(function (p) {
            return p.id === playerId;
        });
        const building = gs.buildings.find(function (b) {
            return b.id === buildingId;
        });

        if (!building || building.ownerId !== playerId) return false;
        const cost = UNIT_COSTS[unitType];
        if (!cost) return false;

        if (player.money < cost) {
            UI.addLog('Nincs elég pénz! (kell: ' + cost + '💰)', playerId);
            return false;
        }

        const freePos = findAdjacentFreeTile(building.x, building.y);
        if (!freePos) {
            UI.addLog('Nincs szabad szomszédos mező a casino körül!', playerId);
            return false;
        }

        const stats = UNIT_STATS[unitType];
        const unitId = 'u' + Date.now();
        gs.units.push({
            id: unitId, ownerId: playerId,
            type: unitType, themeName: UNIT_NAMES[unitType],
            x: freePos.x, y: freePos.y,
            hp: stats.hp, maxHp: stats.maxHp,
            moveRange: stats.moveRange, attack: stats.attack,
            hasMovedThisTurn: true
        });

        player.money -= cost;
        UI.addLog('🏭 ' + UNIT_NAMES[unitType] + ' legyártva! (-' + cost + '💰)', playerId);
        Audio.play('collect');
        return true;
    }

    function findAdjacentFreeTile(x, y) {
        const gs = window.gameState;
        const dirs = [{dx: 0, dy: -1}, {dx: 1, dy: 0}, {dx: 0, dy: 1}, {dx: -1, dy: 0}];
        for (var i = 0; i < dirs.length; i++) {
            var nx = x + dirs[i].dx, ny = y + dirs[i].dy;
            if (nx < 0 || nx >= 10 || ny < 0 || ny >= 10) continue;
            if (gs.map[ny][nx].type !== 'empty') continue;
            if (gs.units.some(function (u) {
                return u.x === nx && u.y === ny;
            })) continue;
            return {x: nx, y: ny};
        }
        return null;
    }
// [PENZ-BEGYUJTES] collect()
    function collectBuildingIncome() {
        const gs = window.gameState;
        gs.buildings.forEach(function (building) {
            const player = gs.players.find(function (p) {
                return p.id === building.ownerId;
            });
            if (player) {
                player.money += building.incomePerRound;
                UI.addLog('🎰 Casino bevétel: +' + building.incomePerRound + '💰', building.ownerId);
            }
        });
    }

    function resetMovement() {
        window.gameState.units.forEach(function (unit) {
            unit.hasMovedThisTurn = false;
        });
    }

    function hasUnits(playerId) {
        return window.gameState.units.some(function (u) {
            return u.ownerId === playerId;
        });
    }

    return {
        UNIT_COSTS: UNIT_COSTS,
        UNIT_NAMES: UNIT_NAMES,
        createInitialUnits: createInitialUnits,
        selectUnit: selectUnit,
        selectBuilding: selectBuilding,
        clearSelection: clearSelection,
        moveUnit: moveUnit,
        buildCasino: buildCasino,
        manufactureUnit: manufactureUnit,
        collectBuildingIncome: collectBuildingIncome,
        resetMovement: resetMovement,
        hasUnits: hasUnits
    };

})();