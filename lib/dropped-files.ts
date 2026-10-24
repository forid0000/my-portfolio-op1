/**
 * Turns whatever the person dropped, pasted or picked into a flat list of files with the folder
 * each came from. A dropped folder is walked recursively. Browser only (File System Entry API),
 * with plain-file fallbacks for browsers that do not have it.
 */
export interface PickedFile {
  file: File;
  /** Folder the file came from ("Trip/2026"), or '' for a loose file. */
  path: string;
}

/** Most files taken from one drop, so a huge folder cannot freeze the page. */
export const MAX_PICKED_FILES = 200;

const IGNORED_NAMES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);

/** System files that are never meant to be kept. */
export function isIgnoredFile(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.startsWith('.') || IGNORED_NAMES.has(lower) || lower.startsWith('~$');
}

/** "Trip/2026/a.jpg" -> "Trip/2026"; a loose name -> "". */
export function folderOf(relativePath: string): string {
  const parts = relativePath.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

/** Files from a file input (a folder pick sets webkitRelativePath). */
export function fromFileList(list: FileList | File[]): PickedFile[] {
  return Array.from(list)
    .filter((file) => !isIgnoredFile(file.name))
    .slice(0, MAX_PICKED_FILES)
    .map((file) => ({
      file,
      path: folderOf((file as File & { webkitRelativePath?: string }).webkitRelativePath ?? ''),
    }));
}

function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = [];
    const next = () =>
      reader.readEntries((batch) => {
        if (!batch.length) return resolve(all);
        all.push(...batch);
        next();
      }, reject);
    next();
  });
}

const entryFile = (entry: FileSystemFileEntry) =>
  new Promise<File>((resolve, reject) => entry.file(resolve, reject));

async function walk(entry: FileSystemEntry, base: string, out: PickedFile[]): Promise<void> {
  if (out.length >= MAX_PICKED_FILES) return;
  if (entry.isFile) {
    if (isIgnoredFile(entry.name)) return;
    out.push({ file: await entryFile(entry as FileSystemFileEntry), path: base });
    return;
  }
  if (entry.isDirectory && !isIgnoredFile(entry.name)) {
    const children = await readAllEntries((entry as FileSystemDirectoryEntry).createReader());
    const here = base ? `${base}/${entry.name}` : entry.name;
    for (const child of children) await walk(child, here, out);
  }
}

/** Reads a drop. Call it straight from the drop handler: the browser empties the event afterwards. */
export async function fromDataTransfer(data: DataTransfer): Promise<PickedFile[]> {
  // Entries must be taken synchronously, before any await.
  const entries = Array.from(data.items ?? [])
    .filter((item) => item.kind === 'file')
    .map((item) => item.webkitGetAsEntry?.() ?? null);
  const plain = Array.from(data.files ?? []);

  if (!entries.length || entries.some((e) => e === null)) return fromFileList(plain);
  const out: PickedFile[] = [];
  for (const entry of entries) if (entry) await walk(entry, '', out);
  return out;
}
