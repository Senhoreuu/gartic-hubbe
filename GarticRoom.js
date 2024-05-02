import Gartic from "./Gartic.js";
import game from "./game.js";
import Player from "./Player.js";
import { randomWords } from "./utils.js";

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
    #started = false;

    constructor(ownerId) {
        super();

        this.#id = ownerId + Math.floor(Math.random() * 1000000);
    }

    isStarted() {
        return this.#started;
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

    getNextPlayer() {
        const players = this.getPlayers();
        const lastPlayerIndex = players.findIndex(p => p.equals(this.getLastPlayer()));

        if (lastPlayerIndex === -1) return players[0];

        const nextPlayerIndex = lastPlayerIndex + 1;

        if (nextPlayerIndex > players.length) return players[0];

        return players[nextPlayerIndex];
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

        this.sendUIMessage('addPlayer', { player: { name: player.getName(), points: player.getPoints(), isPlaying: false } });

        this.#players.set(player.getId(), player);

        player.sendUIMessage('loadHistory', {
            history: {
                data: this.getLastData(),
                players: this.getPlayers().map(p => ({ name: p.getName(), points: p.getPoints(), isPlaying: false })),
                chat: this.getChat()
            }
        });

        if (this.#currentPlayer) {
            player.sendUIMessage('playerTurn', { player: { name: player.getName() } });
        }
    }

    /**
     * @param {ScriptEntity | number | Player} player 
    */
    removePlayer(player) {
        if (!player) return;

        let id = 0;

        if (player instanceof Player) {
            id = player.getId();
        }
        else if (typeof player === 'number') {
            id = player;
        }
        else {
            id = player.getPlayerId();
        }

        this.#players.delete(id);
        game.players.delete(id);

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

    start() {
        if (this.#started) return;

        if (this.getRound() >= game.maxRounds) {
            this.endGame();
            return;
        }

        this.stopTime();

        this.setRound(this.getRound() + 1);

        const totalPlayers = this.getTotalPlayers();
        if (totalPlayers < 2) {
            this.notification('generic', 'Não há jogadores suficientes para iniciar o jogo.');
            return;
        }

        const player = this.getNextPlayer();

        this.setCurrentPlayer(player);

        const words = randomWords(this);

        this.setWords(words);

        player.notification('generic', `É a sua vez, ${player.getName()}!`);

        player.sendUIMessage('notification', { type: "chooseWords", words });

        this.getPlayers().forEach(p => {
            if (p.equals(player)) {
                p.sendUIMessage('playerTurn', { player: { name: player.getName() } });
                return;
            }

            p.sendUIMessage('notification', { type: "playerTurn", name: player.getName() });
        });

        this.startTime();
    };

    startRound() {
        if (!this.#currentPlayer) {
            this.notification('generic', 'Não há jogadores suficientes para iniciar o jogo.');
            return;
        }

        this.getPlayers().forEach(player => {
            const isPlaying = player.getId() === this.#currentPlayer.getId();
            player.sendUIMessage('start', { time: 0, player: { name: this.#currentPlayer.getName() }, isPlaying });
            player.sendUIMessage('addDenounce', isPlaying);
            player.sendUIMessage('showHint', { isPlaying, wordLength: isPlaying ? word.length : 0 });
        });

        this.#delays.set("startRound", Delay.wait(() => {

        }));
    }

    endGame() {
        this.notification('generic', 'O jogo acabou!');

        const winners = this.getPlayers().sort((a, b) => b.getPoints() - a.getPoints()).slice(0, 3);

        this.sendUIMessage('endGame', { winners: winners.map(w => ({ name: w.getName(), points: w.getPoints() })) });

        this.#delays.forEach(delay => { Delay.cancel(delay); });
        this.#delays.clear();

        this.reset();

        this.#delays.set("endGame", Delay.wait(() => {
            this.start();
        }, 10));
    }

    endRound() {
        this.resetTime();

        this.getPlayers().forEach(player => {
            player.setScored(false);
        });

        this.start();
    };

    startTime() {
        if (this.#delays.has('time')) return;

        this.resetTime();

        const delay =
            Delay.interval(() => {
                this.#time--;

                if (this.#time <= 0) {
                    this.endRound();
                }
            }, 2);

        this.#delays.set('time', delay);

        this.sendUIMessage('startTimer', { time: this.#time });
    }

    reset() {
        this.#time = 0;
        this.#currentPlayer = null;
        this.#lastPlayer = null;
        this.#chat = [];
        this.#words = [];

        this.#delays.forEach(delay => { Delay.cancel(delay); });
        this.#delays.clear();
    }

    stopTime() {
        if (!this.#delays.has('time')) return;

        Delay.cancel(this.#delays.get('time'));
        this.#delays.delete('time');
    }

    resetTime(action) {
        switch (action) {
            case "chooseWords":
                this.#time = 10;
                break;
            case "draw":
                this.#time = 60;
                break;
            default:
                this.#time = 30;
                break;
        }

        this.stopTime();
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