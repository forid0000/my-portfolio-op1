/**
 * The notes options stored in `settings` (Admin -> Notes): how the private vault behaves and the
 * wording of the public notes page. One read for all of them; every caller (the vault login, the
 * session check, the admin page, the public pages) gets the same defaults.
 */
import { settingsCollection } from '@/lib/settings-store';
import { DEFAULT_FILE_LIMIT_MB, NOTE_TEXT_DEFAULTS, effectiveFileLimit } from '@/lib/notes-model';

const KEYS = {
  autosaveInterval: 'notes_autosave_interval',
  notesPerPage: 'notes_per_page',
  vaultTitle: 'notes_vault_title',
  lockTitle: 'notes_lock_title',
  publicTitle: 'notes_public_title',
  publicIntro: 'notes_public_intro',
  vaultButton: 'notes_vault_button',
  maxFileMb: 'notes_max_file_mb',
} as const;

export interface NotesSettings {
  autosaveInterval: number;
  notesPerPage: number;
  vaultTitle: string;
  lockTitle: string;
  publicTitle: string;
  publicIntro: string;
  vaultButton: string;
  maxFileMb: number;
}

export const NOTES_SETTINGS_DEFAULTS: NotesSettings = {
  autosaveInterval: 30,
  notesPerPage: 20,
  vaultTitle: NOTE_TEXT_DEFAULTS.vaultTitle,
  lockTitle: NOTE_TEXT_DEFAULTS.lockTitle,
  publicTitle: NOTE_TEXT_DEFAULTS.publicTitle,
  publicIntro: NOTE_TEXT_DEFAULTS.publicIntro,
  vaultButton: NOTE_TEXT_DEFAULTS.vaultButton,
  maxFileMb: DEFAULT_FILE_LIMIT_MB,
};

const text = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value : fallback;
const number = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export async function getNotesSettings(): Promise<NotesSettings> {
  try {
    const col = await settingsCollection();
    const docs = await col.find({ key: { $in: Object.values(KEYS) } }).toArray();
    const byKey = new Map<string, unknown>(
      docs.map((d: Record<string, any>) => [d.key as string, d.value])
    );
    const d = NOTES_SETTINGS_DEFAULTS;
    return {
      autosaveInterval: number(byKey.get(KEYS.autosaveInterval), d.autosaveInterval),
      notesPerPage: number(byKey.get(KEYS.notesPerPage), d.notesPerPage),
      vaultTitle: text(byKey.get(KEYS.vaultTitle), d.vaultTitle),
      lockTitle: text(byKey.get(KEYS.lockTitle), d.lockTitle),
      publicTitle: text(byKey.get(KEYS.publicTitle), d.publicTitle),
      // The intro may be emptied on purpose, so only a missing value falls back.
      publicIntro:
        typeof byKey.get(KEYS.publicIntro) === 'string'
          ? (byKey.get(KEYS.publicIntro) as string)
          : d.publicIntro,
      vaultButton: text(byKey.get(KEYS.vaultButton), d.vaultButton),
      maxFileMb: number(byKey.get(KEYS.maxFileMb), d.maxFileMb),
    };
  } catch {
    return NOTES_SETTINGS_DEFAULTS;
  }
}

export async function saveNotesSettings(changes: Partial<NotesSettings>): Promise<void> {
  const col = await settingsCollection();
  const now = new Date();
  await Promise.all(
    (Object.keys(changes) as (keyof NotesSettings)[])
      .filter((name) => changes[name] !== undefined)
      .map((name) =>
        col.updateOne(
          { key: KEYS[name] },
          { $set: { value: changes[name], updatedAt: now } },
          { upsert: true }
        )
      )
  );
}

/** The largest file the vault accepts right now (the owner's setting, capped by the platform). */
export function fileLimitBytes(settings: Pick<NotesSettings, 'maxFileMb'>): number {
  return effectiveFileLimit(settings.maxFileMb, Boolean(process.env.VERCEL));
}
