import esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['scripts/vendor-source.js'],
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: 'public/vendor.bundle.js',
}).catch(() => process.exit(1));
