var cursorElement;
var canvas = document.getElementById('canvas');
var canvasOverlay = document.getElementById('canvas-overlay');
var ctx = canvas.getContext('2d', { willReadFrequently: true });
var ctxOverlay = canvasOverlay.getContext('2d', { willReadFrequently: true });
var currentColor = '#000000';
var currentSize = 5;
var action = "DRAW";
var shape = "NORMAL";
var users = [];
var isDrawing = false;
var lastX = 0;
var lastY = 0;
var startX = 0;
var startY = 0;
var endX = 0;
var endY = 0;
var lastHistory = null;
var historyData = [];
var undo_list = [];
var redo_list = [];
var undo_limit = 50;
var playing = false;
var ready = true;
var pencilColor = document.querySelector('.color-input');
var colorsElement = document.getElementById('colors');
var undoElement = document.getElementById('undo');
var redoElement = document.getElementById('redo');
var size = document.getElementById('size');
var pencil = document.getElementById('pencil');
var eraser = document.getElementById('eraser');
var bucket = document.querySelector('#bucket');
var lineJoin = 'round';
var lineCap = 'round';

function startDrawn() {
    if (!playing || !ctx) return;

    if (action === 'BUCKET') return;

    if (ctx) {
        isDrawing = true;

        switch (shape) {
            case 'LINE':
                lineJoin = 'round';
                lineCap = 'round';
                break;

            case 'SQUARE':
                lineJoin = 'miter';
                lineCap = 'butt';
                break;

            case 'NORMAL':
            case 'CIRCLE':
                lineJoin = 'round';
                lineCap = 'round';
                break;
        }

        ctx.strokeStyle = currentColor;
        ctx.lineJoin = lineJoin;
        ctx.lineCap = lineCap;
        ctx.lineWidth = currentSize;
        ctx.fillStyle = currentColor;
        ctxOverlay.strokeStyle = currentColor;
        ctxOverlay.lineJoin = lineJoin;
        ctxOverlay.lineCap = lineCap;
        ctxOverlay.lineWidth = currentSize;
        ctxOverlay.fillStyle = currentColor;

        if (action === 'ERASER') {
            ctx.strokeStyle = '#ffffff';
            ctxOverlay.strokeStyle = '#ffffff';
        }

        lastHistory = {
            c: ctx.strokeStyle,
            s: ctx.lineWidth,
            a: action,
            data: [],
            shape
        };

        undo_list.push(ctx.getImageData(0, 0, 800, 600));
        if (undo_list.length > undo_limit) {
            undo_list.shift();
        }
    }
}

function stopDrawn(event) {
    if (!playing) return;

    isDrawing = false;

    if (ctx) {
        switch (shape) {
            case 'LINE':
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(lastX, lastY);
                ctx.stroke();
                break;

            case 'SQUARE':
                ctx.beginPath();
                ctx.strokeRect(startX, startY, endX, endY);
                break;

            case 'SQUARE_SOLID':
                ctx.beginPath();
                ctx.fillRect(startX, startY, endX, endY);
                break;

            case 'CIRCLE':
                ctx.beginPath();
                ctx.arc(startX, startY, Math.sqrt(Math.pow(endX, 2) + Math.pow(endY, 2)), 0, 2 * Math.PI);
                ctx.stroke();
                break;

            case 'CIRCLE_SOLID':
                ctx.beginPath();
                ctx.arc(startX, startY, Math.sqrt(Math.pow(endX, 2) + Math.pow(endY, 2)), 0, 2 * Math.PI);
                ctx.fill();
                break;
        }

        if (['SQUARE', 'SQUARE_SOLID', 'CIRCLE', 'CIRCLE_SOLID'].includes(shape)) {
            addHistory(endX, endY, startX, startY);
        }
        else if (shape === 'LINE') {
            addHistory(lastX, lastY, startX, startY);
        }

        if (lastHistory !== null) {
            historyData.push(lastHistory);
            lastHistory = null;
        }

        if (historyData.length > 0)
            sendDrawn(historyData);

        historyData = [];

        ctxOverlay.clearRect(0, 0, 800, 600);
    }
}

