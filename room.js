import GarticRoom from "./GarticRoom.js";
import Player from "./Player.js";
import themes from "./themes.js";
import words from "./words.js";

const events = new Map();

const garticRoom = new GarticRoom(2019);

const emitClientEvent = (entity, eventName, value) => {
    const exec = events.get(eventName);
    if (exec) {
        const parsed = JSON.parse(value);
        exec(entity, parsed);
    }
};

function getRandomTheme() {
    return themes[Math.floor(Math.random() * themes.length)];
}

function randomWord(theme) {
    if (!theme) return "";

    const wordsList = words[theme];

    if (!wordsList) return "";

    return wordsList[Math.floor(Math.random() * wordsList.length)];
}

events.set('paint-ready', (entity) => {
    if (!garticRoom.getTotalPlayers()) return;

    const name = entity.getUsername();

    const players = garticRoom.getPlayers()
        .map(p => ({ player: p, name: p.getName(), points: p.getPoints(), isPlaying: garticRoom.getCurrentPlayer() && garticRoom.getCurrentPlayer().getId() === p.getId() }))
        .sort((a, b) => b.points - a.points);

    players.forEach(data => {
        if (data.name === name) return;

        data.player.sendUIMessage('addPlayer', { player: { name, points: 0, isPlaying: false } });
    });

    if (!garticRoom.getLastData().length) return;

    entity.sendUIMessage('loadHistory', JSON.stringify({
        history: {
            history: garticRoom.getLastData(),
            theme: garticRoom.getTheme(),
            wordLength: garticRoom.getWord().length,
            players
        }
    }));
});

events.set('paint', (entity, data) => {
    if (!garticRoom.getCurrentPlayer()) return;

    if (garticRoom.getCurrentPlayer().getId() !== entity.getPlayerId()) return;

    if (!("history" in data) || !data.history.length) return;

    garticRoom.getLastData().push(data.history);

    garticRoom.getPlayers().forEach(player => {
        if (player.equals(entity)) return;

        player.sendUIMessage('draw', { history: data.history });
    });
});

events.set('notification', (entity, data) => {
    if (!("message" in data)) return;

    data.message = data.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    entity.notification('generic', data.message || "");
});

events.set('undo', (entity, data) => {
    if (!garticRoom.getCurrentPlayer()) return;

    if (garticRoom.getCurrentPlayer().getId() !== entity.getPlayerId()) return;

    if (!garticRoom.getLastData().length) return;

    garticRoom.getRedoData().push(garticRoom.getLastData().pop());

    garticRoom.getPlayers().forEach(player => {
        if (player.equals(entity)) return;

        player.sendUIMessage('clear', "");
        player.sendUIMessage('drawAll', { history: garticRoom.getLastData() });
    });
});

events.set('redo', (entity, data) => {
    if (!garticRoom.getCurrentPlayer()) return;

    if (garticRoom.getCurrentPlayer().getId() !== entity.getPlayerId()) return;

    if (!garticRoom.getRedoData().length) return;

    garticRoom.getLastData().push(garticRoom.getRedoData().pop());

    garticRoom.getPlayers().forEach(player => {
        if (player.equals(entity)) return;

        player.sendUIMessage('clear', "");
        player.sendUIMessage('drawAll', { history: garticRoom.getLastData() });
    });
});

events.set('guess', (entity, data) => {
    if (!("word" in data) || !garticRoom.getCurrentPlayer()) return;

    const player = garticRoom.getPlayer(entity);

    if (!player || garticRoom.getCurrentPlayer().getId() === player.getId()) return;

    const word = data.word;
    const correct = garticRoom.isCorrectWord(word);

    if (!correct) return;

    if (player.scored()) return;

    player.setScored(true);

    garticRoom.getCurrentPlayer().updatePoints(1);
    player.updatePoints(1);
    player.notification('generic', `Parabéns! Você acertou a palavra!`);

    garticRoom.sendUIMessage('playerScore', { player: { name: player.getName(), points: `+ ${player.getPoints()}` } });
    garticRoom.sendUIMessage('updatePlayer', { player: { name: garticRoom.getCurrentPlayer().getName(), points: `+ ${garticRoom.getCurrentPlayer().getPoints()}` } });
});

Commands.register(':start', true, (user, message) => {
    if (!user.hasRank(98)) return;

    let theme = getRandomTheme();
    let word = randomWord(theme);

    if (!garticRoom.getTotalPlayers()) {
        user.notification('generic', 'Não há jogadores suficientes para iniciar o jogo.');
        return;
    }

    while (!theme || !word) {
        theme = getRandomTheme();
        word = randomWord(theme);
    }

    garticRoom.setTheme(theme);
    garticRoom.setWord(word);

    const players = garticRoom.getPlayers().sort(() => Math.random() - 0.5);

    const player = players[0];

    garticRoom.setCurrentPlayer(player);

    player.notification('generic', `É a sua vez, ${player.getName()}!`);

    garticRoom.getPlayers().forEach(p => {
        p.sendUIMessage('start', { theme: theme, time: 0, wordLength: word.length, player: { name: player.getName() }, isPlaying: p.getId() === player.getId() });
    });

    player.sendUIMessage('setWord', { word });
});

Events.on('userJoin', (user) => {
    user.loadUI('paint', 'index');

    garticRoom.addPlayer(new Player(user));
});

Events.on('userLeave', (user) => {
    const userId = user.getPlayerId();
    const player = garticRoom.getPlayer(userId);

    if (!player) return;

    garticRoom.removePlayer(player);

    garticRoom.sendUIMessage('removePlayer', { player: { name: player.getName() } });

    if (!garticRoom.getCurrentPlayer()) return;

    if (garticRoom.getCurrentPlayer().getId() !== userId) return;

    garticRoom.setCurrentPlayer(null);
    garticRoom.clearLastData();
    garticRoom.clearRedoData();
});

Events.on('uiMessage', emitClientEvent);