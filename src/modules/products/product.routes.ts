import { Router } from 'express';
import { ProductController } from './product.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  listProductsSchema
} from './product.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(listProductsSchema), ProductController.list);
router.get('/:productId', ProductController.getById);
router.post('/', validate(createProductSchema), ProductController.create);
router.patch('/:productId', validate(updateProductSchema), ProductController.update);

export const productRouter = router;
