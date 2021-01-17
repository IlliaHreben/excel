/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const normalizeObjectToString = (object, spacesBefore = 0) => {
    if (typeof object !== 'object') return object;

    const maxLengthKey = Object.keys(object)
        .reduce((acc, key) => (acc < key.length ? key.length : acc), 0);

    const formattedText = Object.entries(object).reduce((text, [key, value], i, array) => {
        key = key.toString();
        const isLast = array.length - 1 === i;

        const missingSpaces = maxLengthKey - key.length + 1;

        if (typeof value === 'object') {
            const addSpacesCount = maxLengthKey + 3;
            value = normalizeObjectToString(value, spacesBefore + addSpacesCount);
        }

        return `${text}${text ? ' '.repeat(spacesBefore) : ''}${key}${' '.repeat(missingSpaces)}: ${value} ${!isLast ? '\n' : ''}`;
    }, '');

    return formattedText;
};

module.exports = {
    normalizeObjectToString,
};
