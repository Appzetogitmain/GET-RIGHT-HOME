import express from 'express';
import { checkManagerPermission } from '../middlewares/managerPermission.js';
import { getBuilders, getPendingBuilders, verifyBuilder, addBuilder, updateBuilder, deleteBuilder } from '../controllers/builderController.js';

const router = express.Router();

// Apply manager module authorization
router.get('/pending', checkManagerPermission('builders', 'view'), getPendingBuilders);
router.put('/:id/verify', checkManagerPermission('builders', 'edit'), verifyBuilder);

router.get('/', checkManagerPermission('builders', 'view'), getBuilders);
router.post('/', checkManagerPermission('builders', 'add'), addBuilder);
router.put('/:id', checkManagerPermission('builders', 'edit'), updateBuilder);
router.delete('/:id', checkManagerPermission('builders', 'delete'), deleteBuilder);

export default router;
