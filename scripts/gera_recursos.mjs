// Gera as imagens-fonte de ícone e abertura em resources/ a partir dos arquivos
// oficiais da marca. Só redimensiona e posiciona; nunca redesenha a marca.
// Uso: node scripts/gera_recursos.mjs <icone-1024.png> <simbolo-branco.png> [pasta-de-saida]
// Depois: npx capacitor-assets generate --android --assetPath resources --iconBackgroundColor "#0064FF" --iconBackgroundColorDark "#0064FF" --splashBackgroundColor "#0064FF" --splashBackgroundColorDark "#0064FF"
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [icone, simbolo, saida = 'resources'] = process.argv.slice(2);
if (!icone || !simbolo) {
  console.error('Uso: node scripts/gera_recursos.mjs <icone-1024.png> <simbolo-branco.png> [pasta-de-saida]');
  process.exit(1);
}
const AZUL = '#0064FF';
fs.mkdirSync(saida, { recursive: true });

const plano = (n) =>
  sharp({ create: { width: n, height: n, channels: 4, background: AZUL } }).png();

// Símbolo no tamanho pedido (largura), centralizado numa tela n x n.
async function centralizado(n, largura, fundo) {
  const sim = await sharp(simbolo).resize({ width: largura }).png().toBuffer();
  const base = fundo
    ? plano(n)
    : sharp({ create: { width: n, height: n, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png();
  return base.composite([{ input: sim, gravity: 'center' }]).png();
}

// Ícone legado: o arquivo oficial, só garantindo 1024 x 1024.
await sharp(icone).resize(1024, 1024).png().toFile(path.join(saida, 'icon-only.png'));
// Ícone adaptativo: fundo azul chapado e símbolo dentro dos 2/3 centrais (zona segura da máscara).
await plano(1024).toFile(path.join(saida, 'icon-background.png'));
await (await centralizado(1024, 680, false)).toFile(path.join(saida, 'icon-foreground.png'));
// Abertura: azul chapado com o símbolo branco centralizado; a versão escura é idêntica.
for (const nome of ['splash.png', 'splash-dark.png']) {
  await (await centralizado(2732, 760, true)).toFile(path.join(saida, nome));
}
console.log('Recursos gerados em', saida);
