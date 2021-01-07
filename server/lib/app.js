const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const { calculateAndConvert } = require('../main');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsPath = `uploads/${new Date().toLocaleString()}`;
    fs.mkdirSync(uploadsPath, { recursive: true });
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const fileFilter = (req, file, next) => {
  if (file.mimetype === 'application/vnd.ms-excel') {
    next(null, true);
  } else {
    next(null, false);
  }
};

const upload = multer({ dest: 'uploads/', storage, fileFilter });

const port = 8080;
const host = 'localhost';

const api = express.Router()
  .get('/hello', (req, res) => { res.send('hello'); })
  .post('/xls', upload.array('xls'), (req, res) => {
    if (!req.files.length) {
      res.send({ ok: false });
      return;
    }
    res.send({
      ok: true,
      data: req.files.map((file) => ({
        filename: file.filename,
        destination: file.destination,
        path: file.path,
      })),
    });
  })
  .get('/xlsx', async (req, res) => {
    const { destination } = req.query;
    if (!destination) {
      res.send({ ok: false });
      return;
    }
    try {
      await calculateAndConvert(destination);
    } catch (error) {
      console.error(error);
    }

    res.sendFile(path.resolve(__dirname, `../${destination}.xlsx`));
  });

const app = express()
  .use(bodyParser.json())
  .use('/api', api);

app.listen(port, () => {
  console.log(`App listening at http://${host}:${port}`);
});
