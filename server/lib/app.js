const express = require('express');
const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
const multer = require('multer');
const fs = require('fs').promises;

const { calculateAndConvert } = require('./excel');
const { telegramNotification } = require('./api/telegram');

function roundSeconds(date) {
    date.setHours(date.getHours() + Math.round(date.getSeconds() / 60));
    date.setSeconds(0, 0, 0); // Resets also seconds and milliseconds

    return date;
}

const storage = multer.diskStorage({
    destination: async (req, file, next) => {
        try {
            const uploadsPath = `uploads/${+roundSeconds(new Date())}`;
            await fs.mkdir(uploadsPath, { recursive: true });
            next(null, uploadsPath);
        } catch (error) {
            console.error(error);
            await telegramNotification(error.toString());
        }
    },
    filename: (req, file, next) => {
        next(null, file.originalname);
    },
});

const fileFilter = async (req, file, next) => {
    try {
        if (file.mimetype === 'application/vnd.ms-excel') {
            next(null, true);
        } else {
            next(null, false);
        }
        await telegramNotification(file);
    } catch (error) {
        console.error(error);
        await telegramNotification(error.toString());
    }
};

const upload = multer({ dest: 'uploads/', storage, fileFilter });

const port = process.env.APP_PORT || process.env.PORT || 8081;
const host = 'localhost';

const api = express.Router()
    .get('/hello', (req, res) => { res.send('hello'); })
    .post('/xls', upload.array('xls'), async (req, res) => {
        try {
            if (!req.files.length) {
                res.send({ ok: false, error: 'Invalid format. Only .xls files.' });
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
        } catch (error) {
            await telegramNotification(error.toString());
            console.error(error);
            res.send({
                ok   : false,
                error: 'Something went wrong',
            });
        }
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
            await telegramNotification(error.toString());
            res.send({
                ok   : false,
                error: 'Something went wrong',
            });
        }
        res.send({ ok: true, body: {} });
    // res.sendFile(path.resolve(__dirname, `../${destination}.xlsx`));
    })
    .post('/telegramNotification', async (req, res) => {
        try {
            await telegramNotification(req.body);
            res.send({ ok: true });
        } catch (error) {
            console.log(error);
            await telegramNotification(error.toString());
            res.send({
                ok: false,
            });
        }
    });

const app = express()
    .use(serveStatic('../client/build', { extensions: ['html'] }))
    .use('/uploads', serveStatic('./uploads'))
    .use(bodyParser.json({
        verify: (req, res, buf) => {
            console.log(buf.toString());
            try {
                JSON.parse(buf);
                console.log(JSON.parse(buf));
            } catch (e) {
                console.log('1111111111111', e);
                res.send({
                    ok   : false,
                    error: {
                        code   : 'BROKEN_JSON',
                        message: 'Please, verify your json',
                    },
                });
                throw new Error('BROKEN_JSON');
            }
        },
    }))
    .use('/api', api)
    .use((err, req, res) => {
        console.error(err.stack);
        res.send({
            ok   : false,
            error: 'Something went wrong',
        });
    });

app.listen(port, async () => {
    console.log(`App listening at http://${host}:${port}`);
    if (port !== 8081) await telegramNotification(`Container was rased at ${new Date().toLocaleString()}`);
});
