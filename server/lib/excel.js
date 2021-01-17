const fs = require('fs').promises;
const childProcess = require('child_process');
const path = require('path');
const Excel = require('exceljs');
const os = require('os');
const libre = require('libreoffice-convert');
const _ = require('lodash');

const { createChart, createMainChart } = require('./charts');
const { colors } = require('./constants');
const {
  pickValueInCycle,
  measurementsToIterations,
  sampleInArray,
  normalizeTimeFrames,
  toFixedArray,
  getAverageValues,
} = require('./calculations');

const xlsToXlsx = async (xlsPath, xlsxPath) => {
  if (os.type() === 'Windows_NT') {
    const excelcnvPath = path.join('C:', 'Program Files', 'Microsoft Office', 'root', 'Office16', 'excelcnv.exe');
    const args = ['-oice', xlsPath, xlsxPath];
    try {
      return new Promise((resolve, reject) => {
        childProcess.execFile(
          excelcnvPath,
          args,
          (err) => {
            err ? reject(err) : resolve(); // eslint-disable-line no-unused-expressions
          },
        );
      });
    } catch (err) {
      console.error('Cannot process childProcess.execFile');
      throw err;
    }
  }

  const file = await fs.readFile(xlsPath);
  const convertedFile = await new Promise((resolve, reject) => {
    libre.convert(file, '.xlsx', undefined, (err, data) => (err ? reject(err) : resolve(data)));
  });

  await fs.writeFile(xlsxPath, convertedFile);
  return convertedFile;
};

async function readDataFromExcel(personDirPath) {
  const xlsFilesNames = await fs.readdir(personDirPath);
  const xlsxFilesDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'XlsxFiles'));
  const pathes = await xlsFilesNames.map((xlsFileName) => [
    path.resolve(personDirPath, xlsFileName),
    path.join(xlsxFilesDirPath, `${xlsFileName}x`),
  ]);

  const xlsxPathes = await pathes.map(([, xlsxPath]) => xlsxPath);

  await Promise.all(
    pathes.map(([xlsPath, xlsxPath]) => xlsToXlsx(xlsPath, xlsxPath)),
  );

  return Promise.all(
    xlsxPathes.map((xlsxPath) => {
      const workbook = new Excel.Workbook();
      return workbook.xlsx.readFile(xlsxPath)
        .then(() => {
          const [, , , ...timestamps] = workbook.getWorksheet(1).getColumn(1).values;
          const [, , , ...values] = workbook.getWorksheet(1).getColumn(2).values;
          const measurements = timestamps.map((timestamp, i) => [timestamp, values[i]]);
          return { measurements, xlsxPath };
        });
    }),
  );
}

const fillBackgroundCell = (cell, color) => {
  cell.fill = {
    type: 'pattern',
    pattern: 'lightTrellis',
    bgColor: { argb: color },
  };
};

function writeIterationsToExcel(data, personDirPath) {
  const workbook = new Excel.Workbook();
  workbook.creator = 'Illia Hreben illiahreben@gmail.com';
  workbook.created = new Date();

  data.forEach(({ iterations, xlsxPath }) => {
    const sheetName = path.parse(xlsxPath).name;
    const ws = workbook.addWorksheet(sheetName);
    ws.columns = [
      { header: '№', key: 'id' },
      { header: 'Time', key: 'time' },
      { header: 'Value', key: 'value' },
      {},
      { header: '№', key: 'iteration' },
      { header: 'Sum', key: 'sum' },
      { header: 'Max', key: 'max' },
      { header: 'Var', key: 'var' },
      { header: 'Mad', key: 'mad' },
      { header: 'WAMP', key: 'wamp' },
    ];

    const mainChartData = {
      timeFrames: [],
      iterationsValues: [],
    };

    const calculatedData = iterations.reduce((blank, iteration, i) => {
      const iterationNumber = i + 1;

      ws.addRows(iteration.map(([time, value]) => ({
        id: iterationNumber,
        time,
        value,
      })));

      const [timeFrames, values] = _.zip(...iteration);
      const sum = _.sum(values);
      const max = _.max(values);

      const normalizedTimeFrames = normalizeTimeFrames(
        sampleInArray(timeFrames, 8),
      );

      const timeLabels = toFixedArray(normalizedTimeFrames);
      const chartUrl = createChart({
        iterationNumber,
        values,
        timeLabels,
      });

      mainChartData.timeFrames.push(normalizedTimeFrames);
      mainChartData.iterationsValues.push(values);

      const { variance, rawMad, wamp } = iteration.reduce((acc, [, value], k, arr) => {
        acc.variance += (((sum / arr.length) - value) ** 2) / (arr.length - 1); // variance
        acc.rawMad += Math.abs((sum / arr.length) - value); // rawMad
        if (arr[k + 1] && Math.abs(value - arr[k + 1][1]) >= 10) acc.wamp += 1; // wamp

        return acc;
      }, { variance: 0, rawMad: 0, wamp: 0 });

      const mad = (1 / iteration.length) * rawMad;

      return {
        iteration: [...blank.iteration, iterationNumber],
        sum: [...blank.sum, sum],
        max: [...blank.max, max],
        variance: [...blank.variance, variance],
        mad: [...blank.mad, mad],
        wamp: [...blank.wamp, wamp],
        chartLinks: [...blank.chartLinks, chartUrl],
      };
    }, {
      iteration: ['№'],
      sum: ['Sum'],
      max: ['Max'],
      variance: ['Var'],
      mad: ['Mad'],
      wamp: ['WAMP'],
      chartLinks: [],
    });

    ws.getColumn('iteration').values = calculatedData.iteration;
    ws.getColumn('sum').values = calculatedData.sum;
    ws.getColumn('max').values = calculatedData.max;
    ws.getColumn('var').values = calculatedData.variance;
    ws.getColumn('mad').values = calculatedData.mad;
    ws.getColumn('wamp').values = calculatedData.wamp;

    ws.eachRow((row) => {
      const iterationNumber = Number.isInteger(row.values[1]) ? row.values[1] : 0;

      const color = pickValueInCycle(iterationNumber, colors.cell);
      fillBackgroundCell(row.getCell('id'), color);
      fillBackgroundCell(row.getCell('time'), color);
      fillBackgroundCell(row.getCell('value'), color);
    });

    createMainChart({
      timeLabels: toFixedArray(getAverageValues(mainChartData.timeFrames)),
      iterationsValues: sampleInArray(mainChartData.iterationsValues, 7),
    });
  });

  return workbook.xlsx.writeFile(path.resolve(`${personDirPath}.xlsx`));
}

const calculateAndConvert = async (personDirPath) => {
  const data = await readDataFromExcel(personDirPath);

  const iterationsAndPath = data.map(({ measurements, xlsxPath }) => {
    const iterations = measurementsToIterations(measurements);
    return { iterations, xlsxPath };
  });

  return writeIterationsToExcel(iterationsAndPath, personDirPath);
};

module.exports = { readDataFromExcel, writeIterationsToExcel, calculateAndConvert };
