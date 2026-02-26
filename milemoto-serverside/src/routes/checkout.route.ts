import { Router } from 'express';
import { CheckoutQuoteInput, CheckoutSubmitInput } from '@milemoto/types';
import { requireAuth } from '../middleware/authz.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { quoteCheckout } from '../services/checkout/quote.js';
import { submitCheckoutCod } from '../services/checkout/submit.js';

export const checkout = Router();

checkout.use(requireAuth);

checkout.post(
  '/quote',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const body = CheckoutQuoteInput.parse(req.body ?? {});
    const result = await quoteCheckout(userId, body);
    res.json(result);
  })
);

checkout.post(
  '/submit',
  asyncHandler(async (req, res) => {
    const userId = Number(req.user!.id);
    const body = CheckoutSubmitInput.parse(req.body);
    const result = await submitCheckoutCod(userId, body);
    res.status(201).json(result);
  })
);
