const Vega = require('vega');
// const { getRandomColor } = require('./calculations');
const chartTemplate = require('./etc/chartTemplate.spec.json');

const mainChartData = [];

const dumpChartData = (chartData, i) => {
    const dumped = chartData
        .map(([time, value]) => ({
            x: time,
            y: value,
            c: i,
        }))
        .sort((current, next) => (current.x > next.x ? 1 : -1));

    mainChartData.push(...JSON.parse(JSON.stringify(dumped)));

    return dumped;
};

const createConfig = (data, title) => {
    const filledTemplate = JSON.parse(JSON.stringify(chartTemplate));
    filledTemplate.data[0].values = data;
    filledTemplate.title.text = title;
    return filledTemplate;
};

const createChartBuffer = async (data) => {
    const view = new Vega
        .View(Vega.parse(data))
        .renderer('none')
        .initialize();

    const svg = await view.toSVG();
    return Buffer.from(svg);
};

const createChart = async (chartData, i) => {
    const dumpedData = dumpChartData(chartData, i);
    const config = createConfig(dumpedData, `Iteration №${i}`);
    const chartBuffer = await createChartBuffer(config);
    return chartBuffer;
};

const createMainChart = async () => {
    const config = createConfig(mainChartData);
    config.width = 500;
    config.height = 350;
    const chartBuffer = await createChartBuffer(config);

    console.log(JSON.stringify(config));
    return chartBuffer;
};

module.exports = {
    createChart,
    createMainChart,
};
