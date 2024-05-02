import GarticRoom from "./GarticRoom.js";
import Player from "./Player.js";
import EventMap from "./EventMap.js";
import themes from "./themes.js";
import words from "./words.js";
import game from "./game.js";
import { isCloseToWord } from "./utils.js";

const events = new EventMap();

const themeExists = (theme) => {
    if (!theme) return false;

    if (theme.toLowerCase() === "geral") return true;

    return themes.includes(theme);
};

/**
 * @param {ScriptEntity} entity
 */
const hint = (entity) => {
    const room = getRoom(entity);

    if (!room || !room.getCurrentPlayer()) return;

    const player = room.getPlayer(entity);

    if (!player || room.getCurrentPlayer().getId() !== player.getId()) return;

    if (room.usedHints() >= room.getMaxHints()) return;

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

    room.endRound();
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
        if (isCloseToWord(word, room.getWord())) {
            entity.sendUIMessage('message', { message: `<font color="#fd803a"><i class="fa-solid fa-circle-exclamation"></i> ${word} está perto</font>` });
            return;
        }

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

    if (!entity || !room || !room.getCurrentPlayer()) {
        entity.notification('generic', 'Sala não encontrada.');
        return;
    }

    const player = room.getPlayer(entity);

    if (!player || room.getCurrentPlayer().getId() !== player.getId()) {
        entity.notification('generic', 'Você não é o jogador da vez.');
        return;
    }

    const index = data.index;

    if (index < 0 || index > 1) {
        entity.notification('generic', 'Palavra inválida.');
        return;
    }

    const word = room.getWords()[index];

    if (!word) {
        entity.notification('generic', 'Palavra inválida.');
        return;
    }

    player.sendUIMessage('playing', { playing: true });

    room.setWord(word);
    room.startRound();
};

/**
 * @param {ScriptEntity} entity 
 * @param {GarticRoom} room
 */
const add = (entity, room) => {
    const player = new Player(entity);

    if (game.players.has(player.getId())) return;
    if (room.getTotalPlayers() >= game.maxPlayers) return;

    room.addPlayer(player);
    room.updateRoomUI();

    if (room.getTotalPlayers() === 2) {
        if (!room.isStarted())
            room.start();
    }

    game.players.set(player.getId(), room.getId());
};

/**
 * @param {GarticRoom} room 
 */
const addRoom = (room) => {
    game.rooms.set(room.getId(), room);

    const roomData = { id: room.getId(), theme: room.getCurrentTheme(), totalPlayers: room.getTotalPlayers(), points: room.getHighestScore(), maxPoints: 120, maxPlayers: game.maxPlayers };

    Room.getAllPlayers().forEach(p => {
        p.sendUIMessage('loadRooms', JSON.stringify({ rooms: [roomData] }));
    });
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
 * @param { { theme: string } } data
 */
function createRoom(entity, data) {
    const userId = entity.getPlayerId();

    if (game.players.has(userId)) {
        entity.notification('generic', 'Você já está em uma sala.');
        return;
    }

    if (!("theme" in data)) return;

    const theme = data.theme?.toLowerCase();

    if (!theme) {
        entity.notification('generic', 'Preencha todos os campos.');
        return;
    }

    if (game.rooms.size >= game.maxRooms) {
        entity.notification('generic', 'Limite de salas atingido.');
        return;
    }

    if (!themeExists(theme)) {
        entity.notification('generic', 'Tema inválido.');
        return;
    }

    const room = new GarticRoom(userId);
    room.setTheme(theme);

    addRoom(room);

    joinRoom(entity, { room: room.getId() });
}

/**
 * @param {ScriptEntity} entity
 */
function openGame(entity) {
    entity.sendUIMessage('openGame', "");
}

/**
 * @param {ScriptEntity} entity
 * @param { { room: number | string } } data
 */
function joinRoom(entity, data) {
    if (!("room" in data)) return;

    const roomId = data.room;

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

    add(entity, room);
    openGame(entity);
}

/**
 * @param {ScriptEntity} entity
 */
const leave = (entity) => {
    const userId = entity.getPlayerId();

    const room = getRoom(userId);

    if (!room) return;

    const player = room.getPlayer(userId);

    if (!player) return;

    const message = `<font color="#FF0000"><i class="fa-solid fa-circle-exclamation"></i> <b>${player.getName()}</b> abandonou a partida</font>`;
    room.sendUIMessage('removePlayer', { player: { name: player.getName() } });
    room.sendUIMessage('message', { message });
    room.removePlayer(player);
    room.addCustomMessage(message);

    entity.sendUIMessage(`leaveRoom-${room.getId()}`, "");

    if (!room.getCurrentPlayer()) return;

    if (room.getCurrentPlayer().getId() !== player.getId()) return;

    room.setCurrentPlayer(null);
};

/**
 * @param {ScriptEntity | number} entity
 * @returns {GarticRoom}
 */
function getRoom(entity) {
    if (!entity) return null;

    const id = typeof entity === "number" ? entity : entity.getPlayerId();

    const roomId = game.players.get(id);

    if (!roomId) return null;

    return game.rooms.get(roomId);
}

events.set('paint-ready', (entity) => {
    const rooms = [...game.rooms.values()]
        .map(room => ({ id: room.getId(), theme: room.getCurrentTheme(), totalPlayers: room.getTotalPlayers(), points: room.getHighestScore(), maxPoints: 120, maxPlayers: game.maxPlayers }));

    entity.sendUIMessage('loadRooms', JSON.stringify({ rooms }));
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
events.set('join', joinRoom);
events.set('createRoom', createRoom);

Commands.register(':start', true, (entity) => {
    if (!entity.hasRank(98)) return;

    const room = getRoom(entity);

    if (!room) return;

    room.start();
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