function floodFill(x, y, color) {
    pixel_stack = [{ x: x, y: y }];
    pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var linear_cords = (y * canvas.width + x) * 4;
    original_color = {
        r: pixels.data[linear_cords],
        g: pixels.data[linear_cords + 1],
        b: pixels.data[linear_cords + 2],
        a: pixels.data[linear_cords + 3]
    };

    if (color.r === original_color.r && color.g === original_color.g &&
        color.b === original_color.b && color.a === original_color.a) {
        return;
    }


    while (pixel_stack.length > 0) {
        new_pixel = pixel_stack.shift();
        x = new_pixel.x;
        y = new_pixel.y;

        linear_cords = (y * canvas.width + x) * 4;
        while (y-- >= 0 &&
            (pixels.data[linear_cords] == original_color.r &&
                pixels.data[linear_cords + 1] == original_color.g &&
                pixels.data[linear_cords + 2] == original_color.b &&
                pixels.data[linear_cords + 3] == original_color.a)) {
            linear_cords -= canvas.width * 4;
        }
        linear_cords += canvas.width * 4;
        y++;

        var reached_left = false;
        var reached_right = false;
        while (y++ < canvas.height &&
            (pixels.data[linear_cords] == original_color.r &&
                pixels.data[linear_cords + 1] == original_color.g &&
                pixels.data[linear_cords + 2] == original_color.b &&
                pixels.data[linear_cords + 3] == original_color.a)) {
            pixels.data[linear_cords] = color.r;
            pixels.data[linear_cords + 1] = color.g;
            pixels.data[linear_cords + 2] = color.b;
            pixels.data[linear_cords + 3] = color.a;

            if (x > 0) {
                if (pixels.data[linear_cords - 4] == original_color.r &&
                    pixels.data[linear_cords - 4 + 1] == original_color.g &&
                    pixels.data[linear_cords - 4 + 2] == original_color.b &&
                    pixels.data[linear_cords - 4 + 3] == original_color.a) {
                    if (!reached_left) {
                        pixel_stack.push({ x: x - 1, y: y });
                        reached_left = true;
                    }
                } else if (reached_left) {
                    reached_left = false;
                }
            }

            if (x < canvas.width - 1) {
                if (pixels.data[linear_cords + 4] == original_color.r &&
                    pixels.data[linear_cords + 4 + 1] == original_color.g &&
                    pixels.data[linear_cords + 4 + 2] == original_color.b &&
                    pixels.data[linear_cords + 4 + 3] == original_color.a) {
                    if (!reached_right) {
                        pixel_stack.push({ x: x + 1, y: y });
                        reached_right = true;
                    }
                } else if (reached_right) {
                    reached_right = false;
                }
            }

            linear_cords += canvas.width * 4;
        }
    }
    ctx.putImageData(pixels, 0, 0);
}

function is_in_pixel_stack(x, y, pixel_stack) {
    for (var i = 0; i < pixel_stack.length; i++) {
        if (pixel_stack[i].x == x && pixel_stack[i].y == y) {
            return true;
        }
    }
    return false;
}

function color_to_rgba(color) {
    if (color[0] == "#") {
        color = color.replace("#", "");
        var bigint = parseInt(color, 16);
        var r = (bigint >> 16) & 255;
        var g = (bigint >> 8) & 255;
        var b = bigint & 255;
        return {
            r: r,
            g: g,
            b: b,
            a: 255
        };
    } else if (color.indexOf("rgba(") == 0) {
        color = color.replace("rgba(", "").replace(" ", "").replace(")", "").split(",");
        return {
            r: color[0],
            g: color[1],
            b: color[2],
            a: color[3] * 255
        };
    } else {
        console.error("warning: can't convert color to rgba: " + color);
        return {
            r: 0,
            g: 0,
            b: 0,
            a: 0
        };
    }
}

function addHistory(x, y, sx, sy) {
    if (!playing) return;

    if (lastHistory === null) return;

    lastHistory.data.push({ x: x, y: y, sx: sx, sy: sy });
}

function draw(x, y) {
    if (!playing) return;

    if (ctx) {
        if (!isDrawing) return;

        ctxOverlay.clearRect(0, 0, 800, 600);

        switch (shape) {
            case 'LINE': {
                ctxOverlay.beginPath();
                ctxOverlay.moveTo(startX, startY);
                ctxOverlay.lineTo(x, y);
                ctxOverlay.stroke();

                break;
            }

            case 'SQUARE': {
                ctxOverlay.beginPath();
                ctxOverlay.strokeRect(startX, startY, x - startX, y - startY);
                break;
            }

            case 'SQUARE_SOLID': {
                ctxOverlay.beginPath();
                ctxOverlay.fillRect(startX, startY, x - startX, y - startY);

                break;
            }

            case 'CIRCLE': {
                ctxOverlay.beginPath();
                ctxOverlay.arc(startX, startY, Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2)), 0, 2 * Math.PI);
                ctxOverlay.stroke();

                break;
            }

            case 'CIRCLE_SOLID': {
                ctxOverlay.beginPath();
                ctxOverlay.arc(startX, startY, Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2)), 0, 2 * Math.PI);
                ctxOverlay.fill();

                break;
            }

            default: {
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
                addHistory(x, y, lastX, lastY);
            }
        }

        endX = x - startX;
        endY = y - startY;
        lastX = x;
        lastY = y;
    }
}

