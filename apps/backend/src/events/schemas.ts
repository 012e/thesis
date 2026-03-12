import { z } from 'zod';

// Base event schema following standard EDA format
const baseEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string(),
  eventVersion: z.string(),
  source: z.string(),
  timestamp: z.string().datetime(),
  correlationId: z.string().optional(),
  causationId: z.string().optional(),
});

// User aggregate data schema
const userDataSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string().optional(),
  name: z.string().optional(),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// User Created Event
export const userCreatedEventSchema = baseEventSchema.extend({
  eventType: z.literal('user.created'),
  data: userDataSchema,
});

// User Updated Event
export const userUpdatedEventSchema = baseEventSchema.extend({
  eventType: z.literal('user.updated'),
  data: userDataSchema.extend({
    previousVersion: userDataSchema.optional(),
  }),
});

// User Deleted Event
export const userDeletedEventSchema = baseEventSchema.extend({
  eventType: z.literal('user.deleted'),
  data: z.object({
    id: z.string(),
    deletedAt: z.string().datetime(),
  }),
});

// Type exports
export type UserCreatedEvent = z.infer<typeof userCreatedEventSchema>;
export type UserUpdatedEvent = z.infer<typeof userUpdatedEventSchema>;
export type UserDeletedEvent = z.infer<typeof userDeletedEventSchema>;
export type UserEvent = UserCreatedEvent | UserUpdatedEvent | UserDeletedEvent;
