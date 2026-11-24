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

// Assinatura e montagem do Android (Tarefa 7)
const gradle = fs.readFileSync('android/app/build.gradle', 'utf8');
assert.ok(!/storePassword\s+['"]/.test(gradle), 'senha literal no build.gradle');
assert.ok(!/keyPassword\s+['"]/.test(gradle), 'senha de chave literal no build.gradle');
assert.ok(/System\.getenv/.test(gradle), 'build.gradle deve ler a assinatura de System.getenv');
for (const v of ['ANDROID_KEYSTORE_ARQUIVO', 'ANDROID_KEYSTORE_SENHA', 'ANDROID_KEY_ALIAS', 'VERSAO_NOME', 'VERSAO_CODIGO']) {
  assert.ok(gradle.includes(v), 'build.gradle deve usar ' + v);
}
assert.ok(fs.existsSync('.github/workflows/android.yml'), 'falta o fluxo android.yml');
const wf = fs.readFileSync('.github/workflows/android.yml', 'utf8');
assert.ok(!/pull_request_target/.test(wf), 'pull_request_target é proibido');
const tracked = execSync('git ls-files').toString();
assert.ok(!/(^|\/)google-services\.json$/m.test(tracked));
assert.ok(!/\.(keystore|jks)$/m.test(tracked));
console.log('checa_config: ok');