function changeColor(color) {
    if (!playing) return;

    var value = '';
    if (color instanceof HTMLInputElement)
        value = color.value;
    else if (color instanceof HTMLElement)
        value = color.getAttribute('data-color') || '';

    if (value !== null) {
        currentColor = value;
        eraser = false;
    }

    pencilColor.value = currentColor;
}

function setEraser(val) {
    if (!playing) return;

    action = val ? 'ERASER' : 'DRAW';
}

function redo() {
    if (!playing) return;

    if (ctx) {
        if (redo_list.length > 0) {
            var redo = redo_list.pop();
            undo_list.push(ctx.getImageData(0, 0, 800, 600));
            ctx.putImageData(redo, 0, 0);

            window.sendScriptMessage('redo', "");
        }
    }
}

function undo() {
    if (!playing) return;

    if (ctx) {
        if (undo_list.length > 0) {
            var undo = undo_list.pop();
            redo_list.push(ctx.getImageData(0, 0, 800, 600));
            ctx.putImageData(undo, 0, 0);

            window.sendScriptMessage('undo', "");
        }
    }
}

function changeSize(event) {
    if (!playing) return;

    if (ctx) {
        var element = event.target;
        if (element instanceof HTMLInputElement) {
            currentSize = parseInt(element.value);
        }
    }
}

function sendDrawn(data) {
    if (!playing) return;

    window.sendScriptMessage('paint', { history: data });

    historyData = [];
}

function receiveDrawn(data) {
    if (!ready || data === null || !("history" in data)) return;

    if (data.history.length > 0 && ctx !== undefined) {
        for (let chunk of data.history) {
            let action = chunk.a;
            let color = chunk.c;
            let size = chunk.s;
            let data = chunk.data;
            let shape = chunk.shape;

            switch (action) {
                case 'DRAW':
                case 'ERASER': {
                    for (let coord of data) {

                        switch (shape) {
                            case 'LINE': {
                                ctx.strokeStyle = color;
                                ctx.lineWidth = size;
                                ctx.lineJoin = 'round';
                                ctx.lineCap = 'round';
                                ctx.beginPath();
                                ctx.moveTo(coord.sx, coord.sy);
                                ctx.lineTo(coord.x, coord.y);
                                ctx.stroke();
                                break;
                            }

                            case 'SQUARE': {
                                ctx.strokeStyle = color;
                                ctx.lineWidth = size;
                                ctx.lineJoin = 'miter';
                                ctx.lineCap = 'butt';
                                ctx.beginPath();
                                ctx.strokeRect(coord.sx, coord.sy, coord.x, coord.y);
                                break;
                            }

                            case 'SQUARE_SOLID': {
                                ctx.fillStyle = color;
                                ctx.beginPath();
                                ctx.fillRect(coord.sx, coord.sy, coord.x, coord.y);
                                break;
                            }

                            case 'CIRCLE': {
                                ctx.strokeStyle = color;
                                ctx.lineWidth = size;
                                ctx.lineJoin = 'round';
                                ctx.lineCap = 'round';
                                ctx.beginPath();
                                ctx.arc(coord.sx, coord.sy, Math.sqrt(Math.pow(coord.x, 2) + Math.pow(coord.y, 2)), 0, 2 * Math.PI);
                                ctx.stroke();
                                break;
                            }

                            case 'CIRCLE_SOLID': {
                                ctx.fillStyle = color;
                                ctx.beginPath();
                                ctx.arc(coord.sx, coord.sy, Math.sqrt(Math.pow(coord.x, 2) + Math.pow(coord.y, 2)), 0, 2 * Math.PI);
                                ctx.fill();
                                break;
                            }

                            default: {
                                ctx.strokeStyle = color;
                                ctx.lineWidth = size;
                                ctx.lineJoin = 'round';
                                ctx.lineCap = 'round';
                                ctx.beginPath();
                                ctx.moveTo(coord.sx, coord.sy);
                                ctx.lineTo(coord.x, coord.y);
                                ctx.stroke();
                            }
                        }

                    }
                    break;
                }

                case 'FILL': {
                    ctx.fillStyle = color;
                    ctx.fillRect(0, 0, 800, 600);
                    break;
                }

                case 'BUCKET': {
                    floodFill(data[0].x, data[0].y, color_to_rgba(color));
                    break;
                }

            }
        }
    }
}

