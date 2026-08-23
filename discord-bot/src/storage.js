import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export class SeenJobStore {
  constructor(filePath, maximumEntries = 2_000) {
    this.filePath = filePath;
    this.maximumEntries = maximumEntries;
    this.ids = new Set();
    this.initialized = false;
    this.writeQueue = Promise.resolve();
  }

  async load() {
    await mkdir(path.dirname(this.filePath), { recursive: true, mode: 0o700 });

    try {
      const contents = await readFile(this.filePath, "utf8");
      const payload = JSON.parse(contents);

      if (payload && Array.isArray(payload.ids)) {
        this.ids = new Set(payload.ids.map(String).slice(-this.maximumEntries));
        this.initialized = payload.initialized === true;
        return;
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(`Could not restore job state; rebuilding safely: ${error.message}`);
      }
    }

    this.ids.clear();
    this.initialized = false;
    await this.save();
  }

  has(id) {
    return this.ids.has(String(id));
  }

  async remember(id) {
    this.ids.add(String(id));

    while (this.ids.size > this.maximumEntries) {
      this.ids.delete(this.ids.values().next().value);
    }

    await this.save();
  }

  async baseline(jobs) {
    for (const job of jobs) this.ids.add(String(job.id));

    while (this.ids.size > this.maximumEntries) {
      this.ids.delete(this.ids.values().next().value);
    }

    this.initialized = true;
    await this.save();
  }

  async save() {
    const snapshot = JSON.stringify({ initialized: this.initialized, ids: [...this.ids] }, null, 2);
    const temporaryPath = `${this.filePath}.tmp`;

    this.writeQueue = this.writeQueue.catch(() => undefined).then(async () => {
      await writeFile(temporaryPath, snapshot, { encoding: "utf8", mode: 0o600 });
      await rename(temporaryPath, this.filePath);
    });

    return this.writeQueue;
  }
}
