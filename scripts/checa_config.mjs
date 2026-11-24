import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

const c = JSON.parse(fs.readFileSync('capacitor.config.json', 'utf8'));
assert.equal(c.appId, 'br.com.radixmatematica.app');
assert.equal(c.appName, 'Radix');
assert.equal(c.server.url, 'https://app.radixmatematica.com.br');
assert.match(c.appendUserAgent, /^RadixApp\/\d+$/);
assert.equal(c.server.cleartext ?? false, false);
assert.deepEqual(c.server.allowNavigation ?? [], []);
assert.ok(fs.existsSync(path.join(c.webDir, c.server.errorPath)));
const off = fs.readFileSync('www/offline.html', 'utf8');
assert.ok(off.includes('Sem conexão.') && off.includes('Tentar de novo') && off.includes(c.server.url));
assert.ok(!/google-services\.json|\.p8|\.keystore/.test(execSync('git ls-files').toString()));
console.log('checa_config: ok');
