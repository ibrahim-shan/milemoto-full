import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import { ListQuery, UpdateCustomer } from './helpers/customer.helpers.js';
import { getCustomer, listCustomers, updateCustomer } from '../../services/customer.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const customerAdmin = Router();

customerAdmin.get(
  '/',
  requirePermission('customers.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await listCustomers(query);
    res.json(result);
  })
);

customerAdmin.get(
  '/:id',
  requirePermission('customers.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const customer = await getCustomer(String(id));
    res.json(customer);
  })
);

customerAdmin.put(
  '/:id',
  requirePermission('customers.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const data = UpdateCustomer.parse(req.body);
    const customer = await updateCustomer(String(id), data);
    res.json(customer);
  })
);

export default customerAdmin;
