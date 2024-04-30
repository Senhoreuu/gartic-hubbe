import Gartic from "./Gartic.js";
import game from "./game.js";
import Player from "./Player.js";

export default class GarticRoom extends Gartic {
    #id = 0;
    #players = new Map(); // { key: number, value: Player }[]
    #round = 0;
    #time = 0;
    #currentPlayer; // Player
    #lastPlayer; // Player
    #delays = new Map(); // { key: string, value: Delay }[]
    #chat = []; // { name: string, message: string }[]
    #words = []; // string[]

    constructor(ownerId) {
        super();

        this.#id = ownerId;
    }

    getId() {
        return this.#id;
    }

    /**
     * @returns {Player | null}
     */
    getCurrentPlayer() {
        if (!this.#currentPlayer) return null;

        return this.#currentPlayer;
    }

    /**
     * @returns {Player | null}
     */
    getLastPlayer() {
        if (!this.#lastPlayer) return null;

        return this.#lastPlayer;
    }

    /**
     * @param {Player} player
     */
    setCurrentPlayer(player) {
        if (!player) return;

        this.#lastPlayer = this.#currentPlayer;
        this.#currentPlayer = player;
    }

    getRandomPlayer() {
        const players = this.getPlayers().filter(player => player.getId() !== this.#lastPlayer?.getId());
        return players[Math.floor(Math.random() * players.length)];
    }

    /**
     * @returns {Player[]}
     */
    getPlayers() {
        return [...this.#players.values()];
    }

    getTotalPlayers() {
        return this.#players.size;
    }

    /**
     * @param {ScriptEntity | number | Player} search 
     * @returns {Player | null}
     */
    getPlayer(search) {
        if (search instanceof Player) return search;

        if (typeof search === 'number') return this.#players.get(search);

        return this.#players.get(search.getPlayerId());
    }

    getRound() {
        return this.#round;
    }

    getOwnerId() {
        return this.#id;
    }

    updateRoomUI() {
        Room.getAllPlayers().forEach(p => {
            try {
                if (!this.getTotalPlayers()) {
                    p.sendUIMessage(`disposeRoom-${this.getId()}`, "");
                    return;
                }

                p.sendUIMessage(`updateRoom-${this.getId()}`, JSON.stringify({
                    room: {
                        maxPlayers: game.maxPlayers,
                        totalPlayers: this.getTotalPlayers(),
                        points: this.getHighestScore(),
                        maxPoints: 120
                    }
                }));
            }
            catch (e) { }
        });
    }

    setRound(round) {
        if (!round || round < 0) return;

        this.#round = round;
    }

    getHighestScore() {
        let highestScore = 0;

        this.#players.forEach(player => {
            if (player.getPoints() > highestScore) {
                highestScore = player.getPoints();
            }
        });

        return highestScore;
    }

    /**
     * @param {Player} player
     */
    addPlayer(player) {
        if (this.#players.size >= 10 || !player) return;

        this.#players.set(player.getId(), player);

        this.sendUIMessage('addPlayer', { player: { name: player.getName(), points: player.getPoints(), isPlaying: false } });
    }

    /**
     * @param {ScriptEntity | number | Player} player 
    */
    removePlayer(player) {
        if (!player) return;

        if (player instanceof Player) {
            this.#players.delete(player.getId());
        }
        else if (typeof player === 'number') {
            this.#players.delete(player);
        }
        else {
            this.#players.delete(player.getPlayerId());
        }

        if (this.#players.size === 0) {
            game.rooms.delete(this.#id);

            this.dispose();
        }

        this.updateRoomUI();
    }

    dispose() {
        this.#players.forEach(player => {
            player.dispose();
        });

        this.#players.clear();
    }

    equals(room) {
        if (!room) return false;

        return this.#id === room.getId();
    }

    sendUIMessage(event, value = {}) {
        this.#players.forEach(player => {
            try {
                player.sendUIMessage(event, value);
            }
            catch (e) { }
        });
    }

    notification(type, message) {
        this.#players.forEach(player => {
            try {
                player.notification(type, message);
            }
            catch (e) { }
        });
    }

    startTime() {
        if (this.#delays.has('time')) return;

        this.resetTime();

        const delay =
            Delay.interval(() => {
                this.#time--;

                if (this.#time <= 0) {
                    this.stopTime();
                }
            }, 2);

        this.#delays.set('time', delay);

        if (this.#currentPlayer) {
            this.#currentPlayer.sendUIMessage('startTimer', { time: this.#time });
        }
    }

    stopTime() {
        if (!this.#delays.has('time')) return;

        Delay.cancel(this.#delays.get('time'));
        this.#delays.delete('time');
    }

    resetTime() {
        this.#time = 60;
    }

    getTime() {
        return this.#time;
    }

    getChat() {
        return this.#chat;
    }

    /**
     * @param {Player} player 
     * @param {string} message 
     */
    addChatMessage(player, message) {
        this.#chat.push(`<b>${player.getName()}:</b> ${message}`);
    }

    addCustomMessage(message) {
        this.#chat.push(message);
    }

    clearChat() {
        this.#chat = [];

        this.sendUIMessage('clearChat');
    }

    setWords(words) {
        this.#words = words;
    }

    getWords() {
        return this.#words;
    }
}