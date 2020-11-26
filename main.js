/* eslint-disable max-len */
const { readDataFromExcel, writeIterationsToExcel } = require('./exel');

const [, , personDirPath] = process.argv;

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
      // console.log(iterationLimit, iterations[i+1])
      const iteration = measurements.slice(iterationBoundary, arr[i + 1]);
      // console.log(iteration)
      return [...acc, iteration];
    }, [])
    .filter((arr) => arr.length > minIterationLength);

  return iterations;
}

readDataFromExcel(personDirPath)
  .then((data) => data.map(({ measurements, xlsxPath }) => {
    // console.log(xlsxPath)
    const iterations = measurementsToIterations(measurements);
    // console.log(JSON.stringify(iterations, null, 2))
    return { iterations, xlsxPath };
  }))
  .then((data) => writeIterationsToExcel(data, personDirPath));

// iterations.unshift(0)

// console.log(iterations) // 9 9 9 10 10 11
