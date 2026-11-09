const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

const sectorScoreSchema = z.number().min(0, 'Score cannot be less than 0').max(100, 'Score cannot exceed 100');

const villageUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  population: z.number().int().min(0).optional(),
  households: z.number().int().min(0).optional(),
  sectors: z.object({
    sanitation: sectorScoreSchema.optional(),
    water: sectorScoreSchema.optional(),
    education: sectorScoreSchema.optional(),
    roads: sectorScoreSchema.optional(),
    electricity: sectorScoreSchema.optional(),
    healthcare: sectorScoreSchema.optional(),
  }).optional(),
});

const projectCreateSchema = z.object({
  villageId: z.string().min(1, 'Village ID is required'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  sector: z.enum(['sanitation', 'water', 'education', 'roads', 'electricity', 'healthcare']),
  budget: z.number().positive('Budget must be positive'),
  spent: z.number().min(0).optional().default(0),
  startDate: z.string().or(z.date()),
  dueDate: z.string().or(z.date()),
  assignee: z.string().optional().default('Gram Panchayat Officer'),
  notes: z.string().optional().default(''),
});

const projectStatusSchema = z.object({
  status: z.enum(['planned', 'approved', 'in_progress', 'completed', 'delayed']),
  notes: z.string().optional(),
  evidence: z.array(z.string()).optional(),
});

const changeRequestSchema = z.object({
  villageId: z.string().min(1, 'Village ID is required'),
  sector: z.enum(['sanitation', 'water', 'education', 'roads', 'electricity', 'healthcare']),
  oldValue: sectorScoreSchema,
  newValue: sectorScoreSchema,
  note: z.string().min(5, 'Rationale note must be at least 5 characters'),
  evidence: z.string().optional().nullable(),
});

const changeRequestReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().optional(),
});

const budgetOptimizeSchema = z.object({
  blockId: z.string().min(1, 'Block is required'),
  total: z.number().positive('Total budget must be positive'),
  lockedAllocations: z.array(z.object({
    villageId: z.string(),
    sector: z.string(),
    amount: z.number().min(0),
  })).optional(),
  minPerVillage: z.number().min(0).optional(),
  maxPerVillage: z.number().min(0).optional(),
});

const budgetSimulateSchema = z.object({
  villageId: z.string().min(1, 'Village ID is required'),
  sector: z.enum(['sanitation', 'water', 'education', 'roads', 'electricity', 'healthcare']),
  investmentAmount: z.number().min(0, 'Investment amount must be non-negative'),
});

const challengeCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  participants: z.array(z.object({
    entityType: z.enum(['village', 'block']),
    entityId: z.string(),
    name: z.string(),
  })).min(2, 'Challenge requires at least 2 participants'),
  sector: z.enum(['sanitation', 'water', 'education', 'roads', 'electricity', 'healthcare']),
  target: z.number().positive('Target improvement must be positive'),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
});

function validateBody(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      return res.status(400).json({ success: false, error: 'Malformed request body' });
    }
  };
}

module.exports = {
  loginSchema,
  changePasswordSchema,
  villageUpdateSchema,
  projectCreateSchema,
  projectStatusSchema,
  changeRequestSchema,
  changeRequestReviewSchema,
  budgetOptimizeSchema,
  budgetSimulateSchema,
  challengeCreateSchema,
  validateBody,
};
