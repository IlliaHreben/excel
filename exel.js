/* eslint-disable max-len */
/* eslint-disable no-console */
const fs = require('fs').promises;
// const childProcess = require('child_process');
const path = require('path');
const Excel = require('exceljs');
const os = require('os');
const libre = require('libreoffice-convert');

const xlsToXlsx = async (xlsPath, xlsxPath) => {
  const file = await fs.readFile(xlsPath);

  await libre.convert(file, '.xlsx', undefined, async (err, data) => {
    if (err) {
      console.log(`Error converting file: ${err}`);
    }

    // Here in done you have pdf file which you can save or transfer in another stream
    const result = await fs.writeFile(xlsxPath, data);
    return result;
  });

  // const excelcnvPath = path.join('C:', 'Program Files', 'Microsoft Office', 'root', 'Office16', 'excelcnv.exe')
  // const arguments = [ '-oice', xlsPath, xlsxPath ]

  // return new Promise((resolve, reject) => {
  //   childProcess.execFile(
  //     excelcnvPath,
  //     arguments,
  //     (err, out, stdErr) => {
  //       // console.log(out, stdErr, xlsPath);
  //       err ? reject(err) : resolve()
  //     }
  //   )
  // })
};

async function readDataFromExcel(personDirPath) {
  return fs.readdir(personDirPath)
    .then((xlsFilesNames) => fs.mkdtemp(path.join(os.tmpdir(), 'XlsxFiles'))
      .then((xlsxFilesDirPath) => xlsFilesNames.map((xlsFileName) => [
        path.resolve(personDirPath, xlsFileName),
        path.join(xlsxFilesDirPath, `${xlsFileName}x`),
      ])))
    .then((pathes) => pathes
      .reduce(
        (acc, [xlsPath, xlsxPath]) => acc.then(async () => {
          const result = await xlsToXlsx(xlsPath, xlsxPath);
          return result;
        }),
        Promise.resolve(),
      )
      .then(() => pathes.map(([, xlsxPathes]) => xlsxPathes)))
    .then((xlsxPathes) => Promise.all(
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
    ));
}

// function setCell(worksheet, cell, value) {
//   worksheet.getCell(cell).value = value;
// }

function writeIterationsToExcel(data, personDirPath) {
  const workbook = new Excel.Workbook();

  data.forEach(({ iterations, xlsxPath }) => {
    const sheetName = path.parse(xlsxPath).name;
    const sheet = workbook.addWorksheet(sheetName);

    iterations.forEach((iteration, i) => {
      const { sum, max } = iteration.reduce((acc, [time, value]) => {
        sheet.addRow([i + 1, time, value]);
        acc.sum += value;
        if (value > acc.max) acc.max = value;
        return acc;
      }, { sum: 0, max: 0 });

      const { variance, rawMad, wamp } = iteration.reduce((acc, [, value], k, arr) => {
        acc.variance += (((sum / arr.length) - value) ** 2) / (arr.length - 1); // variance
        acc.rawMad += Math.abs((sum / arr.length) - value); // rawMad
        if (arr[k + 1] && Math.abs(value - arr[k + 1][1]) >= 10) acc.wamp += 1; // wamp

        return acc;
      }, { variance: 0, rawMad: 0, wamp: 0 });

      const mad = (1 / iteration.length) * rawMad;

      sheet.getCell(`E${i + 2}`).value = i + 1;
      sheet.getCell(`F${i + 2}`).value = sum;
      sheet.getCell(`G${i + 2}`).value = max;
      sheet.getCell(`H${i + 2}`).value = variance;
      sheet.getCell(`I${i + 2}`).value = mad;
      sheet.getCell(`J${i + 2}`).value = wamp;
    });

    sheet.getCell('E1').value = 'IterNum';
    sheet.getCell('F1').value = 'Sum';
    sheet.getCell('G1').value = 'Max';
    sheet.getCell('H1').value = 'Var';
    sheet.getCell('I1').value = 'Mad';
    sheet.getCell('J1').value = 'WAMP';
  });

  return workbook.xlsx.writeFile(path.resolve(`${personDirPath}.xlsx`));
}

module.exports = { readDataFromExcel, writeIterationsToExcel };
