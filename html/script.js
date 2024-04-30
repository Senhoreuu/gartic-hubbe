(async () => {
    let cursorElement;
    const canvas = document.getElementById('canvas');
    const canvasOverlay = document.getElementById('canvas-overlay');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const ctxOverlay = canvasOverlay.getContext('2d', { willReadFrequently: true });
    let currentColor = '#000000';
    let currentSize = 5;
    let action = "DRAW";
    let shape = "NORMAL";
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;
    let lastHistory = null;
    const historyData = [];
    const undo_list = [];
    const redo_list = [];
    const undo_limit = 50;
    let playing = false;
    let ready = true;
    let pencilColor = null;
    let colorsElement = null;
    let undoElement = null;
    let redoElement = null;
    let size = null;
    let pencil = null;
    let eraser = null;
    let bucket = null;
    let save = null;
    let lineJoin = 'round';
    let lineCap = 'round';
    const colors = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#c0c0c0', '#808080'];

    function loadColors() {
        colors.forEach(color => {
            const div = document.createElement('div');
            div.classList.add('color');
            div.style.background = color;
            div.setAttribute('data-color', color);

            colorsElement.appendChild(div);
        });
    }

    function loadTools() {
        const tools = [
            { id: 'pencil', icon: ['fas', 'fa-pencil-alt'] },
            { id: 'eraser', icon: ['fas', 'fa-eraser'] },
            { id: 'bucket', icon: ['fas', 'fa-fill-drip'] },
            { id: 'line', icon: ['fas', 'fa-minus'] },
            { id: 'square-regular', icon: ['fa-regular', 'fa-square'] },
            { id: 'square-solid', icon: ['fa-solid', 'fa-square'] },
            { id: 'circle-regular', icon: ['fa-regular', 'fa-circle'] },
            { id: 'circle-solid', icon: ['fa-solid', 'fa-circle'] },
            { id: 'clear', icon: ['fas', 'fa-trash-alt'] },
            { id: 'save', icon: ['fas', 'fa-download'] },
            { id: 'size', icon: null, input: true, type: 'range', min: 1, max: 50, value: 5 },
            { id: 'undo', icon: ['fas', 'fa-undo'] },
            { id: 'redo', icon: ['fas', 'fa-redo'] }
        ];

        const toolbar = document.querySelector('.tools-gartic .toolbar .toolbar__item');

        tools.forEach(tool => {
            const a = document.createElement('a');
            a.classList.add('toolbar__button');

            if (tool.icon) {
                a.id = tool.id;

                const i = document.createElement('i');

                i.classList.add(...tool.icon);

                a.appendChild(i);
            }
            else if (tool.input) {
                const input = document.createElement('input');
                input.id = tool.id;
                input.type = tool.type;
                input.min = tool.min;
                input.max = tool.max;
                input.value = tool.value;

                a.appendChild(input);
            }

            toolbar.appendChild(a);
        });

        pencilColor = document.querySelector('.color-input');
        colorsElement = document.querySelector('#colors');
        undoElement = document.querySelector('#undo');
        redoElement = document.querySelector('#redo');
        size = document.querySelector('#size');
        pencil = document.querySelector('#pencil');
        eraser = document.querySelector('#eraser');
        bucket = document.querySelector('#bucket');
        save = document.querySelector('#save');
    }

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
                    ctx.arc(startX, startY, Math.sqrt(Math.pow(endX, 2) - Math.pow(endY, 2)), 0, 2 * Math.PI);
                    ctx.stroke();
                    break;

                case 'CIRCLE_SOLID':
                    ctx.beginPath();
                    ctx.arc(startX, startY, Math.sqrt(Math.pow(endX, 2) - Math.pow(endY, 2)), 0, 2 * Math.PI);
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

            historyData.length = 0;

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
                    ctxOverlay.arc(startX, startY, Math.sqrt(Math.pow(x - startX, 2) - Math.pow(y - startY, 2)), 0, 2 * Math.PI);
                    ctxOverlay.stroke();

                    break;
                }

                case 'CIRCLE_SOLID': {
                    ctxOverlay.beginPath();
                    ctxOverlay.arc(startX, startY, Math.sqrt(Math.pow(x - startX, 2) - Math.pow(y - startY, 2)), 0, 2 * Math.PI);
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
        shape = 'NORMAL';
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

        historyData.length = 0;
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
                                    ctx.arc(coord.sx, coord.sy, Math.sqrt(Math.pow(coord.x, 2) - Math.pow(coord.y, 2)), 0, 2 * Math.PI);
                                    ctx.stroke();
                                    break;
                                }

                                case 'CIRCLE_SOLID': {
                                    ctx.fillStyle = color;
                                    ctx.beginPath();
                                    ctx.arc(coord.sx, coord.sy, Math.sqrt(Math.pow(coord.x, 2) - Math.pow(coord.y, 2)), 0, 2 * Math.PI);
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
        if (!playing || shape !== "NORMAL" || !["DRAW", "ERASER"].includes(action)) {
            cursor.style.display = 'none';
            return;
        }

        cursor.style.width = currentSize + 'px';
        cursor.style.height = currentSize + 'px';
        cursor.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';

        const {
            top,
            left,
        } = document.querySelector('.container-canvas').getBoundingClientRect() || { top: 0, left: 0 };

        const {
            clientY,
            clientX
        } = event instanceof TouchEvent ? event.touches[0] : event;

        cursor.style.top = `${clientY - top - currentSize / 2}px`;
        cursor.style.left = `${clientX - left - currentSize / 2}px`;

        if (!action === 'ERASER') {
            cursor.style.backgroundColor = currentColor;
        }
    }

    function updateRecentColors(event) {
        if (!playing) return;

        const recentColors = document.getElementById('recentColors');

        const childrens = recentColors.children;

        const color = event instanceof HTMLInputElement ? event.value : event.target.getAttribute('data-color');

        if (color === null) return;

        if ([...childrens].find(child => child.getAttribute('data-color') === color)) return;

        for (let i = childrens.length - 1; i > 0; i--) {
            childrens[i].setAttribute('data-color', childrens[i - 1].getAttribute('data-color'));
            childrens[i].style.backgroundColor = childrens[i - 1].style.backgroundColor;
        }

        childrens[0].setAttribute('data-color', color);
        childrens[0].style.backgroundColor = color;
    }

    function removeCursor() {
        cursorElement.style.display = 'none';
    }

    function showHint(data) {
        $('.hint').remove();

        const controller = data.isPlaying;
        const wordLength = data.wordLength;

        const div = document.createElement('div');
        div.classList.add('hint');
        div.style.left = controller ? "40%" : '48%';

        if (!controller) {
            div.classList.add('hidden');
        }

        if (controller) {
            const btnHint = document.createElement('input');
            btnHint.type = 'button';
            btnHint.classList.add('btn', 'btn-gartic');
            btnHint.value = 'DICA';
            btnHint.id = 'hint';

            div.appendChild(btnHint);
        }

        const divTexts = document.createElement('div');
        divTexts.classList.add('hint-texts');

        if (!controller) {
            const divTitle = document.createElement('div');
            divTitle.classList.add('hint-title');
            divTitle.textContent = 'Dica';

            divTexts.appendChild(divTitle);
        }

        const divText = document.createElement('div');
        divText.classList.add('hint-text');

        if (controller) {
            divText.textContent = Array(wordLength).fill('_').join(' ');
        }

        divTexts.appendChild(divText);

        div.appendChild(divTexts);

        if (controller) {
            const btnSkip = document.createElement('input');
            btnSkip.type = 'button';
            btnSkip.classList.add('btn', 'btn-gartic');
            btnSkip.value = 'PULAR';
            btnSkip.id = 'skip';

            div.appendChild(btnSkip);
        }

        document.querySelector('.canvas-container').appendChild(div);

        if (controller) {
            $('#hint').on('click', function () {
                if (!playing) return;

                window.sendScriptMessage('hint', {});
            });

            $("#hint").on('touchstart', function () {
                if (!playing) return;

                window.sendScriptMessage('hint', {});
            })

            $('#skip').on('click', function () {
                if (!playing) return;

                window.sendScriptMessage('skip', {});
            });

            $("#skip").on('touchstart', function () {
                if (!playing) return;

                window.sendScriptMessage('skip', {});
            });
        }
    }

    function startTimer(data) {
        if (!("time" in data)) return;

        $('.timer-container').css('display', 'flex');

        const ms = data.time * 1000;

        $('.timer_progress').css('transition', `width ${ms}ms linear`);
    }

    function addDenounce(data) {
        $('.denounce').remove();

        const controller = data === "true" ? true : false;

        if (controller) return;

        const div = document.createElement('div');
        div.classList.add('denounce');

        const i = document.createElement('i');
        i.classList.add('fa-solid', 'fa-flag');

        div.appendChild(i);

        document.querySelector('.canvas-container').appendChild(div);

        $(div).on('click', function () {
            if (controller) return;

            window.sendScriptMessage('denounce', {});
        });
    }


    function changePermission(disabled) {
        pencilColor.disabled = disabled;
        colorsElement.disabled = disabled;
        undoElement.disabled = disabled;
        redoElement.disabled = disabled;
        size.disabled = disabled;
        pencil.disabled = disabled;
        eraser.disabled = disabled;
        bucket.disabled = disabled;

        if (disabled) {
            $(".canvas-container").removeClass('cursor-crosshair');
        }
        else {
            $(".canvas-container").addClass('cursor-crosshair');
        }
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

        eraser.ontouchstart = function () {
            setEraser(true);

            shape = 'NORMAL';
        };

        pencilColor.addEventListener('change', function (e) {
            if (!playing) return;

            changeColor(this);

            updateRecentColors(e);
        });

        function colorsElementClick(e) {
            if (!playing) return;
            if (!e.target.hasAttribute('data-color')) return;

            changeColor(e.target);
            updateRecentColors(e);
        }

        colorsElement.onclick = colorsElementClick;
        colorsElement.ontouchstart = colorsElementClick;

        undoElement.onclick = undo;
        undoElement.ontouchstart = undo;

        redoElement.onclick = redo;
        redoElement.ontouchstart = redo;

        function canvasOverlayMouseDown(e) {
            if (!playing) return;

            lastX = e.offsetX || e.touches[0].clientX;
            lastY = e.offsetY || e.touches[0].clientY;
            startX = lastX;
            startY = lastY;

            startDrawn();
            draw(lastX, lastY);
            updateCursor(cursorElement, e);
        };

        canvasOverlay.onmousedown = canvasOverlayMouseDown;
        canvasOverlay.ontouchstart = canvasOverlayMouseDown;

        canvasOverlay.onmouseup = stopDrawn;
        canvasOverlay.ontouchend = stopDrawn;

        function canvasOverlayMouseMove(e) {
            if (!playing) return;

            const x = e.offsetX || e.touches[0].clientX;
            const y = e.offsetY || e.touches[0].clientY;
            draw(x, y);
            updateCursor(cursorElement, e);
        }

        canvasOverlay.onmousemove = canvasOverlayMouseMove;
        canvasOverlay.ontouchmove = canvasOverlayMouseMove;

        canvasOverlay.onmouseover = function (e) {
            if (!playing) return;

            cursorElement.style.display = 'block';
        };

        canvasOverlay.ontouchstart = function (e) {
            if (!playing) return;

            cursorElement.style.display = 'block';
        };

        canvasOverlay.onmouseleave = function (e) {
            cursorElement.style.display = 'none';
            stopDrawn(e);
        };

        canvasOverlay.ontouchend = function (e) {
            cursorElement.style.display = 'none';
            stopDrawn(e);
        };

        function canvasOverlayClick(e) {
            if (!playing) return;

            if (action === 'BUCKET') {
                undo_list.push(ctx.getImageData(0, 0, 800, 600));
                if (undo_list.length > undo_limit) {
                    undo_list.shift();
                }

                const x = e.offsetX || e.touches[0].clientX;
                const y = e.offsetY || e.touches[0].clientY;

                floodFill(x, y, color_to_rgba(currentColor));

                sendDrawn([{
                    c: currentColor,
                    s: 0,
                    a: 'BUCKET',
                    data: [{ x, y }]
                }]);
            }
        }

        canvasOverlay.onclick = canvasOverlayClick;
        canvasOverlay.ontouchstart = canvasOverlayClick;

        changePermission(true);

        function bucketClick() {
            if (!playing) return;
            action = 'BUCKET';
            shape = 'NORMAL';
        }

        $('#bucket').on('click', bucketClick);
        $('#bucket').on('touchstart', bucketClick);

        function pencilClick() {
            if (!playing) return;
            setEraser(false);
        }

        pencil.onclick = pencilClick;
        pencil.ontouchstart = pencilClick;

        function lineClick() {
            if (!playing) return;
            shape = 'LINE';
            action = 'DRAW';
        }

        $('#line').on('click', lineClick);
        $('#line').on('touchstart', lineClick);

        function squareRegularClick() {
            if (!playing) return;
            shape = 'SQUARE';
            action = 'DRAW';
        }

        $('#square-regular').on('click', squareRegularClick);
        $('#square-regular').on('touchstart', squareRegularClick);

        function squareSolidClick() {
            if (!playing) return;
            shape = 'SQUARE_SOLID';
            action = 'DRAW';
        }

        $('#square-solid').on('click', squareSolidClick);
        $('#square-solid').on('touchstart', squareSolidClick);

        function circleRegularClick() {
            if (!playing) return;
            shape = 'CIRCLE';
            action = 'DRAW';
        }

        $('#circle-regular').on('click', circleRegularClick);
        $('#circle-regular').on('touchstart', circleRegularClick);

        function circleSolidClick() {
            if (!playing) return;
            shape = 'CIRCLE_SOLID';
            action = 'DRAW';
        }

        $('#circle-solid').on('click', circleSolidClick);
        $('#circle-solid').on('touchstart', circleSolidClick);

        function clearButtonClick() {
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
        }

        $('#clear').on('click', clearButtonClick);
        $('#clear').on('touchstart', clearButtonClick);

        function recentColorsClick(e) {
            if (!playing) return;
            if (!e.target.hasAttribute('data-color')) return;
            changeColor(e.target);
        }

        $('#recentColors').on('click', recentColorsClick);
        $('#recentColors').on('touchstart', recentColorsClick);

        save.onclick = downloadCanvas;
        save.ontouchstart = downloadCanvas;
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

            undo_list.length = 0;
            redo_list.length = 0;
            historyData.length = 0;
        }
    }

    function clearAll() {
        clearCanvas();
    }

    function playerPlaying(data) {
        playing = data.playing;

        if (!playing) {
            undo_list.length = 0;
            redo_list.length = 0;
            historyData.length = 0;
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

    function playerTurn(data) {
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

    async function addPlayer(data) {
        if (!("player" in data)) return;

        if (document.querySelector('.players').querySelector(`[data-player="${data.player.name}"]`)) {
            updatePlayer(data);
            return;
        }

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

        await new Promise(resolve => {
            img.onload = function () {
                document.querySelector('.players').appendChild(playerCard);
                resolve();
            }
        });
    }

    async function addPlayers(data) {
        if (!("players" in data)) return;

        const players = data.players;

        for await (const player of players) {
            await addPlayer({ player });
        }
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
    }

    function playerScored(data) {
        if (!("player" in data)) return;

        const player = data.player;

        const playerCard = document.querySelector('.players').querySelector(`[data-player="${player.name}"]`);

        if (!playerCard) return;

        playerCard.classList.add('scored');

        playerCard.querySelector('span:last-child').textContent = `${player.points} pontos`;
    }

    function undoCanvas(data) {
        if (ctx && "undo" in data) {
            ctx.putImageData(data.undo, 0, 0);
        }
    }

    function redoCanvas(data) {
        if (ctx && "redo" in data) {
            ctx.putImageData(data.redo, 0, 0);
        }
    }

    function downloadCanvas() {
        const a = document.createElement('a');
        a.href = canvas.toDataURL();

        const playerCard = document.querySelector('.players').querySelector('.player-card.playing');

        if (playerCard) {
            const name = playerCard.querySelector('span')?.textContent;
            a.download = name ? `${name}_gartic.png` : 'hubbe_gartic.png';
        } else {
            a.download = 'hubbe_gartic.png';
        }

        a.click();
    }

    function start(data) {
        if (!("time" in data)) return;
        if (!("player" in data)) return;
        if (!("isPlaying" in data)) return;

        $('#gartic-words').css('display', 'none');
        $('#gartic-notification').css('display', 'none');

        clearAll();

        $('#time').text(data.time);

        ready = true;

        playerPlaying({ playing: data.isPlaying, player: data.player });

        document.querySelector('.players').querySelectorAll('.player-card').forEach(element => {
            element.classList.remove('scored');
        });
    }

    function loadChat(data) {
        if (!("messages" in data)) return;

        const messages = data.messages;

        for (const message of messages) {
            receiveMessage({ message });
        }
    }

    async function loadHistory(data) {
        if (!("history" in data)) return;

        const historyData = data.history;

        if (historyData.data.length)
            drawAll({ history: historyData.data });

        await addPlayers({ players: historyData.players });

        const player = historyData.players.find(player => player.isPlaying);

        if (player)
            playerPlaying({ playing: historyData.isPlaying, player });

        loadChat({ messages: historyData.chat });
    }

    async function loadRoom(data) {
        if (!("room" in data)) return;

        const room = data.room;

        const roomElement = document.createElement('div');
        roomElement.classList.add('room');

        const theme = document.createElement('div');
        theme.classList.add('room-theme');

        const name = document.createElement('div');
        name.classList.add('room-name');

        const infosRoom = document.createElement('div');
        infosRoom.classList.add('infosRoom');

        theme.textContent = 'Tema';
        name.textContent = room.theme;

        infosRoom.innerHTML = `<div class="users-quantity"><i class="fa-regular fa-user"></i><span class="room-players">${room.totalPlayers}/${room.maxPlayers}</span></div>`;
        infosRoom.innerHTML += `<div class=""><i class="fa-solid fa-trophy"></i><span class="points">${room.points}/${room.maxPoints}</span></div>`;

        roomElement.appendChild(theme);
        roomElement.appendChild(name);
        roomElement.appendChild(infosRoom);

        function joinRoom() {
            if (room.totalPlayers === room.maxPlayers) return;

            if (!roomElement.classList.contains('selected')) {
                const rooms = document.querySelectorAll('.room');

                rooms.forEach(element => {
                    element.classList.remove('selected');
                });

                roomElement.classList.add('selected');
                return;
            }

            window.sendScriptMessage('join', { room: room.id });

            $(".gartic-menu").addClass('hidden');
            $("#rooms").addClass('hidden');
            $('.container-canvas').css('display', 'flex');
        }

        function leaveRoom() {
            roomElement.classList.remove('selected');

            $(".gartic-menu").removeClass('hidden');
            $("#rooms").removeClass('hidden');
            $('.container-canvas').css('display', 'none');
        }

        function updateRoom(newData) {
            if (!("room" in newData)) return;

            const newRoom = newData.room;

            infosRoom.innerHTML = `<div class="users-quantity"><i class="fa-regular fa-user"></i><span class="room-players">${newRoom.totalPlayers}/${newRoom.maxPlayers}</span></div>`;
            infosRoom.innerHTML += `<div class=""><i class="fa-solid fa-trophy"></i><span class="points">${newRoom.points}/${newRoom.maxPoints}</span></div>`;

            roomElement.removeEventListener('click', joinRoom);

            if (newRoom.totalPlayers === newRoom.maxPlayers) {
                roomElement.classList.add('full');
                return;
            }

            roomElement.classList.remove('full');
            roomElement.addEventListener('click', joinRoom);
        }

        function disposeRoom() {
            roomElement.remove();

            paintHandler.off(`updateRoom-${room.id}`);
            paintHandler.off(`disposeRoom-${room.id}`);
        }

        roomElement.addEventListener('click', joinRoom);

        paintHandler.on(`disposeRoom-${room.id}`, disposeRoom);
        paintHandler.on(`updateRoom-${room.id}`, updateRoom);
        paintHandler.on(`leaveRoom-${room.id}`, leaveRoom);

        $('#rooms').append(roomElement);
    }

    async function loadRooms(data) {
        if (!("rooms" in data)) return;

        if (data.rooms.length)
            $('#rooms').empty();

        $(".gartic-menu").removeClass('hidden');

        const rooms = data.rooms;

        for (const room of rooms) {
            loadRoom({ room });
        }

        $("#rooms").removeClass('hidden');
    }

    function receiveMessage(data) {
        if (!("message" in data)) return;

        const chat = document.querySelector('.chat-messages');

        const message = document.createElement('div');
        message.classList.add('chat-message');

        const text = document.createElement('div');
        text.classList.add('chat-message__text');

        text.innerHTML = data.message;

        message.appendChild(text);

        chat.insertBefore(message, chat.firstChild);

        if (chat.children.length > 50) {
            chat.removeChild(chat.lastChild);
        }
    }

    function chooseWords(data) {
        if (!("words" in data)) return;

        const words = data.words;

        $('span[data-word="1"]').text(words[0]);
        $('span[data-word="2"]').text(words[1]);

        $('#gartic-words').css('display', 'flex');
    }

    function Paint(scriptName) {
        this.events = new Map();
        this.scriptName = scriptName;

        this.on = (eventName, callback) => {
            this.events.set(eventName, callback);
        };

        this.off = (eventName) => {
            this.events.delete(eventName);
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

    const paintHandler = new Paint('paint');

    (() => {
        loadTools();
        loadColors();
        createCanvasEvents();

        paintHandler.on('draw', receiveDrawn);
        paintHandler.on('drawAll', drawAll);
        paintHandler.on('clear', clearAll);
        paintHandler.on('playing', playerPlaying);
        paintHandler.on('addPlayer', addPlayer);
        paintHandler.on('addPlayers', addPlayers);
        paintHandler.on('playerTurn', playerTurn);
        paintHandler.on('updatePlayer', updatePlayer);
        paintHandler.on('removePlayer', removePlayer);
        paintHandler.on('playerScore', playerScored);
        paintHandler.on('undo', undoCanvas);
        paintHandler.on('redo', redoCanvas);
        paintHandler.on('start', start);
        paintHandler.on('loadHistory', loadHistory);
        paintHandler.on('loadRooms', loadRooms);
        paintHandler.on('message', receiveMessage);
        paintHandler.on('chooseWord', chooseWords);
        paintHandler.on('addDenounce', addDenounce);
        paintHandler.on('showHint', showHint);
        paintHandler.on('startTimer', startTimer);

        $('#script-events').on('uiMessage', paintHandler.emit);
        $('#script-events').on('dispose', paintHandler.dispose);

        const canvasGame = document.querySelector(".canvas-game").style.height;
        const scoreboard = document.querySelector(".scoreboard");
        const toolsGartic = document.querySelector(".tools-gartic");
        const eyedropper = document.querySelector('.eyedropper');
        const colorpicker = document.querySelector('#colorpicker');

        eyedropper.addEventListener('click', () => {
            colorpicker.click();
        });

        scoreboard.style.maxHeight = canvasGame;
        toolsGartic.style.maxHeight = canvasGame;

        $('#send-guess').on('click', function () {
            const guess = $('#guess-text').val();

            if (!guess || !guess.length) return;

            window.sendScriptMessage('guess', { word: guess });

            $('#guess-text').val('');
        });

        document.querySelector("#leave").addEventListener('click', function (e) {
            e.preventDefault();

            const target = e.target;

            const text = target.innerText;

            if (text === 'Abandonar Partida') {
                $("#leave").html('Confirmar <i class="fa-solid fa-arrow-right-from-bracket"></i>');
                $("#leave").addClass('confirm');
                return;
            }

            window.sendScriptMessage('leave', {});
            $("#leave").html('Abandonar Partida <i class="fa-solid fa-arrow-right-from-bracket"></i>');
            $("#leave").removeClass('confirm');
            clearAll();
            $('#guess-text').val('');
            $("#players").empty();
            changePermission(true);
            $(".container-canvas").hide();

            loadRooms({ rooms: [] });
        });

        $("button").on('click', function () {
            const data = $(this).data('word');

            if (!data) return;

            window.sendScriptMessage('choose-word', { index: data });

            $('#gartic-words').hide();
        });

        window.sendScriptMessage('paint-ready', {});

        $(".container-canvas").draggable({ scroll: false, handle: ".cursor-move" });
    })();
})();