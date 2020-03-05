const fs = require('fs').promises
const childProcess = require('child_process')
const path = require('path')
const Excel = require('exceljs')
const os = require('os')


const xlsToXlsx = (xlsPath, xlsxPath) => {

  const excelcnvPath = path.join('C:', 'Program Files', 'Microsoft Office', 'root', 'Office16', 'excelcnv.exe')
  const arguments = [ '-oice', xlsPath, xlsxPath ]

  return new Promise((resolve, reject) => {
    childProcess.execFile(
      excelcnvPath,
      arguments,
      (err, out, stdErr) => {
        // console.log(out, stdErr, xlsPath);
        err ? reject(err) : resolve()
      }
    )
  })
}

function readDataFromExcel(personDirPath) {

  return fs.readdir(personDirPath)
    .then(xlsFilesNames => {
      return fs.mkdtemp(path.join(os.tmpdir(), 'XlsxFiles'))
        .then(xlsxFilesDirPath => {
          return xlsFilesNames.map(xlsFileName => [
            path.resolve(personDirPath, xlsFileName),
            path.join(xlsxFilesDirPath, xlsFileName + 'x')
          ])
        })
    })
    .then(pathes => {
      return pathes.reduce((acc, [xlsPath, xlsxPath]) => {
        return acc.then(() => xlsToXlsx(xlsPath, xlsxPath))
      }, Promise.resolve())
        .then(() => pathes.map(([, xlsxPathes]) => xlsxPathes))
    })
    .then(xlsxPathes => {
      return Promise.all(
        xlsxPathes.map(xlsxPath => {

          const workbook = new Excel.Workbook();
          return workbook.xlsx.readFile(xlsxPath)
            .then(() => {
              const [, , , ...timestamps] = workbook.getWorksheet(1).getColumn(1).values
              const [, , , ...values] = workbook.getWorksheet(1).getColumn(2).values
              const measurements = timestamps.map((timestamp, i) => [timestamp, values[i]])
              return {measurements, xlsxPath}
            })

        })
      )
    })
}

function setCell(worksheet, cell, value) {
  worksheet.getCell(cell).value = value
}


function writeIterationsToExcel(data, personDirPath) {
  const workbook = new Excel.Workbook()

  for (const {iterations, xlsxPath} of data) {
    const sheetName = path.parse(xlsxPath).name
    const sheet = workbook.addWorksheet(sheetName)

    iterations.forEach((iteration, i) => {
      const iterationSumAndMax = iteration.reduce((acc, [time, value]) => {
        sheet.addRow([i+1, time, value])
        acc.sum += value
        if (value > acc.max) acc.max = value
        return acc
      }, {sum: 0, max: 0})

      const iterationVarAndMad = iteration.reduce((acc, [ , value], i, arr) => {
        acc.variance += ((Math.pow((iterationSumAndMax.sum / arr.length) - value, 2)) / (arr.length - 1))
        acc.rawMad += Math.abs((iterationSumAndMax.sum / arr.length) - value)
        return acc
      }, {variance: 0, rawMad: 0})

      const mad = (1 / iteration.length) * iterationVarAndMad.rawMad

      sheet.getCell('E' + (i+2)).value = i+1
      sheet.getCell('F' + (i+2)).value = iterationSumAndMax.sum
      sheet.getCell('G' + (i+2)).value = iterationSumAndMax.max
      sheet.getCell('H' + (i+2)).value = iterationVarAndMad.variance
      sheet.getCell('I' + (i+2)).value = mad
    })

    sheet.getCell('E1').value = 'IterNum'
    sheet.getCell('F1').value = 'Sum'
    sheet.getCell('G1').value = 'Max'
    sheet.getCell('H1').value = 'Var'
    sheet.getCell('I1').value = 'Mad'
  }

   return workbook.xlsx.writeFile(path.resolve(personDirPath + '.xlsx'))
}


module.exports = {readDataFromExcel, writeIterationsToExcel}
