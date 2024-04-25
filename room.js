const users = new Map();
const events = new Map();
const lastData = [];
const redoData = [];

const game = {
    player: 0
};

const emitClientEvent = (entity, eventName, value) => {
    const exec = events.get(eventName);
    if (exec) {
        const parsed = JSON.parse(value);
        exec(entity, parsed);
    }
};

Events.on('userJoin', (user) => {
    user.loadUI('paint', 'index');

    users.set(user.getPlayerId(), user);
});

Events.on('userLeave', (user) => {
    users.delete(user.getPlayerId());
});

events.set('paint-ready', (entity) => {
    if (!lastData.length) return;

    entity.sendUIMessage('drawAll', JSON.stringify({ history: lastData }));
});

events.set('paint', (entity, data) => {
    if (game.player !== entity.getPlayerId()) return;

    if (!("history" in data) || !data.history.length) return;

    lastData.push(data.history);

    users.forEach(element => {
        if (element.equals(entity)) return;

        element.sendUIMessage('draw', JSON.stringify({ history: data.history }));
    });
});

events.set('notification', (entity, data) => {
    if (!("message" in data)) return;

    data.message = data.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    entity.notification('generic', data.message || "");
});

events.set('undo', (entity, data) => {
    if (game.player !== entity.getPlayerId()) return;

    if (!lastData.length) return;

    redoData.push(lastData.pop());

    users.forEach(element => {
        if (element.equals(entity)) return;

        element.sendUIMessage('clear', "");
        element.sendUIMessage('drawAll', JSON.stringify({ history: lastData }));
    });
});

events.set('redo', (entity, data) => {
    if (game.player !== entity.getPlayerId()) return;

    if (!redoData.length) return;

    lastData.push(redoData.pop());

    users.forEach(element => {
        if (element.equals(entity)) return;

        element.sendUIMessage('clear', "");
        element.sendUIMessage('drawAll', JSON.stringify({ history: lastData }));
    });
});

Commands.register('paint', true, (user) => {
    game.player = user.getPlayerId();
    user.sendUIMessage('playing', JSON.stringify({ playing: true }));

    lastData.length = 0;

    users.forEach((u) => {
        u.sendUIMessage('clear', "");
        if (u.equals(user)) return;

        u.sendUIMessage('playing', JSON.stringify({ playing: false }));
    });
});

Events.on('uiMessage', emitClientEvent);