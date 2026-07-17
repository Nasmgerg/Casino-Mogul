const Map = (function () {

    //  Konstansok
    const GRID_SIZE = 10;
    const TILE_SIZE = 64;
    const MONEY_COUNT = 5;


    let canvas = null;
    let ctx = null;


    let images = {};

    let hoverX = -1;
    let hoverY = -1;

    // INICIALIZÁLÁS
    function init(canvasElement, loadedImages) {
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        images = loadedImages;
        canvas.width = GRID_SIZE * TILE_SIZE;
        canvas.height = GRID_SIZE * TILE_SIZE;
    }

    //TÉRKÉP GENERÁLÁS
    function generateMap() {
        const map = [];
        for (let y = 0; y < GRID_SIZE; y++) {
            map[y] = [];
            for (let x = 0; x < GRID_SIZE; x++) {
                map[y][x] = {
                    x: x,
                    y: y,
                    type: 'empty',
                    moneyValue: 0,
                    buildingId: null
                };
            }
        }


        const forbidden = [
            '0,0', '1,0', '0,1',
            '9,9', '8,9', '9,8'
        ];

        let placed = 0;
        let attempts = 0;
        while (placed < MONEY_COUNT && attempts < 200) {
            attempts++;
            const rx = Math.floor(Math.random() * GRID_SIZE);
            const ry = Math.floor(Math.random() * GRID_SIZE);
            const key = rx + ',' + ry;

            if (!forbidden.includes(key) && map[ry][rx].type === 'empty') {
                map[ry][rx].type = 'money';
                map[ry][rx].moneyValue = 10;
                placed++;
            }
        }

        return map;
    }


    //ELÉRHETŐ MEZŐK KISZÁMÍTÁSA
    // Visszaadja azokat a (x,y) pozíciókat, ahova a kijelölt egység léphet
    function getReachableTiles(unit) {
        if (!unit) return [];

        const reachable = [];
        const range = unit.moveRange;

        for (let dy = -range; dy <= range; dy++) {
            for (let dx = -range; dx <= range; dx++) {
                // Manhattan-távolság alapú mozgás (nem átlós)
                if (Math.abs(dx) + Math.abs(dy) > range) continue;
                if (dx === 0 && dy === 0) continue;

                const nx = unit.x + dx;
                const ny = unit.y + dy;


                if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
                const blocked = window.gameState.units.some(function (u) {
                    return u.x === nx && u.y === ny && u.ownerId === unit.ownerId;
                });
                if (blocked) continue;

                reachable.push({x: nx, y: ny});
            }
        }
        return reachable;
    }

    // CANVAS TELJES ÚJRARAJZOLÁSA
    function render() {
        if (!ctx || !window.gameState) return;

        const gs = window.gameState;

        // 1. Tile-ok rajzolása
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                drawTile(x, y, gs.map[y][x]);
            }
        }

        // 2. Elérhető mezők kiemelése
        if (gs.game.selectedUnitId) {
            const selectedUnit = gs.units.find(function (u) {
                return u.id === gs.game.selectedUnitId;
            });
            if (selectedUnit && !selectedUnit.hasMovedThisTurn) {
                const reachable = getReachableTiles(selectedUnit);
                reachable.forEach(function (tile) {
                    drawReachableHighlight(tile.x, tile.y);
                });
            }
        }

        // 3. Épületek rajzolása
        gs.buildings.forEach(function (building) {
            drawBuilding(building);
        });

        // 4. Egységek rajzolása
        gs.units.forEach(function (unit) {
            drawUnit(unit);
        });

        // 5. Kijelölt egység kiemelése
        if (gs.game.selectedUnitId) {
            const sel = gs.units.find(function (u) {
                return u.id === gs.game.selectedUnitId;
            });
            if (sel) drawSelectedHighlight(sel.x, sel.y);
        }

        // 6. Hover kiemelése
        if (hoverX >= 0 && hoverY >= 0) {
            drawHoverHighlight(hoverX, hoverY);
        }
    }

    // EGY TILE RAJZOLÁSA
    function drawTile(x, y, tile) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;


        const isNight = window.gameState.config.theme === 'night';
        ctx.fillStyle = isNight ? '#1a2a1a' : '#2d5a27';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);


        ctx.strokeStyle = isNight ? '#1a3a16' : '#245020';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);


        if (tile.type === 'money') {

            ctx.fillStyle = 'rgba(60, 50, 0, 0.6)';
            ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);


            if (images.moneyBag) {

                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.drawImage(images.moneyBag, px + 8, py + 8, TILE_SIZE - 16, TILE_SIZE - 16);
                ctx.restore();
            } else {

                ctx.font = '32px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('💰', px + TILE_SIZE / 2, py + TILE_SIZE / 2);
            }
        }
    }

    // ÉPÜLET RAJZOLÁSA
    function drawBuilding(building) {
        const px = building.x * TILE_SIZE;
        const py = building.y * TILE_SIZE;


        const player = window.gameState.players.find(function (p) {
            return p.id === building.ownerId;
        });
        const color = player ? player.color : '#888';


        ctx.fillStyle = color + '33';
        ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);


        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);


        if (images.slotMachine) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(images.slotMachine, px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12);
            ctx.restore();
        } else {
            ctx.font = '28px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🎰', px + TILE_SIZE / 2, py + TILE_SIZE / 2);
        }


        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px + TILE_SIZE - 8, py + 8, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    //  EGYSÉG RAJZOLÁSA
    function drawUnit(unit) {
        const px = unit.x * TILE_SIZE;
        const py = unit.y * TILE_SIZE;

        const player = window.gameState.players.find(function (p) {
            return p.id === unit.ownerId;
        });
        const color = player ? player.color : '#888';


        ctx.fillStyle = color + '44';
        ctx.beginPath();
        ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE / 2 - 4, 0, Math.PI * 2);
        ctx.fill();


        let img = null;
        if (unit.type === 'collector') img = images.charCollector;
        if (unit.type === 'bouncer') img = images.charBouncer;
        if (unit.type === 'scout') img = images.charScout;

        if (img) {
            ctx.drawImage(img, px + 8, py + 6, TILE_SIZE - 16, TILE_SIZE - 16);
        } else {
            // Fallback emoji
            const emoji = unit.type === 'collector' ? '💵' :
                unit.type === 'bouncer' ? '👊' : '🕵️';
            ctx.font = '28px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, px + TILE_SIZE / 2, py + TILE_SIZE / 2);
        }


        ctx.fillStyle = color;
        ctx.fillRect(px + 8, py + 4, TILE_SIZE - 16, 3);

        // HP bar
        drawHpBar(px, py, unit);


        if (unit.hasMovedThisTurn) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
    }

    // HP BAR RAJZOLÁSA
    function drawHpBar(px, py, unit) {
        const barW = TILE_SIZE - 12;
        const barH = 5;
        const barX = px + 6;
        const barY = py + TILE_SIZE - 10;
        const ratio = unit.hp / unit.maxHp;


        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(barX, barY, barW, barH);

        // HP szín: zöld / narancs / piros
        ctx.fillStyle = ratio > 0.6 ? '#39ff14' :
            ratio > 0.3 ? '#ff8800' : '#ff2d78';
        ctx.fillRect(barX, barY, Math.round(barW * ratio), barH);
    }

    //KIEMELÉSEK
    function drawHoverHighlight(x, y) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.18)';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    function drawSelectedHighlight(x, y) {
        ctx.strokeStyle = '#00cfff';
        ctx.lineWidth = 3;
        ctx.strokeRect(
            x * TILE_SIZE + 2,
            y * TILE_SIZE + 2,
            TILE_SIZE - 4,
            TILE_SIZE - 4
        );
    }

    function drawReachableHighlight(x, y) {
        ctx.fillStyle = 'rgba(57, 255, 20, 0.18)';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        ctx.strokeStyle = 'rgba(57, 255, 20, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    // EGÉR KOORDINÁTA
    function pixelToGrid(px, py) {
        return {
            x: Math.floor(px / TILE_SIZE),
            y: Math.floor(py / TILE_SIZE)
        };
    }


    function setHover(x, y) {
        hoverX = x;
        hoverY = y;
    }

    function clearHover() {
        hoverX = -1;
        hoverY = -1;
    }


    function getUnitAt(x, y) {
        return window.gameState.units.find(function (u) {
            return u.x === x && u.y === y;
        }) || null;
    }


    return {
        GRID_SIZE: GRID_SIZE,
        TILE_SIZE: TILE_SIZE,
        init: init,
        generateMap: generateMap,
        render: render,
        getReachableTiles: getReachableTiles,
        pixelToGrid: pixelToGrid,
        setHover: setHover,
        clearHover: clearHover,
        getUnitAt: getUnitAt
    };

})();