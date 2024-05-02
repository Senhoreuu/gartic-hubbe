import words from "./words";

export function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ç/g, 'c').replace(/Ç/g, 'C').replace(/-/g, ' ');
}

export function isCloseToWord(word, wordCompare) {
    if (!word || !wordCompare || typeof word !== "string" || typeof wordCompare !== "string") return false;

    word = removeAccents(word.toLowerCase());
    wordCompare = removeAccents(wordCompare.toLowerCase());

    return word.includes(wordCompare);
}

/**
 * @returns {string}
 */
export function randomWords(room) {
    if (!room.getTheme()) return [null, null];

    let wordsList = words[room.getTheme()];

    for (let i = 0; i < 500; i++) {
        if (wordsList && wordsList.length > 1) break;

        wordsList = words[room.getTheme()];
    }

    if (!wordsList || wordsList.length < 2) return [null, null];

    wordsList.sort(() => Math.random() - 0.5);

    room.setWords(wordsList);

    return [wordsList[0], wordsList[1]];
}