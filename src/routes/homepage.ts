import { Router } from 'express';
import { getHomepageConfig, updateHomepageConfig } from '../controllers/homepageController';

const router = Router();

router.get('/config', getHomepageConfig);
router.post('/config', updateHomepageConfig);

export default router;