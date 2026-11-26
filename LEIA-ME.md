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

## Ícone e abertura

As imagens-fonte ficam em `resources/`. Para refazê-las a partir dos arquivos oficiais da marca (ícone de 1024 px e símbolo branco), informe os caminhos como argumentos:

```
node scripts/gera_recursos.mjs <icone-1024.png> <simbolo-branco.png>
npx capacitor-assets generate --android --assetPath resources --iconBackgroundColor "#0064FF" --iconBackgroundColorDark "#0064FF" --splashBackgroundColor "#0064FF" --splashBackgroundColorDark "#0064FF"
```

O script só redimensiona e posiciona os arquivos oficiais sobre o azul `#0064FF`; a marca nunca é redesenhada.

O mesmo script gera o ícone pequeno dos avisos (`ic_stat_radix.png`, branco sobre fundo transparente, nas cinco densidades em `android/app/src/main/res/drawable-*`) a partir do símbolo branco oficial: o disco fica branco e a raiz azul vira vazado, porque o Android usa só a transparência desse ícone. Para refazê-lo, rode o mesmo comando acima (o quarto argumento opcional troca a pasta `res` do Android; para usá-lo é preciso informar antes o argumento da pasta de saída).

O canal padrão das notificações tem id `avisos` (recurso `canal_avisos_id` em `strings.xml`); o nome visível "Avisos do Radix" é criado pela plataforma por meio do plugin, e até lá o Firebase usa o canal dele.

## Segredos

Nenhuma chave, senha ou credencial fica neste repositório. Arquivos como `google-services.json`, `GoogleService-Info.plist`, `*.keystore`, `*.jks` e `*.p8` são ignorados pelo Git.

## Licença da fonte

A fonte Archivo, incluída em `www/fonts`, está sob a licença SIL Open Font License 1.1.
