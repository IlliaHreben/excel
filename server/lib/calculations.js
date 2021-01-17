/* eslint-disable max-len */
const { zip, mean, round } = require('lodash');

const threshold = 50;
const minIterationLength = 90;
const maxIterationLength = 200;

function measurementsToIterations(rawMeasurements) {
  const measurements = rawMeasurements.filter(([, value], i, arr) => {
    const [, prevValue] = arr[i - 1] || [];
    return value !== prevValue;
  });

  const iterationsBoundaries = measurements
    .reduce((acc, [/* time */, value], i) => {
      const [, nextValue] = measurements[i + 1] || [];
      const [, prevValue] = measurements[i - 1] || [];
      if (value < threshold && nextValue && nextValue > value && prevValue > value) {
        acc.push(i);
      }
      return acc;
    }, [0])
    .filter((iterationBoundary, i, arr) => {
      const nextIterationBoundary = arr[i + 1];
      return (nextIterationBoundary - iterationBoundary) > minIterationLength || !nextIterationBoundary;
    });

  const iterations = iterationsBoundaries
    .reduce((acc, iterationBoundary, i, arr) => {
      const iteration = measurements.slice(iterationBoundary, arr[i + 1]);

      return [...acc, iteration];
    }, [])
    .filter((arr) => arr.length > minIterationLength && arr.length < maxIterationLength);

  return iterations;
}

const pickIndexInCycle = (incomingIndex, array) => {
  if (!Number.isInteger(incomingIndex)) throw new Error('Index not a number');
  if (!Array.isArray(array)) throw new Error('Array not an array');
  if (incomingIndex < 0) throw new Error('Wrong index');

  if (incomingIndex > array.length) {
    return pickIndexInCycle(incomingIndex - array.length, array);
  }
  return incomingIndex;
};

const pickValueInCycle = (incomingIndex, array) => array[pickIndexInCycle(incomingIndex, array)];

const getRandomColor = () => Math.floor(Math.random() * 16777215).toString(16);

const sampleInArray = (array, count) => {
  count -= 1;
  const { length } = array;
  const sampled = [array[0]];
  for (let i = 1; i <= count; i++) {
    const index = Math.round(i * (length / count)) - 1;
    sampled.push(array[index]);
  }
  return sampled;
};

const normalizeTimeFrames = (timeFrames) => {
  const howMuchToTake = timeFrames[0];
  return timeFrames.map((timeFrame) => (timeFrame - howMuchToTake));
};

const toFixedArray = (arr) => arr.map((item) => round(item, 2));

const getAverageValues = (values) => {
  const ziped = zip(...values);
  return ziped.map((frame) => mean(frame));
};

module.exports = {
  pickValueInCycle,
  measurementsToIterations,
  getRandomColor,
  sampleInArray,
  normalizeTimeFrames,
  toFixedArray,
  getAverageValues,
};
