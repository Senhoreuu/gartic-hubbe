import GarticRoom from "./GarticRoom.js";
import Player from "./Player.js";
import EventMap from "./EventMap.js";
import themes from "./themes.js";
import words from "./words.js";
import game from "./game.js";

const events = new EventMap();

const garticRoom = new GarticRoom(2019);
garticRoom.setTheme("Animais");
game.rooms.set(garticRoom.getId(), garticRoom);

/**
 * @param {ScriptEntity} entity
 * @param {GarticRoom} room
 */
const start = (room) => {
    const totalPlayers = room.getTotalPlayers();
    if (totalPlayers < 2) {
        room.notification('generic', 'Não há jogadores suficientes para iniciar o jogo.');
        return;
    }

    const player = room.getRandomPlayer();

    room.setCurrentPlayer(player);

    player.notification('generic', `É a sua vez, ${player.getName()}!`);

    player.sendUIMessage('chooseWord', { words: randomWords(garticRoom) });
    room.sendUIMessage('playerTurn', { player: { name: player.getName() } });

    room.startTime();
};

/**
 * @param {GarticRoom} room 
 */
const startRound = (room) => {
    room.setRound(room.getRound() + 1);
    start(room);
};

/**
 * @param {GarticRoom} room 
 */
const endRound = (room) => {
    room.getPlayers().forEach(player => {
        player.setScored(false);
    });

    startRound(room);
};

/**
 * @param {ScriptEntity} entity
 */
const hint = (entity) => {
    const room = getRoom(entity);

    if (!room || !room.getCurrentPlayer()) return;

    const player = room.getPlayer(entity);

    if (!player || room.getCurrentPlayer().getId() !== player.getId()) return;

    if (room.getHints() >= room.getMaxHints()) return;

    room.addRandomHint();
};

/**
 * @param {ScriptEntity} entity
 */
const skip = (entity) => {
    const room = getRoom(entity);

    if (!room || !room.getCurrentPlayer()) return;

    const player = room.getPlayer(entity);

    if (!player || room.getCurrentPlayer().getId() !== player.getId()) return;

    if (room.getTotalPlayers() === 1) {
        entity.notification('generic', 'Não há jogadores suficientes para pular a vez.');
        return;
    }

    const message = `<font color="#0000ff"><i class="fa-solid fa-circle-exclamation"></i> <b>${player.getName()}</b> pulou a vez</font>`;

    room.sendUIMessage('message', { message });

    room.addCustomMessage(message);

    endRound(room);
};

/**
 * @param {ScriptEntity} entity
 */
const denounce = (entity) => {
    const room = getRoom(entity);

    if (!room || !room.getCurrentPlayer()) return;

    const player = room.getPlayer(entity);

    if (!player || room.getCurrentPlayer().getId() === player.getId()) return;

    const message = `<font color="#FF0000"><i class="fa-solid fa-circle-exclamation"></i> <b>${player.getName()}</b> denunciou o desenho</font>`;

    room.sendUIMessage('message', { message });

    room.addCustomMessage(message);
};

/**
 * @param {ScriptEntity} entity
 * @param { { word: string } } data
 */
const guess = (entity, data) => {
    const room = getRoom(entity);

    if (!room || !room.getCurrentPlayer()) return;

    if (!("word" in data)) return;

    const player = room.getPlayer(entity);

    if (!player || room.getCurrentPlayer().getId() === player.getId()) return;

    const word = data.word;

    if (!word) return;

    room.addChatMessage(player, word);

    const correct = room.isCorrectWord(word);

    if (!correct) {
        sendToChat(room, `<b>${player.getName()}</b>: ${word}`);
        return;
    }

    if (player.scored()) return;

    player.setScored(true);

    room.getCurrentPlayer().updatePoints(1);
    player.updatePoints(1);
    player.notification('generic', `Parabéns! Você acertou a palavra!`);

    room.sendUIMessage('playerScore', { player: { name: player.getName(), points: player.getPoints() } });
    room.sendUIMessage('updatePlayer', { player: { name: room.getCurrentPlayer().getName(), points: room.getCurrentPlayer().getPoints() } });

};

/**
 * @param {ScriptEntity} entity 
 */
const undo = (entity) => {
    const room = getRoom(entity);

    if (!room || !room.getCurrentPlayer()) return;

    if (room.getCurrentPlayer().getId() !== entity.getPlayerId()) return;

    if (!room.getLastData().length) return;

    room.pushRedoData(room.popLastData());

    room.getPlayers().forEach(player => {
        if (player.equals(entity)) return;

        player.sendUIMessage('clear', "");
        player.sendUIMessage('drawAll', { history: room.getLastData() });
    });
};

/**
 * @param {ScriptEntity} entity 
 */
const redo = (entity) => {
    const room = getRoom(entity);

    if (!room || !room.getCurrentPlayer()) return;

    if (room.getCurrentPlayer().getId() !== entity.getPlayerId()) return;

    if (!room.getRedoData().length) return;

    room.getLastData().push(room.popRedoData());

    room.getPlayers().forEach(player => {
        if (player.equals(entity)) return;

        player.sendUIMessage('clear', "");
        player.sendUIMessage('drawAll', { history: room.getLastData() });
    });
};

/**
 * @param {ScriptEntity} player
 * @param {GarticRoom} room 
 * @param { { index: number } } data
 */
