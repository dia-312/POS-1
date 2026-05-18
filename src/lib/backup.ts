import { BaseDirectory, exists, mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import { exportDatabase } from './database';

export async function performAutomaticBackup(manual: boolean = false) {
  try {
    // We don't use the documentDir variable directly as it's just to check if api works,
    // BaseDirectory.Document already maps to it natively in the fs plugin.
    
    const backupDirName = "POS_Backups";
    
    // Check if dir exists
    const dirExists = await exists(backupDirName, { baseDir: BaseDirectory.Document });
    if (!dirExists) {
      await mkdir(backupDirName, { baseDir: BaseDirectory.Document });
    }
    
    const now = new Date();
    // YYYY-MM-DD
    const today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, '0') + "-" + String(now.getDate()).padStart(2, '0');
    
    // If manual, we add a timestamp to avoid overwriting the daily auto backup
    let fileName = "";
    if (manual) {
       const timeStr = String(now.getHours()).padStart(2, '0') + "-" + String(now.getMinutes()).padStart(2, '0') + "-" + String(now.getSeconds()).padStart(2, '0');
       fileName = `${backupDirName}/backup-${today}-${timeStr}.json`;
    } else {
       fileName = `${backupDirName}/backup-${today}.json`;
    }
    
    const data = await exportDatabase();
    await writeTextFile(fileName, data, { baseDir: BaseDirectory.Document });
    
    console.log(`Backup saved to Documents/${fileName}`);
    return true;
  } catch (err) {
    console.error("Backup failed:", err);
    return false;
  }
}
