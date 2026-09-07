import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const pdfSource = path.join(rootDir, "public/readme/CAN'T OPEN(КАК ОТКРЫТЬ).pdf");
const appCandidates = [
  path.join(rootDir, 'src-tauri/target/universal-apple-darwin/release/bundle/macos/J.L.JÖRMUNGANDR.app'),
  path.join(rootDir, 'src-tauri/target/release/bundle/macos/J.L.JÖRMUNGANDR.app'),
  path.join(rootDir, 'target/release/bundle/macos/J.L.JÖRMUNGANDR.app'),
  path.join(rootDir, 'src-tauri/target/release/bundle/macos/jlj.app'),
  path.join(rootDir, 'src-tauri/target/debug/bundle/macos/J.L.JÖRMUNGANDR.app')
];

let appPath = appCandidates.find(p => fs.existsSync(p));

if (!appPath) {
  console.log('App bundle not found. Running tauri build --bundles app...');
  execSync('npm run tauri build -- --bundles app', { stdio: 'inherit', cwd: rootDir });
  appPath = appCandidates.find(p => fs.existsSync(p));
}

if (!appPath) {
  console.error('Error: Could not find built .app bundle to package into DMG.');
  process.exit(1);
}

if (!fs.existsSync(pdfSource)) {
  console.error(`Error: PDF instructions file not found at: ${pdfSource}`);
  process.exit(1);
}

const appName = path.basename(appPath, '.app');
const stagingDir = path.join(rootDir, 'dist-dmg-staging');
const outputDmgDir = path.join(rootDir, 'dist-dmg');
const outputDmg = path.join(outputDmgDir, `${appName}_Installer.dmg`);

console.log(`Packaging DMG with:`);
console.log(`- App: ${appPath}`);
console.log(`- PDF: ${pdfSource}`);

// 1. Prepare staging directory
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });
fs.mkdirSync(outputDmgDir, { recursive: true });

// 2. Copy App bundle
console.log('Copying App bundle...');
execSync(`cp -R "${appPath}" "${stagingDir}/"`);

// 3. Create Applications symlink
console.log('Creating Applications symlink...');
execSync(`ln -s /Applications "${stagingDir}/Applications"`);

// 4. Copy PDF instructions
console.log("Copying CAN'T OPEN(КАК ОТКРЫТЬ).pdf...");
execSync(`cp "${pdfSource}" "${stagingDir}/"`);

// 5. Remove old DMG if exists
if (fs.existsSync(outputDmg)) {
  fs.unlinkSync(outputDmg);
}

// 6. Build DMG with hdiutil
console.log('Creating DMG with hdiutil...');
execSync(`hdiutil create -volname "${appName}" -srcfolder "${stagingDir}" -ov -format UDZO "${outputDmg}"`, { stdio: 'inherit' });

// Clean up staging
fs.rmSync(stagingDir, { recursive: true, force: true });

console.log(`\nSuccessfully created DMG with instructions PDF:`);
console.log(`-> ${outputDmg}\n`);
