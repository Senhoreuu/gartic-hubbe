import themes from "./themes.js";
import { removeAccents } from "./utils.js";
import words from "./words.js";
import GarticData from "./GarticData.js";

export default class Gartic extends GarticData {
    #word = "";
    #theme = "";
    #usedHints = 0;
    #maxHints = 0;
    #hints = [];

    constructor() {
        super();
    }

    getTheme() {
        if (this.#theme.toLowerCase() === "geral") return themes.filter(t => t.length)[Math.floor(Math.random() * themes.length)];
        
        return this.#theme;
    }

    getCurrentTheme() {
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

        return removeAccents(word.toLowerCase()) === removeAccents(this.#word.toLowerCase());
    }

    updateMaxHints() {
        const word = this.#word;

        if (!word) return;

        this.#maxHints = (word.length / 2);
    }

    getHints() {
        return this.#hints;
    }

    usedHints() {
        return this.#usedHints;
    }

    getMaxHints() {
        return this.#maxHints;
    }

    incrementHint() {
        if (this.#usedHints >= this.#maxHints) return;

        this.#usedHints++;
    }

    addRandomHint() {
        if (!this.#word) return;

        const word = this.#word.toLowerCase();
    }
}