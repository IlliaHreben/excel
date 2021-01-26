const {
    zip, mean, round,
} = require('lodash');

const threshold = 50;
const minIterationLength = 90;
const maxIterationLength = 140;

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
            return (nextIterationBoundary - iterationBoundary) > minIterationLength
                || !nextIterationBoundary;
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

// eslint-disable-next-line no-bitwise
const getRandomColor = () => (Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');

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

const toFixedArray = (arr, count = 4) => arr.map((item) => round(item, count));

const getAverageValues = (values) => {
    const ziped = zip(...values);
    return ziped.map((frame) => mean(frame));
};

const normalizeIterations = (iterations) => {
    const timeFrames = Array.from(new Set(
        iterations
            .map((iteration) => iteration.map(([timeFrame]) => timeFrame))
            .flat(),
    )).sort((current, next) => (current > next ? 1 : -1));

    iterations.forEach((iteration) => { // eslint-disable-line consistent-return
        const iterationTimeFrames = iteration.map(([time]) => time);

        timeFrames.forEach((timeFrame, i) => { // eslint-disable-line consistent-return
            if ((!iterationTimeFrames.includes(timeFrame)) && (i < iteration.length)) {
                const prevFrame = (iteration[i - 1] && iteration[i - 1][0]) || 0;
                const currentPeriod = round(iteration[i][0] - prevFrame, 4);
                const currentFrame = round(timeFrame - prevFrame, 4);
                const currentPercent = currentFrame / currentPeriod;
                const nextValue = iteration[i][1];
                const prevValue = iteration[i - 1][1];
                const currentValue = round(
                    nextValue * currentPercent + prevValue * (1 - currentPercent),
                    3,
                );

                iteration.splice(i, 0, [round(timeFrame, 4), currentValue]);
            }
        });
    });
    return iterations;
};

module.exports = {
    pickValueInCycle,
    measurementsToIterations,
    getRandomColor,
    sampleInArray,
    normalizeTimeFrames,
    toFixedArray,
    getAverageValues,
    normalizeIterations,
};
