// Gera as imagens-fonte de ícone e abertura em resources/ a partir dos arquivos
// oficiais da marca. Só redimensiona e posiciona; nunca redesenha a marca.
// Uso: node scripts/gera_recursos.mjs <icone-1024.png> <simbolo-branco.png> [pasta-de-saida] [pasta-res-android]
// Depois: npx capacitor-assets generate --android --assetPath resources --iconBackgroundColor "#0064FF" --iconBackgroundColorDark "#0064FF" --splashBackgroundColor "#0064FF" --splashBackgroundColorDark "#0064FF"
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [icone, simbolo, saida = 'resources', resAndroid = 'android/app/src/main/res'] = process.argv.slice(2);
if (!icone || !simbolo) {
  console.error('Uso: node scripts/gera_recursos.mjs <icone-1024.png> <simbolo-branco.png> [pasta-de-saida] [pasta-res-android]');
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

// Ícone pequeno de aviso (Android exige branco sobre fundo transparente): o próprio símbolo
// branco oficial, só redimensionado para caber inteiro (sem cortar), centralizado, com 1 dp de margem.
// O símbolo oficial tem a raiz em azul dentro do disco branco. O Android usa só a transparência
// do ícone de aviso, então cada pixel vira branco e a opacidade passa a acompanhar o quanto ele
// é claro: o disco branco continua cheio e a raiz azul vira vazado. É uma conversão de pixels do
// arquivo oficial, sem desenhar nada.
const { data: orig, info } = await sharp(simbolo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const [larg, alt] = [info.width, info.height];
const mascara = Buffer.from(orig);
for (let i = 0; i < mascara.length; i += 4) {
  const claro = Math.min(orig[i], orig[i + 1], orig[i + 2]) / 255;
  mascara[i] = mascara[i + 1] = mascara[i + 2] = 255;
  mascara[i + 3] = Math.round(orig[i + 3] * claro);
}
const DENSIDADES = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };
for (const [dens, n] of Object.entries(DENSIDADES)) {
  const pasta = path.join(resAndroid, 'drawable-' + dens);
  fs.mkdirSync(pasta, { recursive: true });
  const miolo = Math.round((n * 22) / 24);
  const sim = await sharp(mascara, { raw: { width: larg, height: alt, channels: 4 } })
    .resize({ width: miolo, height: miolo, fit: 'inside' })
    .png()
    .toBuffer();
  await sharp({ create: { width: n, height: n, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: sim, gravity: 'center' }])
    .png()
    .toFile(path.join(pasta, 'ic_stat_radix.png'));
}
console.log('Recursos gerados em', saida, 'e ícones de aviso em', resAndroid);
