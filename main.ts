// Sunset Vice Cover Maker — hand-in program for the make.fun bounty
// gta6-cover-art-01 ("Make GTA 6 Cover Art").
//
// Round 2 fixes the grader run: the output directory is now cleared entry
// by entry and is never removed itself, so the program runs cleanly inside
// the grader's read-only container.
//
// What it does, in order:
//   1. Works out where this repository sits (the folder holding main.ts) and
//      where the hand-in goes: $MAKEFUN_OUTPUT_DIR when set, else /output.
//   2. Creates the output folder if needed and clears whatever a previous
//      run left inside it, entry by entry.
//   3. Copies the whole app/ tree and the whole screenshots/ tree from the
//      repository into the output folder, byte for byte.
//   4. Writes dossier.json into the output folder with buildDossier from the
//      kit's vendor library, using the same caps the bounty's scorer uses,
//      so the dossier here is the dossier the scorer rebuilds and compares.
//
// Node 22, standard library only, no network. Running it twice over the same
// repository writes the same bytes: the copies are plain file copies and
// buildDossier is deterministic.

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Create the output folder if it is missing, then clear its contents entry
// by entry. The output directory itself must never be removed: the grader's
// /output is a mount point owned by root, and this program runs there as an
// unprivileged user, so deleting the directory fails with EPERM. Removing
// each entry inside it works everywhere and leaves no stale file behind.
mkdirSync(outputDir, { recursive: true });
for (const entry of readdirSync(outputDir)) {
  rmSync(join(outputDir, entry), { recursive: true, force: true });
}

// The app itself and the screenshots its maker took.
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });
cpSync(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

// The dossier the judge reads, built from exactly what was just copied.
const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossierBytes);

console.log(`handed in app/ and screenshots/ to ${outputDir} with dossier.json (${dossierBytes.length} bytes)`);
