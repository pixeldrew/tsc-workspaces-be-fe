import http from 'node:http';
import { app } from './app.ts';

const server = http.createServer(app as (req: unknown, res: unknown) => void);

server.listen(process.env.PORT ?? 3000, () => {
    console.log(`Server is listening...`);
});
