import { Router } from 'express';

const router = Router();

router.use('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

export default router;
