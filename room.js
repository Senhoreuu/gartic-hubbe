const events = new Map();

const game = {
    player: 0,
    players: new Map(),
    lastData: [],
    redoData: []
};

class Player {
    #name;
    #id;
    #points;
    #entity;

    constructor(user) {
        this.#name = user.getUsername();
        this.#id = user.getPlayerId();
        this.#points = 0;
        this.#entity = user;
    }

    getName() {
        return this.#name;
    }

    getId() {
        return this.#id;
    }

    getPoints() {
        return this.#points;
    }

    getEntity() {
        return this.#entity;
    }

    updatePoints(value) {
        this.#points += value;
    }

    equals(entity) {
        return this.#id === entity.getPlayerId();
    }

    sendUIMessage(event, value) {
        this.#entity.sendUIMessage(event, value);
    }

    notification(type, message) {
        this.#entity.notification(type, message);
    }
}

const emitClientEvent = (entity, eventName, value) => {
    const exec = events.get(eventName);
    if (exec) {
        const parsed = JSON.parse(value);
        exec(entity, parsed);
    }
};

Events.on('userJoin', (user) => {
    // if (!user.hasRank(98)) return;

    user.loadUI('paint', 'index');

    game.players.set(user.getPlayerId(), new Player(user));
});

Events.on('userLeave', (user) => {
    const id = user.getPlayerId();
    const player = game.players.get(id);

    if (!player) return;

    game.players.delete(player.getId());

    if (game.player === player.getId()) {
        game.player = 0;
        game.lastData.length = 0;
        game.redoData.length = 0;
    }

    game.players.forEach(player => {
        player.sendUIMessage('removePlayer', JSON.stringify({ player: { name: player.getName() } }));
    });
});

events.set('paint-ready', (entity) => {
    const players = [...game.players.values()].map(p => ({ name: p.getName(), points: p.getPoints() })).sort((a, b) => b.points - a.points);
    game.players.forEach(player => {
        player.sendUIMessage('addPlayers', JSON.stringify({ players }));
    });

    if (!game.lastData.length) return;

    entity.sendUIMessage('drawAll', JSON.stringify({ history: game.lastData }));
});

events.set('paint', (entity, data) => {
    if (game.player !== entity.getPlayerId()) return;

    if (!("history" in data) || !data.history.length) return;

    game.lastData.push(data.history);

    game.players.forEach(player => {
        if (player.equals(entity)) return;

        player.sendUIMessage('draw', JSON.stringify({ history: data.history }));
    });
});

events.set('notification', (entity, data) => {
    if (!("message" in data)) return;

    data.message = data.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    entity.notification('generic', data.message || "");
});

events.set('undo', (entity, data) => {
    if (game.player !== entity.getPlayerId()) return;

    if (!game.lastData.length) return;

    game.redoData.push(game.lastData.pop());

    game.players.forEach(player => {
        if (player.equals(entity)) return;

        player.sendUIMessage('clear', "");
        player.sendUIMessage('drawAll', JSON.stringify({ history: game.lastData }));
    });
});

events.set('redo', (entity, data) => {
    if (game.player !== entity.getPlayerId()) return;

    if (!game.redoData.length) return;

    game.lastData.push(game.redoData.pop());

    game.players.forEach(player => {
        if (player.equals(entity)) return;

        player.sendUIMessage('clear', "");
        player.sendUIMessage('drawAll', JSON.stringify({ history: game.lastData }));
    });
});

Commands.register('paint', true, (user) => {
    const name = user.getUsername();
    game.player = user.getPlayerId();
    user.sendUIMessage('playing', JSON.stringify({ playing: true, player: { name } }));
    game.lastData.length = 0;

    game.players.forEach((player) => {
        player.sendUIMessage('clear', "");
        if (player.equals(user)) return;

        player.sendUIMessage('playing', JSON.stringify({ playing: false, player: { name } }));
    });
});

Events.on('uiMessage', emitClientEvent);