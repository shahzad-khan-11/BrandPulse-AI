import express from 'express';
import { createBrand, getBrands, getBrandById, deleteBrand, updateBrand } from '../controllers/brandController.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { createBrandSchema } from '../validators/brandValidator.js';

const router = express.Router();

router.use(protect); // All brand routes require authentication

router.route('/')
  .post(validate(createBrandSchema), createBrand)
  .get(getBrands);

router.route('/:id')
  .get(getBrandById)
  .put(updateBrand)
  .delete(deleteBrand);

export default router;
