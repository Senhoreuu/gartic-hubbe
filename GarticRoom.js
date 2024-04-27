import Gartic from "./Gartic.js";
import game from "./game.js";
import Player from "./Player.js";

export default class GarticRoom extends Gartic {
    #id = 0;
    #players = new Map();
    #round = 0;
    #ownerId = 0;

    constructor(ownerId) {
        super();

        this.#ownerId = ownerId;

        this.#id = game.lastRoomId++;
    }

    getId() {
        return this.#id;
    }

    getPlayers() {
        return [...this.#players.values()];
    }

    getTotalPlayers() {
        return this.#players.size;
    }

    getPlayer(search) {
        if (search instanceof Player) return search;

        if (typeof search === 'number') return this.#players.get(search);

        return this.#players.get(search.getPlayerId());
    }

    getRound() {
        return this.#round;
    }

    getOwnerId() {
        return this.#ownerId;
    }

    setRound(round) {
        if (!round || round < 0) return;

        this.#round = round;
    }

    addPlayer(player) {
        if (this.#players.size >= 10 || !player) return;

        this.#players.set(player.getId(), player);
    }

    removePlayer(player) {
        if (!player) return;

        this.#players.delete(player.getId());
    }

    equals(room) {
        if (!room) return false;

        return this.#id === room.getId();
    }

    sendUIMessage(event, value) {
        value = value || {};

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
}