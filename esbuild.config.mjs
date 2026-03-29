import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

// Build main.ts -> dist/main.js (Figma sandbox, IIFE)
const mainBuildOptions = {
  entryPoints: [resolve(__dirname, 'src/main.ts')],
  bundle: true,
  outfile: resolve(__dirname, 'dist/main.js'),
  format: 'iife',
  target: 'es2020',
  minify: !isWatch,
};

// Build ui.ts -> temp file, then inline into ui.html
const uiBuildOptions = {
  entryPoints: [resolve(__dirname, 'src/ui.ts')],
  bundle: true,
  write: false,
  format: 'iife',
  target: 'es2020',
  minify: !isWatch,
};

async function build() {
  mkdirSync(resolve(__dirname, 'dist'), { recursive: true });

  // Build main.js
  await esbuild.build(mainBuildOptions);

  // Build UI: compile TS then inline into HTML
  const uiResult = await esbuild.build(uiBuildOptions);
  const uiJs = uiResult.outputFiles[0].text;

  const uiHtml = readFileSync(resolve(__dirname, 'src/ui.html'), 'utf8');
  const finalHtml = uiHtml.replace(
    '<!-- INLINE_SCRIPT -->',
    `<script>${uiJs}</script>`
  );

  writeFileSync(resolve(__dirname, 'dist/ui.html'), finalHtml);

  console.log('Build complete.');
}

if (isWatch) {
  const mainCtx = await esbuild.context(mainBuildOptions);
  await mainCtx.watch();

  // For watch mode, rebuild UI on change
  const uiCtx = await esbuild.context({
    ...uiBuildOptions,
    write: true,
    outfile: resolve(__dirname, 'dist/ui.js'),
    plugins: [{
      name: 'inline-html',
      setup(build) {
        build.onEnd(() => {
          try {
            const uiJs = readFileSync(resolve(__dirname, 'dist/ui.js'), 'utf8');
            const uiHtml = readFileSync(resolve(__dirname, 'src/ui.html'), 'utf8');
            const finalHtml = uiHtml.replace(
              '<!-- INLINE_SCRIPT -->',
              `<script>${uiJs}</script>`
            );
            writeFileSync(resolve(__dirname, 'dist/ui.html'), finalHtml);
            console.log('UI rebuilt.');
          } catch (e) {
            console.error('UI rebuild error:', e.message);
          }
        });
      },
    }],
  });
  await uiCtx.watch();

  console.log('Watching for changes...');
} else {
  await build();
}
