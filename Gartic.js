import themes from "./themes.js";
import { removeAccents } from "./utils.js";
import words from "./words.js";

export default class Gartic {
    #lastData = [];
    #redoData = [];
    #undoData = [];
    #word = "";
    #theme = "";
    #hint = "";
    #hints = 0;
    #maxHints = 0;

    constructor() { }

    getLastData() {
        return this.#lastData;
    }

    pushLastData(data) {
        this.#lastData.push(data);
    }

    setLastData(data) {
        this.#lastData = data;
    }

    popLastData() {
        return this.#lastData.pop();
    }

    getRedoData() {
        return this.#redoData;
    }

    popRedoData() {
        return this.#redoData.pop();
    }

    pushRedoData(data) {
        this.#redoData.push(data);
    }

    setRedoData(data) {
        this.#redoData = data;
    }

    getUndoData() {
        return this.#undoData;
    }

    setUndoData(data) {
        this.#undoData = data;
    }

    pushUndoData(data) {
        this.#undoData.push(data);
    }

    popUndoData() {
        return this.#undoData.pop();
    }

    getTheme() {
        return this.#theme;
    }

    getWord() {
        return this.#word;
    }

    clearLastData() {
        this.#lastData = [];
    }

    clearRedoData() {
        this.#redoData = [];
    }

    clearUndoData() {
        this.#undoData = [];
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

        return removeAccents(word.toLowerCase()) === removeAccents(this.#word.toLowerCase());
    }

    updateMaxHints() {
        const word = this.#word;

        if (!word) return;

        this.#maxHints = (word.length / 2);
    }

    getHint() {
        return this.#hint;
    }

    usedHints() {
        return this.#hints;
    }

    getMaxHints() {
        return this.#maxHints;
    }

    addHint() {
        if (this.#hints >= this.#maxHints) return;

        this.#hints++;
    }

    addRandomHint() {
        if (!this.#word) return;

        const word = this.#word.toLowerCase();
        const hint = this.#hint || Array(word.length).fill("_");

        const index = hint.findIndex(h => h === "_");

        if (index === -1) return;

        hint[index] = word[index];

        this.#hint = hint.join("");

        this.addHint();

        this.sendUIMessage('setHint', { hint: this.#hint });
    }
}