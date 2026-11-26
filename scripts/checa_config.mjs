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
for (const linha of gradle.split('\n')) {
  if (/\b(storePassword|keyPassword|keyAlias)\b/.test(linha) && !/^\s*\/\//.test(linha)) {
    assert.ok(/System\.getenv/.test(linha), 'assinatura deve vir de System.getenv: ' + linha.trim());
    assert.ok(!/(storePassword|keyPassword|keyAlias)\s*[=(]?\s*['"]/.test(linha), 'valor literal de assinatura: ' + linha.trim());
  }
  // Groovy: "versionCode (x).toInteger()" chama versionCode(x) e depois .toInteger() no retorno vazio.
  assert.ok(!/^\s*(versionCode|versionName)\s+\(/.test(linha), 'chamada sem parênteses começando com parêntese: ' + linha.trim());
}
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
// Plugins nativos e Firebase (Tarefas 5 e 11)
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const nome of ['@capacitor/filesystem', '@capacitor/share', '@capacitor/browser', '@capacitor-firebase/messaging']) {
  const v = pkg.dependencies[nome];
  assert.ok(v, 'falta o plugin ' + nome);
  assert.match(v, /^\d+\.\d+\.\d+$/, 'versão do plugin deve ser exata: ' + nome);
}
// O segredo do Firebase só pode aparecer no job liberacao (separa o arquivo por job).
const partes = wf.split(/^jobs:\s*$/m)[1].split(/^  (?=[A-Za-z0-9_-]+:\s*$)/m).filter((p) => /^[A-Za-z0-9_-]+:/.test(p));
const jobs = Object.fromEntries(partes.map((p) => [p.match(/^([A-Za-z0-9_-]+):/)[1], p]));
assert.ok(jobs.depuracao && jobs.liberacao, 'faltam os jobs depuracao e liberacao');
assert.ok(!/secrets\./.test(jobs.depuracao), 'o job depuracao não pode usar segredos');
assert.ok(!/GOOGLE_SERVICES_JSON_B64/.test(jobs.depuracao), 'segredo do Firebase no job de depuração');
assert.ok(/secrets\.GOOGLE_SERVICES_JSON_B64/.test(jobs.liberacao), 'o job liberacao deve ler GOOGLE_SERVICES_JSON_B64');
assert.equal(wf.split('GOOGLE_SERVICES_JSON_B64').length - 1, jobs.liberacao.split('GOOGLE_SERVICES_JSON_B64').length - 1, 'GOOGLE_SERVICES_JSON_B64 fora do job liberacao');
assert.ok(/android\/app\/google-services\.json/.test(jobs.liberacao), 'o job liberacao deve escrever o arquivo do Firebase');
assert.ok(/rm -f[^\n]*google-services\.json/.test(jobs.liberacao), 'a limpeza deve apagar o arquivo do Firebase');
// Canal padrão dos avisos: o id declarado no manifesto deve ser o que a plataforma usará ('avisos').
const manifesto = fs.readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
const metaCanal = manifesto.match(/android:name="com\.google\.firebase\.messaging\.default_notification_channel_id"\s+android:value="@string\/([A-Za-z0-9_]+)"/);
assert.ok(!/default_notification_channel_id"\s+android:resource/.test(manifesto), 'o id do canal deve usar android:value (texto), nunca android:resource');
assert.ok(metaCanal, 'manifesto deve declarar default_notification_channel_id com android:value="@string/..."');
const strs = fs.readFileSync('android/app/src/main/res/values/strings.xml', 'utf8');
const valorCanal = strs.match(new RegExp('<string name="' + metaCanal[1] + '">([^<]*)</string>'));
assert.ok(valorCanal, 'falta o recurso string ' + metaCanal[1]);
assert.equal(valorCanal[1], 'avisos', 'o id do canal deve ser avisos');
console.log('checa_config: ok');
