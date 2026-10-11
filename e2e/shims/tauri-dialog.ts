/* Browser stand-in for @tauri-apps/plugin-dialog (used only by
   `vite --mode e2e`): the "chosen" file is whatever the test put in
   window.__e2ePickFile. */
export async function open() {
  return (globalThis as Record<string, unknown>).__e2ePickFile ?? null;
}
