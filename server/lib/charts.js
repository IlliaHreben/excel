const Vega = require('vega');
const svg2png = require('svg2png');
// const { getRandomColor } = require('./calculations');
const chartTemplate = require('./etc/chartTemplate.spec.json');

const dumpChartData = (chartData, i) => {
    const dumped = chartData
        .map(([time, value]) => ({
            x: time,
            y: value,
            c: i,
        }))
        .sort((current, next) => (current.x > next.x ? 1 : -1));

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
    return svg2png(Buffer.from(svg));
};

const createChart = async (chartData, i) => {
    const dumpedData = dumpChartData(chartData, i + 1);
    const config = createConfig(dumpedData, `Iteration №${i + 1}`);
    const chartBuffer = await createChartBuffer(config);
    return [chartBuffer, dumpedData];
};

const createMainChart = async (mainChartData) => {
    const config = createConfig(mainChartData);
    config.width = 500;
    config.height = 350;
    const chartBuffer = await createChartBuffer(config);

    return chartBuffer;
};

module.exports = {
    createChart,
    createMainChart,
};
