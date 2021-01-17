const quiche = require('quiche');
const { getRandomColor } = require('./calculations');

const createChart = (chartData) => {
    const {
        timeLabels,
        values,
        iterationNumber,
    } = chartData;
    const chart = quiche('line');
    chart.setTitle(`Iteration #${iterationNumber}`);
    chart.addData(values, 'Pulse wave', getRandomColor(), 2);
    chart.addAxisLabels('x', timeLabels);
    chart.setAutoScaling();
    chart.setWidth(300);
    chart.setHeight(200);
    // chart.setAxisRange('y', 500, 3500, 250); // axis, start, end, range
    // chart.setTransparentBackground();

    const imageUrl = chart.getUrl(true);

    return imageUrl.replace('chdl=Pulse%20wave&', '');
};

const createMainChart = (chartData) => {
    const {
        timeLabels,
        iterationsValues,
    } = chartData;
    const chart = quiche('line');

    chart.setTitle('Comparison of iterations');
    iterationsValues.forEach((iteration, i) => {
        const color = getRandomColor();
        console.log(color);
        chart.addData(iteration, `Iteration #${i + 1}`, color);
    });

    chart.addAxisLabels('x', timeLabels);
    chart.setAutoScaling();
    chart.setWidth(500);
    chart.setHeight(350);
    // chart.setTransparentBackground();

    const imageUrl = chart.getUrl(true);
    return imageUrl;
};

module.exports = {
    createChart,
    createMainChart,
};
