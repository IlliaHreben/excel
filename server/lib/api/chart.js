const fetch = require('node-fetch');

const getImage = async (hyperlink) => {
    const res = await fetch(hyperlink);
    const parsed = await res.blob();
    return parsed.arrayBuffer();
};

module.exports = {
    getImage,
};
