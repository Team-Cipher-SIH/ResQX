import { z } from 'zod';

export const incidentSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description is too long'),

  type: z.enum([
    'flood',
    'earthquake',
    'fire',
    'landslide',
    'cyclone',
    'other',
  ]),

  severity: z.enum([
    'low',
    'medium',
    'high',
  ]),

  state: z
    .string()
    .min(2, 'State is required'),

  district: z
    .string()
    .min(2, 'District is required'),
});

export type IncidentFormData =
  z.infer<typeof incidentSchema>;