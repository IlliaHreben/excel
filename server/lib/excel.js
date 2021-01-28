const fs           = require('fs').promises;
const childProcess = require('child_process');
const path         = require('path');
const Excel        = require('exceljs');
const os           = require('os');
const libre        = require('libreoffice-convert');
const _            = require('lodash');

const { createChart, createMainChart } = require('./charts');
const { colors, workbook: { CHART } }  = require('./constants');
const {
    pickValueInCycle,
    measurementsToIterations,
    // sampleInArray,
    normalizeTimeFrames,
    toFixedArray,
    // getAverageValues,
    normalizeIterations,
} = require('./calculations');

const xlsToXlsx = async (xlsPath, xlsxPath) => {
    if (os.type() === 'Windows_NT') {
        const excelcnvPath = path.join('C:', 'Program Files', 'Microsoft Office', 'root', 'Office16', 'excelcnv.exe');
        const args         = ['-oice', xlsPath, xlsxPath];
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

    const file          = await fs.readFile(xlsPath);
    const convertedFile = await new Promise((resolve, reject) => {
        libre.convert(file, '.xlsx', undefined, (err, data) => (err ? reject(err) : resolve(data)));
    });

    await fs.writeFile(xlsxPath, convertedFile);
    return convertedFile;
};

async function readDataFromExcel(personDirPath) {
    const xlsFilesNames    = await fs.readdir(personDirPath);
    const xlsxFilesDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'XlsxFiles'));
    const pathes           = await xlsFilesNames.map((xlsFileName) => [
        path.resolve(personDirPath, xlsFileName),
        path.join(xlsxFilesDirPath, `${xlsFileName}x`),
    ]);

    const xlsxPathes = await pathes.map(([, xlsxPath]) => xlsxPath);

    await Promise.all(
        pathes.map(([xlsPath, xlsxPath]) => xlsToXlsx(xlsPath, xlsxPath)),
    );

    return Promise.all(
        xlsxPathes.map((xlsxPath) => {
            const wb = new Excel.Workbook();
            return wb.xlsx.readFile(xlsxPath)
                .then(() => {
                    const [, , , ...timestamps] = wb.getWorksheet(1).getColumn(1).values;
                    const [, , , ...values]     = wb.getWorksheet(1).getColumn(2).values;
                    const measurements          = timestamps.map(
                        (timestamp, i) => [timestamp, values[i]],
                    );
                    return { measurements, xlsxPath };
                });
        }),
    );
}

const fillBackgroundCell = (cell, color) => {
    cell.fill = {
        type   : 'pattern',
        pattern: 'lightTrellis',
        bgColor: { argb: color },
    };
};

const renderCharts = async (iterations) => {
    const normalized = normalizeIterations(iterations);

    const chartPromises = normalized.map(createChart);
    return Promise.all(chartPromises);
};

const addChartsToWS = async ({
    ws, wb, charts, chartsSchema,
}) => {
    const imageRows = 5;

    const maxImgsPerLine = Math.ceil(charts.length / imageRows);
    let currentLine    = 0;
    let currentColumn  = -1;

    charts.forEach((buffer, i) => {
        currentColumn += 1;
        if (i + 1 > maxImgsPerLine * (currentLine + 1)) {
            currentLine += 1;
            currentColumn = 0;
        }
        const mainChart = wb.addImage({
            buffer,
            extension: 'png',
        });

        ws.addImage(mainChart, {
            tl: {
                col: CHART.START_PLACEMENT_COLUMN + (currentColumn * CHART.SMALL.COLUMNS),
                row: CHART.START_PLACEMENT_ROW + (currentLine * CHART.SMALL.ROWS),
            },
            ext: {
                width : CHART.SMALL.WIDTH,
                height: CHART.SMALL.HEIGHT,
            },
        });
    });

    const mainChartBuffer = await createMainChart(chartsSchema);

    const mainChart = wb.addImage({
        buffer   : mainChartBuffer,
        extension: 'png',
    });

    const startMainChartRow = imageRows * CHART.SMALL.ROWS + 1;

    ws.addImage(mainChart, {
        tl: {
            col: CHART.START_PLACEMENT_COLUMN,
            row: startMainChartRow,
        },
        ext: {
            width : CHART.BIG.WIDTH,
            height: CHART.BIG.HEIGHT,
        },
    });
};

async function writeIterationsToExcel(data, personDirPath) {
    const wb         = new Excel.Workbook();
    wb.creator = 'Illia Hreben illiahreben@gmail.com';
    wb.created = new Date();

    await Promise.all(data.map(async ({ iterations, xlsxPath }) => {
        const sheetName  = path.parse(xlsxPath).name;
        const ws         = wb.addWorksheet(sheetName);
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
            timeFrames      : [],
            iterationsValues: [],
        };

        const normalizedIterations = iterations.map((iteration) => {
            const [timeFrames, values] = _.zip(...iteration);

            const normalizedTimeFrames = normalizeTimeFrames(timeFrames);

            return _.unzip([toFixedArray(normalizedTimeFrames), values]);
        });

        const calculatedData = normalizedIterations.reduce((blank, iteration, i) => {
            const iterationNumber = i + 1;

            ws.addRows(iteration.map(([time, value]) => ({
                id: iterationNumber,
                time,
                value,
            })));

            const [timeFrames, values] = _.zip(...iteration);
            const sum                  = _.sum(values);
            const max                  = _.max(values);

            const normalizedTimeFrames = normalizeTimeFrames(timeFrames);

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
                sum      : [...blank.sum, sum],
                max      : [...blank.max, max],
                variance : [...blank.variance, variance],
                mad      : [...blank.mad, mad],
                wamp     : [...blank.wamp, wamp],
            };
        }, {
            iteration: ['№'],
            sum      : ['Sum'],
            max      : ['Max'],
            variance : ['Var'],
            mad      : ['Mad'],
            wamp     : ['WAMP'],
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

        const chartsData = await renderCharts(normalizedIterations);

        const [charts, chartsSchema] = _.zip(...chartsData);

        await addChartsToWS({
            ws,
            wb,
            charts,
            chartsSchema: chartsSchema.flat(),
        });
    }));

    return wb.xlsx.writeFile(path.resolve(`${personDirPath}.xlsx`));
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
