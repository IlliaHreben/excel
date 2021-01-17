const express = require('express');
const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
const multer = require('multer');
const fs = require('fs').promises;

const { calculateAndConvert } = require('./excel');
const { telegramNotification } = require('./api/telegram');

const storage = multer.diskStorage({
    destination: async (req, file, next) => {
        const uploadsPath = `uploads/${new Date().toLocaleString()}`;
        await fs.mkdir(uploadsPath, { recursive: true });
        next(null, uploadsPath);
    },
    filename: (req, file, next) => {
        next(null, file.originalname);
    },
});

const fileFilter = async (req, file, next) => {
    await telegramNotification(file);
    if (file.mimetype === 'application/vnd.ms-excel') {
        next(null, true);
    } else {
        next(null, false);
    }
};

const upload = multer({ dest: 'uploads/', storage, fileFilter });

const port = process.env.APP_PORT || process.env.PORT || 8080;
const host = 'localhost';

const api = express.Router()
    .get('/hello', (req, res) => { res.send('hello'); })
    .post('/xls', upload.array('xls'), (req, res) => {
        if (!req.files.length) {
            res.send({ ok: false });
            return;
        }
        res.send({
            ok  : true,
            data: req.files.map((file) => ({
                filename   : file.filename,
                destination: file.destination,
                path       : file.path,
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
            await telegramNotification(error.toString());
            console.error(error);
        }
        res.send({ ok: true, body: {} });
    // res.sendFile(path.resolve(__dirname, `../${destination}.xlsx`));
    })
    .post('/telegramNotification', async (req, res) => {
        try {
            await telegramNotification(req.body);
            res.send({ ok: true });
        } catch (error) {
            await telegramNotification(error.toString());
            console.log(error);
            res.send({
                ok: false,
            });
        }
    });

const app = express()
    .use(serveStatic('../client/build', { extensions: ['html'] }))
    .use('/uploads', serveStatic('./uploads'))
    .use(bodyParser.json())
    .use('/api', api);

app.listen(port, async () => {
    console.log(`App listening at http://${host}:${port}`);
    if (port !== 8080) await telegramNotification(`Container was rased at ${new Date().toLocaleString()}`);
});
