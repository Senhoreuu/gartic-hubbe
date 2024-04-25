var cursorElement;
var ctx;
var currentColor = '#000000';
var currentSize = 5;
var action = "DRAW";
var users = [];
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
var pencilText = document.querySelector('.text-input');
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
var canvas = document.getElementById('canvas');

function startDrawn() {
    if (!playing || !ctx) return;

    if (action === 'BUCKET') return;

    if (ctx) {
        isDrawing = true;
        ctx.strokeStyle = currentColor;
        ctx.lineJoin = lineJoin;
        ctx.lineCap = lineCap;
        ctx.lineWidth = currentSize;

        if (action === 'ERASER') {
            ctx.strokeStyle = currentColorBg;
        }

        lastHistory = {
            c: ctx.strokeStyle,
            s: ctx.lineWidth,
            a: action,
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

                case 'BUCKET': {
                    floodFill(data[0].x, data[0].y, color_to_rgba(color));
                    break;
                }

            }
        }
    }
}

function createCursor(cursor, event) {
    if (!playing) {
        cursor.style.display = 'none';
        return;
    }

    cursor.style.width = currentSize + 'px';
    cursor.style.height = currentSize + 'px';
    cursor.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';

    cursor.style.left = (event.pageX - currentSize / 2) + 'px';
    cursor.style.top = (event.pageY - currentSize / 2) + 'px';

    if (!action === 'ERASER') {
        cursor.style.backgroundColor = currentColor;
    }
}

function removeCursor() {
    cursorElement.style.display = 'none';
}

function changePermission(disabled) {
    pencilText.disabled = disabled;
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

    ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 800, 600);
    }

    size.onchange = changeSize;

    pencil.onclick = function () {
        setEraser(false);
    };

    eraser.onclick = function () {
        setEraser(true);
    };

    pencilText.addEventListener('input', function (e) {
        changeColor(this);

        pencilColor.value = this.value;
    });

    pencilColor.addEventListener('input', function (e) {
        if (!playing) return;

        changeColor(this);

        pencilText.value = this.value;
    });

    colorsElement.onclick = function (e) {
        if (!playing) return;
        if (!e.target.hasAttribute('data-color')) return;

        changeColor(e.target);
        pencilColor.value = e.target.getAttribute('data-color');
        pencilText.value = e.target.getAttribute('data-color');
    };

    undoElement.onclick = undo;

    redoElement.onclick = redo;

    canvas.onmousedown = function (e) {
        if (!playing) return;

        lastX = e.offsetX;
        lastY = e.offsetY;
        startDrawn();
        draw(lastX, lastY);
        createCursor(cursorElement, e);
    };

    canvas.onmouseup = stopDrawn;

    canvas.onmousemove = function (e) {
        if (!playing) return;

        const x = e.offsetX;
        const y = e.offsetY;
        draw(x, y);
        createCursor(cursorElement, e);
    };

    canvas.onmouseover = function (e) {
        cursorElement.style.display = 'block';
    };

    canvas.onmouseleave = function (e) {
        cursorElement.style.display = 'none';
        stopDrawn();
    };

    canvas.onclick = function (e) {
        if (!playing) return;

        if (action === 'BUCKET') {
            undo_list.push(ctx.getImageData(0, 0, 800, 600));
            if (undo_list.length > undo_limit) {
                undo_list.shift();
            }

            floodFill(e.offsetX, e.offsetY, color_to_rgba(currentColor));

            sendDrawn([{
                c: bucketColor,
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
    });
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

    handler.on('drawAll', function (data) {
        for (const chunk of data.history) {
            receiveDrawn({ history: chunk });
        }
    });

    handler.on('clear', function (data) {
        if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 800, 600);

            undo_list = [];
            redo_list = [];
            historyData = [];
        }
    });

    handler.on('playing', function (data) {
        playing = data.playing;

        if (!playing) {
            [undo_list, redo_list] = [[], []];
            historyData = [];
            setEraser(false);
            removeCursor();
        }

        changePermission(!playing);
    });

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

    setTimeout(() => {
        ready = true;
        window.sendScriptMessage('paint-ready', {});

        document.querySelector('div[class="canvas disabled"]')?.classList.remove('disabled');
    }, 3000);

    $(".container-canvas").draggable({ scroll: false, handle: ".cursor-move" });
})();
