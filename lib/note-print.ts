/**
 * "Save as PDF": opens the note in its own window with the site's styles, forced to a light
 * paper-friendly palette, and starts the browser's print dialog (which can save as PDF).
 * Browser only. Elements marked data-print-skip (the file list) are left out.
 */
const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const PRINT_STYLE = `
html.print-light{--background:#ffffff;--foreground:#111827;--card:#ffffff;--card-foreground:#111827;
--popover:#ffffff;--muted:#f3f4f6;--muted-foreground:#4b5563;--border:#d1d5db;--input:#d1d5db;
--code-background:#f3f4f6;--code-foreground:#111827;color-scheme:light}
html.print-light,html.print-light body{background:#fff!important;color:#111827!important}
.print-page{max-width:780px;margin:0 auto;padding:32px 24px}
.print-page img,.print-page video{max-width:100%}
@media print{.print-page{padding:0;max-width:none}a{color:inherit}pre,blockquote,table,img{break-inside:avoid}}
`;

export async function printElement(source: HTMLElement, title: string): Promise<boolean> {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return false;
  const copy = source.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('[data-print-skip]').forEach((el) => el.remove());
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) =>
      node instanceof HTMLLinkElement
        ? `<link rel="stylesheet" href="${escapeHtml(node.href)}">`
        : node.outerHTML
    )
    .join('\n');

  win.document.open();
  win.document.write(
    `<!DOCTYPE html><html lang="${escapeHtml(document.documentElement.lang || 'en')}" class="print-light">` +
      `<head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${styles}` +
      `<style>${PRINT_STYLE}</style></head><body><main class="print-page">${copy.outerHTML}</main></body></html>`
  );
  win.document.close();

  // Print once the pictures are in, or they would be missing from the page.
  const pending = Array.from(win.document.images)
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise<void>((resolve) => {
          img.onload = img.onerror = () => resolve();
        })
    );
  await Promise.race([Promise.all(pending), new Promise((r) => setTimeout(r, 4000))]);
  setTimeout(() => {
    win.focus();
    win.print();
  }, 250);
  return true;
}

/** Hands a text file to the browser as a download. */
export function downloadText(fileName: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
