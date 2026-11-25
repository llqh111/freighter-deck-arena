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

const skyB64 = fs.readFileSync(path.join(root, 'freighter-sky.webp')).toString('base64');
const skyDataUri = `"data:image/webp;base64,${skyB64}"`;
const svgB64 = fs.readFileSync(path.join(root, 'mark.svg')).toString('base64');
const svgDataUri = `data:image/svg+xml;base64,${svgB64}`;

const stripQueryAndInlineSky = {
  name: 'freighter-offline',
  setup(build) {
    build.onResolve({filter: /\?v=\d+$/}, args => ({
      path: path.resolve(args.resolveDir, args.path.replace(/\?v=\d+$/, ''))
    }));
    build.onLoad({filter: /world\.js$/}, async args => {
      let contents = await fs.promises.readFile(args.path, 'utf8');
      contents = contents.replace(
        /new URL\(['"]\.\/freighter-sky\.webp['"]\s*,\s*import\.meta\.url\)\.href/,
        skyDataUri
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
  plugins: [stripQueryAndInlineSky]
});

const bundleJs = result.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>');
const css = fs.readFileSync(path.join(root, 'ui.css'), 'utf8');
const license = fs.readFileSync(path.join(root, 'THREE-LICENSE.txt'), 'utf8').trim();
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
  () => `<script type="text/plain" id="third-party-notices">\n${license}\n</script></body></html>`
);

const outPath = path.join(root, 'transport-ship.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log('Built', outPath, (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1), 'KB');
