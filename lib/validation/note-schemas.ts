/**
 * Validation for everything that writes notes, their files and the vault options (server only).
 * Messages are written for the person who sees them next to the field.
 */
import { z } from 'zod';
import { NOTE_LIMITS } from '@/lib/notes-model';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

export const objectIdSchema = z.string().regex(OBJECT_ID, 'That is not a valid id.');

/** What the browser says about an attached file; the server re-reads size and type from storage. */
export const attachmentInputSchema = z.object({
  id: objectIdSchema,
  name: z.string().trim().min(1).max(NOTE_LIMITS.fileName),
  type: z.string().max(120).default(''),
  size: z.number().int().min(0).default(0),
  path: z.string().max(NOTE_LIMITS.path).optional(),
});

export const noteInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give the note a title.')
    .max(NOTE_LIMITS.title, `Keep the title under ${NOTE_LIMITS.title} characters.`),
  content: z
    .string()
    .max(NOTE_LIMITS.content, `The note is too long (limit ${NOTE_LIMITS.content} characters).`)
    .default(''),
  tags: z.array(z.string().max(80)).max(60).default([]),
  attachments: z
    .array(attachmentInputSchema)
    .max(NOTE_LIMITS.attachments, `A note can keep up to ${NOTE_LIMITS.attachments} files.`)
    .default([]),
});
export type NoteInput = z.infer<typeof noteInputSchema>;

export const noteUpdateSchema = noteInputSchema.extend({ id: objectIdSchema });

export const publishSchema = z.discriminatedUnion('published', [
  z.object({
    id: objectIdSchema,
    published: z.literal(true),
    slug: z.string().trim().min(1, 'Give the note an address.').max(120),
  }),
  z.object({ id: objectIdSchema, published: z.literal(false) }),
]);

/** Vault options and the wording of the public notes page (Admin -> Notes). */
export const notesConfigSchema = z.object({
  autosaveInterval: z.number().min(5).max(300).optional(),
  notesPerPage: z.number().min(5).max(100).optional(),
  vaultTitle: z.string().trim().min(1).max(60).optional(),
  lockTitle: z.string().trim().min(1).max(60).optional(),
  publicTitle: z.string().trim().min(1).max(60).optional(),
  publicIntro: z.string().trim().max(300).optional(),
  vaultButton: z.string().trim().min(1).max(40).optional(),
  maxFileMb: z.number().int().min(1).max(100).optional(),
});
export type NotesConfigInput = z.infer<typeof notesConfigSchema>;