const chooseWord = (entity, data) => {
    const room = getRoom(entity);

    if (!entity || !room || !room.getCurrentPlayer()) return;

    const player = room.getPlayer(entity);

    if (!player || room.getCurrentPlayer().getId() !== player.getId()) return;

    const index = data.index;

    if (index < 0 || index > 1) return;

    const word = room.getWords()[index];

    if (!word) return;

    room.setWord(word);

    room.getPlayers().forEach(p => {
        const isPlaying = p.getId() === player.getId();
        p.sendUIMessage('start', { time: 0, player: { name: player.getName() }, isPlaying });
        p.sendUIMessage('addDenounce', isPlaying);
        p.sendUIMessage('showHint', { isPlaying, wordLength: isPlaying ? word.length : 0 });
    });
};

/**
 * @param {ScriptEntity} entity 
 * @param {GarticRoom} room
 */
const add = (entity, room) => {
    room.addPlayer(new Player(entity));
};

const notification = (entity, data) => {
    if (!("message" in data)) return;

    data.message = data.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    entity.notification('generic', data.message || "");
};

/**
 * @param {GarticRoom} room
 * @param {string} message
 */
const sendToChat = (room, message) => {
    room.getPlayers().forEach(p => {
        p.sendUIMessage('message', { message });
    });
};

const draw = (entity, data) => {
    const room = getRoom(entity);

    if (!room) return;

    if (!room.getCurrentPlayer()) return;

    if (room.getCurrentPlayer().getId() !== entity.getPlayerId()) return;

    if (!("history" in data) || !data.history.length) return;

    room.pushLastData(data.history);

    room.getPlayers().forEach(player => {
        if (player.equals(entity)) return;

        player.sendUIMessage('draw', { history: data.history });
    });
};

/**
 * @param {ScriptEntity} entity
 */
const leave = (entity) => {
    const userId = entity.getPlayerId();

    const room = getRoom(userId);

    if (!room) return;

    const player = room.getPlayer(userId);

    if (!player) return;

    room.removePlayer(player);

    room.updateRoomUI();

    room.sendUIMessage('removePlayer', { player: { name: player.getName() } });

    const message = `<font color="#FF0000"><i class="fa-solid fa-circle-exclamation"></i> <b>${player.getName()}</b> abandonou a partida</font>`;

    room.sendUIMessage('message', { message: `<font color="#FF0000"><i class="fa-solid fa-circle-exclamation"></i> <b>${player.getName()}</b> abandonou a partida</font>` });

    room.addCustomMessage(message);

    player.sendUIMessage(`leaveRoom-${room.getId()}`, "");

    if (!room.getCurrentPlayer()) return;

    if (room.getCurrentPlayer().getId() !== player.getId()) return;

    room.setCurrentPlayer(null);
};

/**
 * @param {GarticRoom} room 
 */
const dispose = (room) => {
    const id = room.getId();

    game.rooms.delete(id);

    room.getPlayers().forEach(player => {
        try {
            player.sendUIMessage(`disposeRoom-${id}}`, "");
        }
        catch (e) { }
    });
};

/**
 * @param {GarticRoom} room 
 * @returns {string}
 */
function randomWords(room) {
    if (!room.getTheme()) return "";

    const wordsList = words[room.getTheme()];

    if (!wordsList) return "";

    wordsList.sort(() => Math.random() - 0.5);

    room.setWords(wordsList);

    return [wordsList[0], wordsList[1]];
}

/**
 * @param {ScriptEntity} entity
 * @returns {GarticRoom}
 */
function getRoom(entity) {
    // const roomId = game.players.get(entity.getPlayerId());

    // if (!roomId) return null;

    // return game.rooms.get(roomId);
    return garticRoom;
}

events.set('paint-ready', (entity) => {
    const rooms = [...game.rooms.values()]
        .map(room => ({ id: room.getId(), theme: room.getTheme(), totalPlayers: room.getTotalPlayers(), points: room.getHighestScore(), maxPoints: 120, maxPlayers: game.maxPlayers }));

    entity.sendUIMessage('loadRooms', JSON.stringify({ rooms }));

    garticRoom.updateRoomUI();
});

events.set('paint', draw);
events.set('notification', notification);
events.set('undo', undo);
events.set('redo', redo);
events.set('guess', guess);
events.set('hint', hint);
events.set('skip', skip);
events.set('denounce', denounce);
events.set('leave', leave);
events.set('choose-word', chooseWord);

Commands.register(':start', true, (entity) => {
    if (!entity.hasRank(98)) return;

    const room = getRoom(entity);

    if (!room) return;

    start(room);
});

Events.on('userJoin', (entity) => {
    entity.loadUI('paint', 'index');
});

Events.on('userLeave', leave);

/**
 * @param {ScriptEntity} entity
 * @param {string} eventName
 * @param {string} value
 */
const emitClientEvent = (entity, eventName, value) => {
    const exec = events.get(eventName);
    if (exec) {
        const parsed = JSON.parse(value);
        exec(entity, parsed);
    }
};

Events.on('uiMessage', emitClientEvent);
Events.on('uiMessage', (entity, eventName, value) => {
    if (!eventName.startsWith('joinRoom-')) return;

    const roomId = parseInt(eventName.split('-')[1]);

    if (!roomId) {
        entity.notification('generic', 'Sala não encontrada.');
        return;
    }

    const room = game.rooms.get(roomId);

    if (!room) {
        entity.notification('generic', 'Sala não encontrada.');
        return;
    }

    const player = new Player(entity);

    if (game.players.has(player.getId())) {
        entity.notification('generic', 'Você já está em uma sala.');
        return;
    }

    room.addPlayer(player);
    game.players.set(player.getId(), roomId);
});