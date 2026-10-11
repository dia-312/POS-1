/* Print an HTML document through a hidden iframe.

   In the desktop app (WebView2) window.print() does not return while the
   print dialog is open: the whole page is frozen until the dialog is closed,
   and `afterprint` fires when it is. Two rules follow from that:
   - the frame must stay alive until `afterprint`, never on a short timer
   - the caller must finish its own UI updates BEFORE calling this, or the
     screen shows stale state (and clicks pile up) while the dialog is open.

   Resolves when printing is over (dialog closed); rejects if the frame could
   not be set up or print() threw. */
const FALLBACK_CLEANUP_MS = 120_000;
const IMAGE_WAIT_MS = 3000;

/* Images in the written document load asynchronously; printing before they
   are ready gives a page without them. */
function imagesReady(doc: Document): Promise<void> {
  const pending = Array.from(doc.images)
    .filter((image) => !image.complete)
    .map(
      (image) =>
        new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve());
          image.addEventListener("error", () => resolve());
        })
    );

  if (pending.length === 0) return Promise.resolve();

  return Promise.race([
    Promise.all(pending).then(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, IMAGE_WAIT_MS)),
  ]);
}

export function printHtml(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = win?.document;

    if (!win || !doc) {
      iframe.remove();
      reject(new Error("print frame is not available"));
      return;
    }

    let finished = false;
    const finish = (error?: unknown) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(fallback);
      iframe.remove();
      if (error) reject(error);
      else resolve();
    };

    // Safety net for engines where print() returns at once and no
    // `afterprint` ever arrives.
    const fallback = window.setTimeout(() => finish(), FALLBACK_CLEANUP_MS);

    doc.open();
    doc.write(html);
    doc.close();

    // Added after document.open(), which resets the window's listeners.
    win.addEventListener("afterprint", () => finish());

    imagesReady(doc).then(() => {
      if (finished) return;

      win.focus();

      try {
        win.print();
      } catch (err) {
        finish(err);
      }
    });
  });
}
