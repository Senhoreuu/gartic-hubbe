export default class Player {
    #name = "";
    #id = 0;
    #points = 0;
    #entity;
    #scored = false;

    constructor(user) {
        this.#name = user.getUsername();
        this.#id = user.getPlayerId();
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
        if (!entity) return false;

        if (entity instanceof Player) return this.#id === entity.getId();

        return this.#id === entity.getPlayerId();
    }

    sendUIMessage(event, value) {
        this.#entity.sendUIMessage(event, JSON.stringify(value));
    }

    notification(type, message) {
        this.#entity.notification(type, message);
    }

    scored() {
        return this.#scored;
    }

    setScored(scored) {
        this.#scored = scored;
    }
}