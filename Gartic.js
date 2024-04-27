import themes from "./themes.js";
import words from "./words.js";

export default class Gartic {
    #player = null;
    #lastData = [];
    #redoData = [];
    #undoData = [];
    #word = "";
    #theme = "";

    constructor() { }

    getCurrentPlayer() {
        if (!this.#player) return null;

        return this.#player;
    }

    setCurrentPlayer(player) {
        this.#player = player;
    }

    getLastData() {
        return this.#lastData;
    }

    getRedoData() {
        return this.#redoData;
    }

    getUndoData() {
        return this.#undoData;
    }

    getTheme() {
        return this.#theme;
    }

    getWord() {
        return this.#word;
    }

    setTheme(theme) {
        if (!theme || !themes.includes(theme)) return;

        this.#theme = theme;

        this.sendUIMessage('setTheme', { theme });
    }

    setWord(word) {
        if (!word || !words[this.#theme].includes(word)) return;

        this.#word = word;
    }

    isCorrectWord(word) {
        if (!word || !this.#word || typeof word !== "string") return false;

        word = word.trim();
        word = word.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        return word.toLowerCase() === this.#word.toLowerCase();
    }
}