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
  chart.addData(values, 'Pulse wave', getRandomColor());
  chart.addAxisLabels('x', timeLabels);
  chart.setAutoScaling();
  // chart.setAxisRange('y', 500, 3500, 250); // axis, start, end, range
  chart.setTransparentBackground();

  const imageUrl = chart.getUrl(true);
  return imageUrl;
};

const createMainChart = (chartData) => {
  const {
    timeLabels,
    iterationsValues,
  } = chartData;
  const chart = quiche('line');

  chart.setTitle('Comparison of iterations');
  iterationsValues.forEach((iteration, i) => {
    chart.addData(iteration, `Iteration #${i + 1}`, getRandomColor());
  });

  chart.addAxisLabels('x', timeLabels);
  chart.setAutoScaling();
  chart.setWidth(500);
  chart.setHeight(350);
  chart.setTransparentBackground();

  const imageUrl = chart.getUrl(true);
  console.log(imageUrl);
  return imageUrl;
};

module.exports = {
  createChart,
  createMainChart,
};
