import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

let esbuild;
try {
  esbuild = require('esbuild');
} catch {
  const extra = process.env.ESBUILD_PATH;
  if (extra) esbuild = require(extra);
  else throw new Error('esbuild not found. Install it or set ESBUILD_PATH.');
}

const svgB64 = fs.readFileSync(path.join(root, 'mark.svg')).toString('base64');
const svgDataUri = `data:image/svg+xml;base64,${svgB64}`;
const inlineTypes = {
  './freighter-sky.webp': 'image/webp',
  './assets/butterfly/mechanical-latch-light.wav': 'audio/wav',
  './assets/butterfly/swish-hard.wav': 'audio/wav'
};

const offlineAssets = {
  name: 'freighter-offline',
  setup(build) {
    build.onResolve({filter: /\?v=\d+$/}, args => ({
      path: path.resolve(args.resolveDir, args.path.replace(/\?v=\d+$/, ''))
    }));
    build.onLoad({filter: /(?:world|deck-audio)\.js$/}, async args => {
      let contents = await fs.promises.readFile(args.path, 'utf8');
      contents = contents.replace(
        /new URL\(['"](\.\/[^'"]+)['"]\s*,\s*import\.meta\.url\)\.href/g,
        (expression, asset) => {
          if (!inlineTypes[asset]) return expression;
          const base64 = fs.readFileSync(path.join(root, asset)).toString('base64');
          return JSON.stringify(`data:${inlineTypes[asset]};base64,${base64}`);
        }
      );
      return {contents, loader: 'js'};
    });
  }
};

const result = await esbuild.build({
  entryPoints: [path.join(root, 'main.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: ['es2020'],
  write: false,
  plugins: [offlineAssets]
});

const bundleJs = result.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>');
const css = fs.readFileSync(path.join(root, 'ui.css'), 'utf8');
const notices = ['THREE-LICENSE.txt', 'assets/butterfly/NOTICE.txt']
  .map(file => fs.readFileSync(path.join(root, file), 'utf8').trim()).join('\n\n');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');
html = html.replace(/\.\/mark\.svg/g, svgDataUri);
html = html.replace(
  /<link rel="stylesheet" href="\.\/ui\.css(?:\?v=\d+)?">/,
  () => `<style>${css}</style>`
);
html = html.replace(
  /<script type="module" src="\.\/main\.js(?:\?v=\d+)?"><\/script>/,
  () => `<script>${bundleJs}</script>`
);
html = html.replace(
  /<\/body><\/html>\s*$/,
  () => `<script type="text/plain" id="third-party-notices">\n${notices}\n</script></body></html>`
);

const outPath = path.join(root, 'transport-ship.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('Built', outPath, (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1), 'KB');
