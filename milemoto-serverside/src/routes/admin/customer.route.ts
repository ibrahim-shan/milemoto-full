import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/authz.js';
import { ListQuery, UpdateCustomer } from './helpers/customer.helpers.js';
import { getCustomer, listCustomers, updateCustomer } from '../../services/customer.service.js';

const customerAdmin = Router();

customerAdmin.get('/', requirePermission('customers.read'), async (req, res, next) => {
  try {
    const query = ListQuery.parse(req.query);
    const result = await listCustomers(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

customerAdmin.get('/:id', requirePermission('customers.read'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const customer = await getCustomer(String(id));
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

customerAdmin.put('/:id', requirePermission('customers.manage'), async (req, res, next) => {
  try {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const data = UpdateCustomer.parse(req.body);
    const customer = await updateCustomer(String(id), data);
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

export default customerAdmin;
