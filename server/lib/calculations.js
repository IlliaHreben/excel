/* eslint-disable max-len */

const threshold = 50;
const minIterationLength = 90;

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
    .filter((arr) => arr.length > minIterationLength);

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

module.exports = { pickValueInCycle, measurementsToIterations };
