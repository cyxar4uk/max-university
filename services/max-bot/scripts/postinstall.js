'use strict';
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const pkgDir = path.join(__dirname, '..', 'node_modules', '@maxhub', 'max-bot-api');
if (!fs.existsSync(pkgDir)) return;

const distDir = path.join(pkgDir, 'dist');
if (fs.existsSync(distDir)) return;

// GitHub tarball does not include built dist; build from clone so tsc does not pick up our project files.
const buildDir = path.join(__dirname, '..', 'node_modules', '.max-bot-api-build');
const repoUrl = 'https://github.com/max-messenger/max-bot-api-client-ts.git';

console.log('Building @maxhub/max-bot-api from clone (no dist in GitHub tarball)...');
try {
  if (fs.existsSync(buildDir)) {
    execSync('git pull --depth 1', { stdio: 'pipe', cwd: buildDir });
  } else {
    fs.mkdirSync(path.dirname(buildDir), { recursive: true });
    execSync(`git clone --depth 1 ${repoUrl} "${buildDir}"`, { stdio: 'inherit' });
  }
  execSync('npm install && npm run build', { stdio: 'inherit', cwd: buildDir });
  const builtDist = path.join(buildDir, 'dist');
  if (fs.existsSync(builtDist)) {
    fs.mkdirSync(path.dirname(distDir), { recursive: true });
    fs.cpSync(builtDist, distDir, { recursive: true });
    console.log('@maxhub/max-bot-api dist copied.');
  }
} catch (e) {
  console.warn('postinstall: could not build @maxhub/max-bot-api (runtime may fail):', e.message);
}
