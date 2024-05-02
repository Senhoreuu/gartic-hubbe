export default class GarticData {
    #lastData = [];
    #redoData = [];
    #undoData = [];

    constructor() { }

    clearLastData() {
        this.#lastData = [];
    }

    clearRedoData() {
        this.#redoData = [];
    }

    clearUndoData() {
        this.#undoData = [];
    }

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
}