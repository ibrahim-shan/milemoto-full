import { Router } from 'express';
import { z } from 'zod';
import * as gradeService from '../../services/grade.service.js';
import { requirePermission } from '../../middleware/authz.js';
import { CreateGrade, UpdateGrade, ListQuery } from './helpers/grade.helpers.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

// GET /admin/grades
router.get(
  '/',
  requirePermission('grades.read'),
  asyncHandler(async (req, res) => {
    const query = ListQuery.parse(req.query);
    const result = await gradeService.listGrades(query);
    res.json(result);
  })
);

// GET /admin/grades/:id
router.get(
  '/:id',
  requirePermission('grades.read'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const grade = await gradeService.getGrade(id);
    res.json(grade);
  })
);

// POST /admin/grades
router.post(
  '/',
  requirePermission('grades.manage'),
  asyncHandler(async (req, res) => {
    const data = CreateGrade.parse(req.body);
    const grade = await gradeService.createGrade(data);
    res.status(201).json(grade);
  })
);

// PUT /admin/grades/:id
router.put(
  '/:id',
  requirePermission('grades.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    const data = UpdateGrade.parse(req.body);
    const grade = await gradeService.updateGrade(id, data);
    res.json(grade);
  })
);

// DELETE /admin/grades/:id
router.delete(
  '/:id',
  requirePermission('grades.manage'),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().min(1).parse(req.params.id);
    await gradeService.deleteGrade(id);
    res.status(204).send();
  })
);

export default router;
