import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('build',{recursive:true});
await build({entryPoints:['server.mjs'],bundle:true,platform:'node',format:'esm',target:'node24',outfile:'build/index.mjs',banner:{js:"import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"}});
await build({entryPoints:['client.js'],bundle:true,platform:'browser',format:'esm',target:'es2022',outfile:'build/app.js'});
await copyFile('index.html','build/index.html');
