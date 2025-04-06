import express from 'express';
import api from './api/index.ts';

const app = express();

app.use('/api', api);

if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client/'));
    app.get('*', (_req, res) => {
        res.sendFile('index.html');
    });
}

export { app };
