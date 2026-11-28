# Radix Matemática: aplicativo

Casca nativa (Capacitor) que abre a plataforma do Radix Matemática para os alunos. Todo o conteúdo vem do site publicado; este repositório guarda só a casca do aplicativo e a tela "Sem conexão".

## Teste

Com o Node instalado, rode `npm install` e depois `npm test`. O teste confere a configuração (identificador, nome, endereço da plataforma, navegação restrita, tela offline) e se nenhum arquivo de segredo foi versionado.

## Montagem do Android

O fluxo `.github/workflows/android.yml` monta o aplicativo:

- **Pull request e envio para a `main`:** roda `npm test` e monta o APK de depuração, guardado como artefato da execução. Nenhum segredo é usado nesses casos.
- **Tag `v*` (por exemplo `v0.1.0`):** roda `npm test`, monta o pacote assinado (`.aab`), confere que ele está de fato assinado e o guarda como artefato. O nome da versão vem da tag e o código de versão, do número da execução.

Para o pacote assinado, o repositório precisa destes quatro segredos (apenas os nomes): `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_SENHA`, `ANDROID_KEY_ALIAS` e `GOOGLE_SERVICES_JSON_B64` (o arquivo `google-services.json` do Firebase em base64). A assinatura é lida de variáveis de ambiente (`ANDROID_KEYSTORE_ARQUIVO`, `ANDROID_KEYSTORE_SENHA`, `ANDROID_KEY_ALIAS`); sem elas, o build de depuração funciona normalmente e o de liberação sai sem assinatura. A chave dentro do keystore deve usar a mesma senha do próprio keystore (o padrão do formato PKCS12), porque o build lê uma senha só. Sem os segredos, o fluxo da tag falha em vez de gerar um pacote sem assinatura.

O arquivo do Firebase só é escrito no fluxo da tag (e apagado ao final); por isso o APK de depuração não recebe avisos (notificações push) e a falta do segredo também faz o fluxo da tag falhar.

## Montagem do iPhone

Não há Mac neste projeto: tudo do iPhone é gerado e montado nos computadores macOS do GitHub. O projeto usa o Capacitor 8.6.2 com Swift Package Manager (sem CocoaPods), `macos-26` e o Xcode padrão dessa imagem (26.6 na última conferência); o fastlane vem instalado na própria imagem.

**Como a pasta `ios/` foi gerada.** O fluxo `.github/workflows/ios-bootstrap.yml` (manual) roda `npx cap add ios` e o `capacitor-assets` (ícone e abertura, a partir de `resources/`, com o mesmo azul `#0064FF`) num macOS e entrega a pasta como artefato; ele não grava nada no repositório. A pasta foi baixada, conferida e versionada à mão, com estes ajustes sobre o que o Capacitor gera:

- `App.entitlements` com `aps-environment` (avisos push) e o modo de fundo `remote-notification` no `Info.plist`;
- as três funções de avisos no `AppDelegate.swift`, como pede o README do plugin do Firebase;
- idioma `pt-BR` (diálogos do sistema em português) e o texto de uso da câmera, necessário para a foto de perfil;
- uma fase de montagem no Xcode que copia o `GoogleService-Info.plist` para dentro do pacote só se o arquivo existir (sem ele, como na montagem de depuração, o aplicativo abre normalmente e o plugin apenas registra que o Firebase não foi configurado);
- `plugins.FirebaseMessaging.presentationOptions` vazio no `capacitor.config.json`: com o aplicativo aberto, o iPhone não mostra faixa do sistema, e a própria página mostra o aviso;
- remoção das três imagens `splash-2732x2732*.png` que sobram do modelo do Capacitor no conjunto `Splash` (o Xcode avisa que não pertencem a nenhuma variação);
- a opção `symlink` do plugin do Firebase no `capacitor.config.json`, exigida pelo README dele para o Swift Package Manager (a pasta `ios/App/CapApp-SPM/symlinks` é criada pelo `cap sync` e não é versionada).

Para refazer a pasta do zero, rode o fluxo `iOS (gerar projeto)` pela aba Actions, baixe o artefato `radix-ios-gerado` e repita os ajustes acima.

O fluxo `.github/workflows/ios.yml` monta o aplicativo:

- **Pull request e envio para a `main`:** roda `npm test`, `npx cap sync ios` e monta para o simulador sem assinatura (`CODE_SIGNING_ALLOWED=NO`), conferindo o pacote. Nenhum segredo é usado.
- **Tag `v*`:** roda `npm test`, `npx cap sync ios`, escreve o arquivo do Firebase, grava a chave do App Store Connect numa pasta temporária e roda a lane `beta` do fastlane (`fastlane/Fastfile`): assinatura automática com a chave do App Store Connect, montagem e envio ao TestFlight. O nome da versão vem da tag (formato `v1.2.3`) e o número da montagem, do número da execução. Chave e arquivo do Firebase são apagados ao final, mesmo se o fluxo falhar.

Segredos do repositório para a tag (apenas os nomes): `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_B64` (a chave `.p8` em base64), `GOOGLE_SERVICE_INFO_PLIST_B64` (o `GoogleService-Info.plist` em base64) e `APPLE_TEAM_ID` (identificador da equipe, necessário para a assinatura automática). O `fastlane/Appfile` guarda só o identificador do aplicativo, sem e-mail. Sem os segredos, o fluxo da tag falha em vez de enviar algo sem assinatura ou sem avisos.

**O que foi provado e o que não foi.** A montagem para o simulador (job `depuracao`) roda e fica verde. A assinatura, a lane `beta` e o envio ao TestFlight foram escritos mas ainda não foram executados nem uma vez: dependem dos segredos e do aplicativo criado no App Store Connect. A primeira tag é que vai provar essa parte.

## Ícone e abertura

As imagens-fonte ficam em `resources/`. Para refazê-las a partir dos arquivos oficiais da marca (ícone de 1024 px e símbolo branco), informe os caminhos como argumentos:

```
node scripts/gera_recursos.mjs <icone-1024.png> <simbolo-branco.png>
npx capacitor-assets generate --android --assetPath resources --iconBackgroundColor "#0064FF" --iconBackgroundColorDark "#0064FF" --splashBackgroundColor "#0064FF" --splashBackgroundColorDark "#0064FF"
```

Para o iPhone, o `capacitor-assets` usa as mesmas imagens: troque `--android` por `--ios` no comando acima e rode com o projeto já criado (o fluxo `ios-bootstrap.yml` faz isso).

O script só redimensiona e posiciona os arquivos oficiais sobre o azul `#0064FF`; a marca nunca é redesenhada.

O mesmo script gera o ícone pequeno dos avisos (`ic_stat_radix.png`, branco sobre fundo transparente, nas cinco densidades em `android/app/src/main/res/drawable-*`) a partir do símbolo branco oficial: o disco fica branco e a raiz azul vira vazado, porque o Android usa só a transparência desse ícone. Para refazê-lo, rode o mesmo comando acima (o quarto argumento opcional troca a pasta `res` do Android; para usá-lo é preciso informar antes o argumento da pasta de saída).

O canal padrão das notificações tem id `avisos` (recurso `canal_avisos_id` em `strings.xml`); o nome visível "Avisos do Radix" é criado pela plataforma por meio do plugin, e até lá o Firebase usa o canal dele.

## Segredos

Nenhuma chave, senha ou credencial fica neste repositório. Arquivos como `google-services.json`, `GoogleService-Info.plist`, `*.keystore`, `*.jks` e `*.p8` são ignorados pelo Git.

## Licença da fonte

A fonte Archivo, incluída em `www/fonts`, está sob a licença SIL Open Font License 1.1.
