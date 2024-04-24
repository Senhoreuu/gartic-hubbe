var cursorElement;
var ctx;
var currentColor = '#000000';
var currentColorBg = '#ffffff';
var currentSize = 5;
var eraser = false;
var isDrawing = false;
var lastX = 0;
var lastY = 0;
var lastHistory = null;
var historyData = [];
var undo_list = [];
var redo_list = [];
var undo_limit = 50;
var playing = false;
var ready = false;

function startDrawn() {
    if (!playing) return;
    if (ctx) {
        isDrawing = true;
        ctx.strokeStyle = currentColor;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = currentSize;

        if (eraser) {
            ctx.strokeStyle = currentColorBg;
        }

        lastHistory = {
            c: ctx.strokeStyle,
            s: ctx.lineWidth,
            a: eraser ? 'ERASER' : 'DRAW',
            data: []
        };

        undo_list.push(ctx.getImageData(0, 0, 800, 600));
        if (undo_list.length > undo_limit) {
            undo_list.shift();
        }
    }
}

function stopDrawn() {
    if (!playing) return;
    isDrawing = false;

    if (ctx) {
        if (lastHistory !== null) {
            historyData.push(lastHistory);
            lastHistory = null;
        }

        if (historyData.length > 0)
            sendDrawn(historyData);

        historyData = [];
    }
}

function addHistory(x, y, sx, sy) {
    if (!playing) return;
    if (lastHistory === null) return;
    lastHistory.data.push({ x: x, y: y, sx: sx, sy: sy });

    if (lastHistory) {
        if (lastHistory.data.length > 5) {
            sendDrawn([lastHistory]);
            lastHistory.data = [];
        }
    }
}

function draw(x, y) {
    if (!playing) return;
    if (ctx) {
        if (!isDrawing) return;

        addHistory(x, y, lastX, lastY);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();

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
}

function setEraser(val) {
    if (!playing) return;
    eraser = val;
}

function fill(color) {
    if (!playing) return;
    if (ctx) {
        var value = '';
        if (color instanceof HTMLInputElement)
            value = color.value;
        else if (color instanceof HTMLElement) {
            value = color.getAttribute('data-color') || '';
        }

        if (value !== null) {
            currentColorBg = value;
            ctx.fillStyle = value;
            undo_list.push(ctx.getImageData(0, 0, 800, 600));
            ctx.fillRect(0, 0, 800, 600);
            sendDrawn([{
                c: value, a: 'FILL'
            }]);
        }
    }
}

function redo() {
    if (!playing) return;
    if (ctx) {
        if (redo_list.length > 0) {
            console.log(redo_list);
            var redo = redo_list.pop();
            undo_list.push(ctx.getImageData(0, 0, 800, 600));
            ctx.putImageData(redo, 0, 0);
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

            switch (action) {
                case 'DRAW':
                case 'ERASER': {
                    for (let coord of data) {

                        ctx.beginPath();
                        ctx.strokeStyle = color;
                        ctx.lineWidth = size;
                        ctx.lineJoin = 'round';
                        ctx.lineCap = 'round';
                        ctx.beginPath();
                        ctx.moveTo(coord.sx, coord.sy);
                        ctx.lineTo(coord.x, coord.y);
                        ctx.stroke();

                    }
                    break;
                }

                case 'FILL': {
                    ctx.fillStyle = color;
                    ctx.fillRect(0, 0, 800, 600);
                    break;
                }

            }
        }
    }
}

function Paint(scriptName) {
    this.events = new Map();
    this.scriptName = scriptName;

    this.on = (eventName, callback) => {
        this.events.set(eventName, callback);
    };

    this.emit = event => {
        const eventData = event.detail;
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

    handler.on('drawAll', function (data) {
        for (let chunk of data.history) {
            receiveDrawn({ history: [chunk] });
        }
    });

    handler.on('playing', function (data) {
        playing = data.playing;

        if (!playing) {
            [undo_list, redo_list] = [[], []];
            historyData = [];
            setEraser(false);
        }

        pencilText.disabled = !playing;
        pencilColor.disabled = !playing;
        fillElement.disabled = !playing;
        colorsElement.disabled = !playing;
        textFill.disabled = !playing;
        colorFill.disabled = !playing;
        undoElement.disabled = !playing;
        redoElement.disabled = !playing;
        size.disabled = !playing;
        pencil.disabled = !playing;
        eraser.disabled = !playing;
    });

    cursorElement = document.getElementById('cursor');
    const canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 800, 600);
    }

    const textFill = document.querySelector('.text-fill');
    const colorFill = document.querySelector('.color-fill');

    const size = document.getElementById('size');
    size.onchange = changeSize;

    const pencil = document.getElementById('pencil');
    pencil.onclick = function () {
        setEraser(false);
    };

    const eraser = document.getElementById('eraser');
    eraser.onclick = function () {
        setEraser(true);
    };

    const pencilText = document.querySelector('.text-input');
    pencilText.addEventListener('input', function (e) {
        changeColor(this);

        pencilColor.value = this.value;
    });

    const pencilColor = document.querySelector('.color-input');
    pencilColor.addEventListener('input', function (e) {
        changeColor(this);

        pencilText.value = this.value;
    });

    const fillElement = document.getElementById('fill');
    fillElement.onclick = function (e) {
        if (!e.target.hasAttribute('data-color')) return;

        fill(e.target);

        textFill.value = e.target.getAttribute('data-color');
        colorFill.value = e.target.getAttribute('data-color');
    };

    textFill.onchange = function (e) {
        fill(this);
        colorFill.value = this.value;
    };

    colorFill.onchange = function (e) {
        fill(this);
        textFill.value = this.value;
    };

    const colorsElement = document.getElementById('colors');
    colorsElement.onclick = function (e) {
        if (!e.target.hasAttribute('data-color')) return;

        changeColor(e.target);
        pencilColor.value = e.target.getAttribute('data-color');
        pencilText.value = e.target.getAttribute('data-color');
    };

    const undoElement = document.getElementById('undo');
    undoElement.onclick = function () {
        undo();
    };

    const redoElement = document.getElementById('redo');
    redoElement.onclick = function () {
        redo();
    };

    canvas.onmousedown = function (e) {
        lastX = e.offsetX;
        lastY = e.offsetY;
        startDrawn();
        draw(lastX, lastY);
    };

    canvas.onmouseup = stopDrawn;
    canvas.onmousemove = function (e) {
        const x = e.offsetX;
        const y = e.offsetY;
        draw(x, y);
    };

    canvas.onmouseleave = stopDrawn;

    pencilText.disabled = true;
    pencilColor.disabled = true;
    fillElement.disabled = true;
    colorsElement.disabled = true;
    colorFill.disabled = true;
    textFill.disabled = true;
    undoElement.disabled = true;
    redoElement.disabled = true;
    size.disabled = true;
    pencil.disabled = true;
    eraser.disabled = true;

    $('#script-events').on('uiMessage', handler.emit);
    $('#script-events').on('dispose', handler.dispose);
    setTimeout(() => {
        ready = true;
        window.sendScriptMessage('paint-ready', {});

        document.querySelector('div[class="canvas disabled"]')?.classList.remove('disabled');
    }, 3000);

    $(".container-canvas").draggable({ scroll: false, handle: ".toolbar" });
})();