function updateCursor(cursor, event) {
    if (!playing) {
        cursor.style.display = 'none';
        return;
    }

    cursor.style.width = currentSize + 'px';
    cursor.style.height = currentSize + 'px';
    cursor.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';

    const {
        top,
        left,
    } = document.querySelector('.container-canvas').getBoundingClientRect();

    const {
        clientY,
        clientX
    } = event;

    cursor.style.top = `${clientY - top - currentSize / 2}px`;
    cursor.style.left = `${clientX - left - currentSize / 2}px`;

    if (!action === 'ERASER') {
        cursor.style.backgroundColor = currentColor;
    }
}

function removeCursor() {
    cursorElement.style.display = 'none';
}

function changePermission(disabled) {
    pencilColor.disabled = disabled;
    colorsElement.disabled = disabled;
    undoElement.disabled = disabled;
    redoElement.disabled = disabled;
    size.disabled = disabled;
    pencil.disabled = disabled;
    eraser.disabled = disabled;
}

function createCanvasEvents() {
    cursorElement = document.getElementById('cursor');

    if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 800, 600);
    }

    size.onchange = changeSize;

    eraser.onclick = function () {
        setEraser(true);

        shape = 'NORMAL';
    };

    pencilColor.addEventListener('input', function (e) {
        if (!playing) return;

        changeColor(this);
    });

    colorsElement.onclick = function (e) {
        if (!playing) return;
        if (!e.target.hasAttribute('data-color')) return;

        changeColor(e.target);
    };

    undoElement.onclick = undo;

    redoElement.onclick = redo;

    canvasOverlay.onmousedown = function (e) {
        if (!playing) return;

        lastX = e.offsetX;
        lastY = e.offsetY;
        startX = lastX;
        startY = lastY;

        startDrawn();
        draw(lastX, lastY);
        updateCursor(cursorElement, e);
    };

    canvasOverlay.onmouseup = stopDrawn;

    canvasOverlay.onmousemove = function (e) {
        if (!playing) return;

        const x = e.offsetX;
        const y = e.offsetY;
        draw(x, y);
        updateCursor(cursorElement, e);
    };

    canvasOverlay.onmouseover = function (e) {
        if (!playing) return;

        cursorElement.style.display = 'block';
    };

    canvasOverlay.onmouseleave = function (e) {
        cursorElement.style.display = 'none';
        stopDrawn(e);
    };

    canvasOverlay.onclick = function (e) {
        if (!playing) return;

        if (action === 'BUCKET') {
            undo_list.push(ctx.getImageData(0, 0, 800, 600));
            if (undo_list.length > undo_limit) {
                undo_list.shift();
            }

            floodFill(e.offsetX, e.offsetY, color_to_rgba(currentColor));

            sendDrawn([{
                c: currentColor,
                s: 0,
                a: 'BUCKET',
                data: [{ x: e.offsetX, y: e.offsetY }]
            }]);
        }
    };

    changePermission(true);

    $('#bucket').on('click', function () {
        if (!playing) return;

        action = 'BUCKET';
        shape = 'NORMAL';
    });

    pencil.onclick = function () {
        if (!playing) return;

        action = 'DRAW';
        shape = 'NORMAL';

        setEraser(false);
    };

    $('#line').on('click', function () {
        if (!playing) return;

        shape = 'LINE';
    });

    $('#square-regular').on('click', function () {
        if (!playing) return;

        shape = 'SQUARE';
    });

    $('#square-solid').on('click', function () {
        if (!playing) return;

        shape = 'SQUARE_SOLID';
    });

    $('#circle-regular').on('click', function () {
        if (!playing) return;

        shape = 'CIRCLE';
    });

    $('#circle-solid').on('click', function () {
        if (!playing) return;

        shape = 'CIRCLE_SOLID';
    });

    $('#clear').on('click', function () {
        if (!playing) return;

        shape = 'NORMAL';
        action = 'DRAW';

        clearCanvas();
        sendDrawn([
            {
                c: '#ffffff',
                s: 0,
                a: 'FILL',
                data: []
            }
        ]);
    });
}

function drawAll(data) {
    for (const chunk of data.history) {
        receiveDrawn({ history: chunk });
    }
}

function clearCanvas() {
    if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 800, 600);

        undo_list = [];
        redo_list = [];
        historyData = [];
    }
}

