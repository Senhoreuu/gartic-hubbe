export default class EventMap extends Map {
    constructor() {
        super();
    }

    /**
     * @param {String} key 
     * @param {(entity: ScriptEntity, data: { history?: [], message?: string, word?: string, index?: number }) => void} value
     */
    set(key, value) {
        super.set(key, value);
    }
}