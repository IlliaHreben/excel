const fs           = require('fs').promises;
const childProcess = require('child_process');
const path         = require('path');
const Excel        = require('exceljs');
const os           = require('os');
const libre        = require('libreoffice-convert');
const _            = require('lodash');

const { createChart, createMainChart }      = require('./charts');
const { colors, workbook: { CHART, DATA } } = require('./constants');
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

function fillNormalizedValues({ ws }) {
    const meanColumn  = ws.getColumn('mean').values;
    const stdevColumn = ws.getColumn('stdev').values;
    ws.eachRow((row, i) => {
        if (i === 1) return;
        const calculatedDataRowNumber = +row.getCell('id').value + 1;

        const mean  = meanColumn[calculatedDataRowNumber];
        const stdev = stdevColumn[calculatedDataRowNumber];
        if (i === 2) console.log({ mean, stdev });
    });
    console.log(meanColumn);
}

const getIterationsFirstLastCells = ({ ws }) => {
    const firstLastCells = [];

    ws.eachRow((row, i) => {
        if (i === 1 || i === 0) return;

        const iterNum = row.getCell(DATA.PLACEMENTS.NUMBER).value - 1;
        if (!firstLastCells[iterNum]) firstLastCells[iterNum] = { min: i, max: 0 };

        firstLastCells[iterNum].max = Math.max(firstLastCells[iterNum].max, i);
    });

    return firstLastCells.map(({ min, max }) => ({
        placement: `${DATA.PLACEMENTS.VALUE}${min}:${DATA.PLACEMENTS.VALUE}${max}`,
        min,
        max,
    }));
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

const fillCalculatedData = ({ ws, calculatedData }) => {
    const iterationsFirstLastCells = getIterationsFirstLastCells({ ws });

    // stdev
    const stdDevFormulas = iterationsFirstLastCells.map(
        ({ placement }) => `=STDEV(${placement})`,
    );

    calculatedData.stdev = calculatedData.stdev
        .map((value, i) => ({ value, formula: stdDevFormulas[i] }));

    calculatedData.stdev.unshift('STDEV');
    // mean
    calculatedData.mean = iterationsFirstLastCells.map(
        ({ placement }, i) => ({
            value  : calculatedData.mean[i],
            formula: `=AVERAGE(${placement})`,
        }),
    );
    calculatedData.mean.unshift('Mean');

    Object.entries(calculatedData).forEach(([designation, values]) => {
        ws.getColumn(designation).values = values;
    });
};

// function getCellsData({
//     ws, columnName, from, to,
// }) {
//     const column = ws.getColumn(columnName);
//     return column.values.slice(from, to);
// }

async function writeIterationsToExcel(data, personDirPath) {
    const wb   = new Excel.Workbook();
    wb.creator = 'Illia Hreben illiahreben@gmail.com';
    wb.created = new Date();

    await Promise.all(data.map(async ({ iterations, xlsxPath }) => {
        const sheetName  = path.parse(xlsxPath).name;
        const ws         = wb.addWorksheet(sheetName);
        ws.columns = [
            { header: '№', key: 'id' },
            { header: 'Time', key: 'time' },
            { header: 'Value', key: 'value' },
            { header: 'Normalized', key: 'norm' },
            { header: '№', key: 'iteration' },
            { header: 'Sum', key: 'sum' },
            { header: 'Max', key: 'max' },
            { header: 'Var', key: 'var' },
            { header: 'Mad', key: 'mad' },
            { header: 'WAMP', key: 'wamp' },
            { header: 'STDEV', key: 'stdev' },
            { header: 'Mean', key: 'mean' },
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

            const mean = (sum / iteration.length).toFixed(2);
            const mad = (1 / iteration.length) * rawMad;

            const stdev = _.round(Math.sqrt(
                iteration.reduce((acc, [, value]) => acc + ((value - mean) ** 2), 0)
                / (iteration.length - 1),
            ), 4);

            return {
                iteration: [...blank.iteration, iterationNumber],
                sum      : [...blank.sum, sum],
                max      : [...blank.max, max],
                var      : [...blank.var, variance],
                mad      : [...blank.mad, mad],
                wamp     : [...blank.wamp, wamp],
                mean     : [...blank.mean, mean],
                stdev    : [...blank.stdev, stdev],
            };
        }, {
            iteration: ['№'],
            sum      : ['Sum'],
            max      : ['Max'],
            var      : ['Var'],
            mad      : ['Mad'],
            wamp     : ['WAMP'],
            mean     : [],
            stdev    : [],
        });

        fillCalculatedData({ ws, calculatedData });

        ws.eachRow((row) => {
            const iterationNumber = Number.isInteger(row.values[1]) ? row.values[1] : 0;

            const color = pickValueInCycle(iterationNumber, colors.cell);
            fillBackgroundCell(row.getCell('id'), color);
            fillBackgroundCell(row.getCell('time'), color);
            fillBackgroundCell(row.getCell('value'), color);
        });

        const chartsData = await renderCharts(normalizedIterations);

        const [charts, chartsSchema] = _.zip(...chartsData);
        fillNormalizedValues({ ws });

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