function playerPlaying(data) {
    playing = data.playing;

    if (!playing) {
        [undo_list, redo_list] = [[], []];
        historyData = [];
        setEraser(false);
        removeCursor();
    }

    changePermission(!playing);

    if (!("player" in data)) return;

    const player = data.player;

    const playerCard = document.querySelector('.players').querySelector(`[data-player="${player.name}"]`);

    if (!playerCard) return;

    const players = document.querySelector('.players').querySelectorAll('.player-card');

    players.forEach(element => {
        element.classList.remove('playing');
    });

    playerCard.classList.add('playing');
}

function addPlayer(data) {
    if (!("player" in data)) return;

    if (users.find(userData => userData.name === data.player.name)) {
        updatePlayer(data);
        return;
    }

    users.push(data.player);

    const playerCard = document.createElement('div');
    playerCard.classList.add('player-card');

    const img = document.createElement('img');
    img.src = `https://hubbe.biz/avatar/${data.player.name}?headonly=1`;

    const spans = document.createElement('div');
    spans.classList.add('spans-card');

    const name = document.createElement('span');
    name.textContent = data.player.name;

    const points = document.createElement('span');
    points.textContent = `${data.player.points} pontos`;

    playerCard.dataset.player = data.player.name;

    spans.appendChild(name);
    spans.appendChild(points);

    playerCard.appendChild(img);
    playerCard.appendChild(spans);

    img.onload = function () {
        document.querySelector('.players').appendChild(playerCard);
    }
}

function addPlayers(data) {
    if (!("players" in data)) return;

    const players = data.players;

    players.forEach(player => {
        addPlayer({ player });
    });

}

function updatePlayer(data) {
    if (!("player" in data)) return;

    const player = data.player;

    const playerCard = document.querySelector('.players').querySelector(`[data-player="${player.name}"]`);

    if (!playerCard) return;

    const spans = playerCard.querySelector('.spans-card');

    const name = spans.querySelector('span');
    const points = spans.querySelector('span:last-child');

    name.textContent = player.name;
    points.textContent = `${player.points} pontos`;
}

function removePlayer(data) {
    if (!("player" in data)) return;

    const player = data.player;

    const playerCard = document.querySelector('.players').querySelector(`[data-player="${player.name}"]`);

    if (!playerCard) return;

    playerCard.remove();

    users = users.filter(user => user.name !== player.name);
}

function updatePlayerScore(data) {
    if (!("player" in data)) return;

    const player = data.player;

    const playerCard = document.querySelector('.players').querySelector(`[data-player="${player.name}"]`);

    if (!playerCard) return;

    playerCard.classList.add('scored');
}

function Paint(scriptName) {
    this.events = new Map();
    this.scriptName = scriptName;

    this.on = (eventName, callback) => {
        this.events.set(eventName, callback);
    };

    this.emit = event => {
        const eventData = event.detail;

        if (!eventData) return;

        const value = eventData.data;
        const exec = this.events.get(eventData.name);
        let data = value;

        if (data !== '' && data.startsWith('{') && data.endsWith('}') || data.startsWith('[') && data.endsWith(']')) {
            try {
                data = JSON.parse(data);
            } catch (e) {
                return;
            }
        }

        if (exec) {
            exec(data);
        }
    };

    this.dispose = (event) => {
        if (!event) return;

        const data = event.detail;

        const exec = this.events.get('dispose');

        if (exec) {
            exec();
        }

        if (data.allScripts || data.scriptName === this.scriptName) {
            this.events.clear();

            $('#script-events').off('uiMessage', this.emit);
            $('#script-events').off('dispose', this.dispose);
        }
    };
}

(() => {
    const handler = new Paint('paint');

    handler.on('draw', receiveDrawn);
    handler.on('drawAll', drawAll);
    handler.on('clear', clearCanvas);
    handler.on('playing', playerPlaying);
    handler.on('addPlayer', addPlayer);
    handler.on('addPlayers', addPlayers);
    handler.on('updatePlayer', updatePlayer);
    handler.on('removePlayer', removePlayer);
    handler.on('playerScore', updatePlayerScore);

    handler.on('undo', function (data) {
        if (ctx && "undo" in data) {
            ctx.putImageData(data.undo, 0, 0);
        }
    });

    handler.on('redo', function (data) {
        if (ctx && "redo" in data) {
            ctx.putImageData(data.redo, 0, 0);
        }
    });

    createCanvasEvents();

    $('#script-events').on('uiMessage', handler.emit);
    $('#script-events').on('dispose', handler.dispose);
    $('.scoreboard').css({"maxHeight": `${canvas.height}px` });

    window.sendScriptMessage('paint-ready', {});

    $(".container-canvas").draggable({ scroll: false, handle: ".cursor-move" });
})();
