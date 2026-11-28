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
const jobsDe = (texto) => {
  const partes = texto.split(/^jobs:\s*$/m)[1].split(/^  (?=[A-Za-z0-9_-]+:\s*$)/m).filter((p) => /^[A-Za-z0-9_-]+:/.test(p));
  return Object.fromEntries(partes.map((p) => [p.match(/^([A-Za-z0-9_-]+):/)[1], p]));
};
const jobs = jobsDe(wf);
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

// iPhone (Tarefa 14): projeto, montagem e envio ao TestFlight
const lerRaiz = (f) => fs.readFileSync(f, 'utf8');
assert.ok(fs.existsSync('ios/App/App/Info.plist'), 'falta ios/App/App/Info.plist (rode o fluxo ios-bootstrap)');
assert.ok(!/(^|\/)GoogleService-Info\.plist$/m.test(tracked), 'GoogleService-Info.plist está no git');
assert.ok(!/\.(p8|p12|mobileprovision)$/m.test(tracked), 'chave ou perfil de assinatura da Apple está no git');
assert.ok(!/DEVELOPMENT_TEAM/.test(lerRaiz('ios/App/App.xcodeproj/project.pbxproj')), 'DEVELOPMENT_TEAM não pode ficar no projeto (vem do segredo APPLE_TEAM_ID)');
for (const f of tracked.split('\n').filter((l) => l.startsWith('ios/') && /\.(swift|plist|pbxproj|entitlements|json|xcconfig|storyboard|gitignore)$/.test(l))) {
  // E-mail: parte local + @ + domínio (com subdomínios). O domínio não pode terminar em extensão de arquivo (icone@2x.png).
  assert.ok(!/(\/Users\/|[A-Za-z]:\\|[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.(?!(?:png|jpe?g|gif|pdf|svg|swift|json|plist|storyboard|xcassets|xcconfig|h|m)\b)[A-Za-z]{2,})/.test(lerRaiz(f)), 'caminho local ou e-mail em ' + f);
}
// Push: capacidade de avisos, funções do AppDelegate e nenhum banner do sistema com o app aberto.
assert.ok(/<key>aps-environment<\/key>/.test(lerRaiz('ios/App/App/App.entitlements')), 'falta aps-environment nas entitlements');
assert.ok(/CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/.test(lerRaiz('ios/App/App.xcodeproj/project.pbxproj')), 'o projeto deve usar App.entitlements');
const delegado = lerRaiz('ios/App/App/AppDelegate.swift');
for (const nome of ['didRegisterForRemoteNotificationsWithDeviceToken', 'didFailToRegisterForRemoteNotificationsWithError', 'didReceiveRemoteNotification']) {
  assert.ok(delegado.includes(nome), 'AppDelegate sem ' + nome);
}
const infoPlist = lerRaiz('ios/App/App/Info.plist');
assert.ok(/NSCameraUsageDescription/.test(infoPlist), 'falta o texto de uso da câmera');
assert.ok(/remote-notification/.test(infoPlist), 'falta o modo de fundo remote-notification');
assert.ok(!/ITSAppUsesNonExemptEncryption/.test(infoPlist), 'ITSAppUsesNonExemptEncryption é declaração do dono do app');
assert.deepEqual(c.plugins.FirebaseMessaging.presentationOptions, [], 'sem banner do sistema com o app aberto');
assert.equal(c.experimental.ios.spm.packageOptions['@capacitor-firebase/messaging'].symlink, true);
assert.ok(/"@capacitor\/ios":\s*"\d+\.\d+\.\d+"/.test(lerRaiz('package.json')), 'falta @capacitor/ios em versão exata');
// O arquivo do Firebase entra no pacote por uma fase do Xcode, só se existir.
assert.ok(/GoogleService-Info\.plist/.test(lerRaiz('ios/App/App.xcodeproj/project.pbxproj')), 'falta a fase que copia o GoogleService-Info.plist');

assert.ok(/install -m 0644 \\"\$ORIGEM\\" \\"\$DESTINO\\"/.test(lerRaiz('ios/App/App.xcodeproj/project.pbxproj')), 'a fase do Firebase deve copiar com modo 0644 (o arquivo vai no pacote do iPhone)');

// Fastlane: nada de identificador ou chave literal
const appfile = lerRaiz('fastlane/Appfile');
assert.ok(!appfile.includes('@'), 'fastlane/Appfile não pode ter e-mail');
assert.ok(/br\.com\.radixmatematica\.app/.test(appfile) && !/apple_id|team_id/.test(appfile), 'Appfile só com o identificador do aplicativo');
const fastfile = lerRaiz('fastlane/Fastfile');
assert.ok(/lane :beta/.test(fastfile), 'falta a lane beta');
for (const v of ['APPLE_TEAM_ID', 'ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_KEY_P8_ARQUIVO']) {
  assert.ok(fastfile.includes('ENV["' + v + '"]') || fastfile.includes("ENV['" + v + "']"), 'Fastfile deve ler ' + v + ' do ambiente');
}
// Cobre team_id, teamID, key_id, issuer_id e DEVELOPMENT_TEAM em estilo Ruby (: ou =>) e em xcargs (=), com ou sem aspas.
assert.ok(!/(team_?id|key_?id|issuer_?id|DEVELOPMENT_TEAM)["']?\s*(:|=>|=)\s*["']?[A-Za-z0-9-]{6,}/i.test(fastfile), 'identificador literal no Fastfile');
assert.ok(/lane :confere_ipa/.test(fastfile) && /Payload\/\[\^\/\]\+\\\.app\/GoogleService-Info\\\.plist/.test(fastfile), 'falta a lane confere_ipa com a conferência do GoogleService-Info.plist');
const posChamada = fastfile.indexOf('confere_ipa(ipa: lane_context[SharedValues::IPA_OUTPUT_PATH])');
assert.ok(posChamada > fastfile.indexOf('build_app(') && posChamada < fastfile.indexOf('upload_to_testflight('), 'a lane beta deve chamar confere_ipa entre build_app e upload_to_testflight');
const corpoConfere = fastfile.slice(fastfile.indexOf('lane :confere_ipa'));
assert.ok(!/ENV\[/.test(corpoConfere), 'confere_ipa não pode depender de variáveis de ambiente');
for (const a of ['app_store_connect_api_key', 'build_app', 'upload_to_testflight']) assert.ok(fastfile.includes(a), 'Fastfile sem ' + a);

// Fluxos do iPhone
for (const f of fs.readdirSync('.github/workflows').filter((n) => /\.ya?ml$/.test(n))) {
  assert.ok(!/pull_request_target/.test(lerRaiz('.github/workflows/' + f)), 'pull_request_target é proibido em ' + f);
}
const wfBoot = lerRaiz('.github/workflows/ios-bootstrap.yml');
assert.ok(/^on:\s*\n  workflow_dispatch:\s*\n/m.test(wfBoot) && !/^  (push|pull_request|schedule):/m.test(wfBoot), 'ios-bootstrap.yml deve rodar só por workflow_dispatch');
assert.ok(/^permissions:\s*\n  contents: read\s*$/m.test(wfBoot) && !/contents: write/.test(wfBoot), 'ios-bootstrap.yml deve ter só contents: read');
const wfIos = lerRaiz('.github/workflows/ios.yml');
const jobsIos = jobsDe(wfIos);
assert.ok(jobsIos.depuracao && jobsIos.liberacao, 'ios.yml: faltam os jobs depuracao e liberacao');
assert.ok(!/secrets\./.test(jobsIos.depuracao), 'ios.yml: o job depuracao não pode usar segredos');
assert.ok(/CODE_SIGNING_ALLOWED=NO/.test(jobsIos.depuracao), 'ios.yml: a depuração deve montar sem assinatura');
assert.ok(/iphonesimulator/.test(jobsIos.depuracao), 'ios.yml: a depuração deve montar para o simulador');
for (const s of ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_KEY_P8_B64', 'GOOGLE_SERVICE_INFO_PLIST_B64', 'APPLE_TEAM_ID']) {
  assert.ok(new RegExp('secrets\\.' + s).test(jobsIos.liberacao), 'ios.yml: o job liberacao deve ler ' + s);
  assert.equal(wfIos.split(s).length - 1, jobsIos.liberacao.split(s).length - 1, 'ios.yml: ' + s + ' fora do job liberacao');
}
assert.ok(/fastlane beta/.test(jobsIos.liberacao), 'ios.yml: o job liberacao deve rodar a lane beta');
assert.ok(/ios\/App\/App\/GoogleService-Info\.plist/.test(jobsIos.liberacao), 'ios.yml: o job liberacao deve escrever o arquivo do Firebase');
assert.ok(/rm -f[^\n]*GoogleService-Info\.plist/.test(jobsIos.liberacao) && /rm -f[^\n]*\.p8/.test(jobsIos.liberacao), 'ios.yml: a limpeza deve apagar a chave e o arquivo do Firebase');
assert.ok(/if: \$\{\{ always\(\) \}\}/.test(jobsIos.liberacao), 'ios.yml: a limpeza deve rodar sempre');
console.log('checa_config: ok');
