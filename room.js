const users = new Map();
const events = new Map();
let lastData = [];

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

    entity.sendUIMessage('drawAll', JSON.stringify({ history: [...lastData] }));
});

events.set('paint', (entity, data) => {
    if (game.player !== entity.getPlayerId()) return;

    if (!("history" in data) || !data.history.length) return;

    users.forEach(element => {
        if (element.equals(entity)) return;

        element.sendUIMessage('draw', JSON.stringify({ history: data.history }));
    });

    lastData.push(data.history);
});

Commands.register('paint', true, (user) => {
    game.player = user.getPlayerId();
    user.sendUIMessage('playing', JSON.stringify({ playing: true }));

    users.forEach((u) => {
        if (u.equals(user)) return;

        u.sendUIMessage('playing', JSON.stringify({ playing: false }));
    });
});

Events.on('uiMessage', emitClientEvent);