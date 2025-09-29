import { Router } from 'express';
import { queryAuditLogs, getAuditStats } from '../../middleware/audit';
import { rateLimitMiddleware } from '../../middleware/ratelimit';
import { auditMiddleware } from '../../middleware/audit';

const router = Router();

// Apply middleware to all routes
router.use(auditMiddleware);
router.use(rateLimitMiddleware({ maxTokens: 30, refillRate: 30 })); // Lower limits for management API

// GET /mgmt/audit/logs - Query audit logs
router.get('/logs', async (req, res) => {
  try {
    const {
      keyPrefix,
      keyId,
      method,
      pathPattern,
      statusCode,
      fromDate,
      toDate,
      limit = 100,
      offset = 0,
      export: exportFormat
    } = req.query;

    const filters = {
      keyPrefix: keyPrefix as string,
      keyId: keyId as string,
      method: method as string,
      pathPattern: pathPattern as string,
      statusCode: statusCode ? parseInt(statusCode as string, 10) : undefined,
      fromDate: fromDate as string,
      toDate: toDate as string,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10)
    };

    const result = await queryAuditLogs(filters);

    if (exportFormat === 'true') {
      // Export as JSON file
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`);
      return res.json({
        exportedAt: new Date().toISOString(),
        filters,
        data: result.entries
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Audit logs query error:', error);
    res.status(500).json({ error: 'Failed to query audit logs' });
  }
});

// GET /mgmt/audit/stats - Get audit statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getAuditStats();
    res.json(stats);
  } catch (error) {
    console.error('Audit stats error:', error);
    res.status(500).json({ error: 'Failed to get audit statistics' });
  }
});

export default router;