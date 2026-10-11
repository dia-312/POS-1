/* Browser stand-in for @tauri-apps/plugin-fs (used only by `vite --mode e2e`):
   an in-memory file system, readable by tests through window.__e2eFiles. */
const files: Record<string, string> = {};
const dirs = new Set<string>();

(globalThis as Record<string, unknown>).__e2eFiles = files;

export const BaseDirectory = { Document: 6 } as const;

export async function exists(path: string) {
  return dirs.has(path) || path in files;
}

export async function mkdir(path: string) {
  dirs.add(path);
}

export async function writeTextFile(path: string, data: string) {
  files[path] = data;
}

export async function readTextFile(path: string) {
  if (!(path in files)) throw new Error(`no such file: ${path}`);
  return files[path];
}
