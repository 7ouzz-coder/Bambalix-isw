import { z } from "zod";

const id = z.string().min(1);
const date = z.iso.datetime({ offset: true });
const text = z.string().min(1);
const maintenance = z.object({
  id, resourceId: id, startsAt: date, endsAt: date, reason: text,
  closedAt: date.nullable(), closingNotes: text.nullable(),
}).refine(value => Date.parse(value.endsAt) > Date.parse(value.startsAt))
  .refine(value => Boolean(value.closedAt) === Boolean(value.closingNotes));

function pageOf(item) {
  return z.object({
    items: z.array(item), total: z.number().int().nonnegative(),
    pages: z.number().int().positive(), page: z.number().int().positive(),
  }).refine(value => value.page <= value.pages && value.items.length <= value.total);
}

export const maintenancePageSchema = pageOf(maintenance);
export const maintenanceFollowUpSchema = pageOf(z.object({
  id, maintenanceId: id, content: text, createdAt: date,
})).safeExtend({ maintenance }).refine(value =>
  value.items.every(note => note.maintenanceId === value.maintenance.id));

export const replacementPageSchema = pageOf(z.object({
  id, assignmentId: id,
  proposedResourceId: id.nullable(),
  proposedResource: z.object({ id, code: text, name: text }).nullable(),
  externalAlternative: text.nullable(), reason: text,
  estimatedCost: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  createdAt: date, startsAt: date, endsAt: date,
  decidedAt: date.nullable(), decisionReason: text.nullable(),
  resultingAssignmentId: id.nullable(),
}).refine(value => Date.parse(value.endsAt) > Date.parse(value.startsAt))
  .refine(value => value.status === "PENDING"
    ? value.decidedAt === null && value.decisionReason === null
    : value.decidedAt !== null && value.decisionReason !== null)
  .refine(value => value.proposedResourceId
    ? value.proposedResource?.id === value.proposedResourceId && value.externalAlternative === null
    : value.proposedResource === null && value.externalAlternative !== null))
  .safeExtend({ canDecide: z.boolean(), assignmentReleasedAt: date.nullable() });
