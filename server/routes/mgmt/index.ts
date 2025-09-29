import { Router } from 'express';
import keysRouter from './keys';
import webhooksRouter from './webhooks';

const router = Router();

// Mount management routes
router.use('/keys', keysRouter);
router.use('/webhooks', webhooksRouter);

// Management API health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'management-api'
  });
});

export default router;