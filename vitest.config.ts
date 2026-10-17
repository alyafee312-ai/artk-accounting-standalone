import {defineConfig} from 'vitest/config';
export default defineConfig({
 test:{
  include:['src/**/*.test.ts','src/**/*.test.tsx','src/**/*.spec.ts','src/**/*.spec.tsx'],
  exclude:['floot-source/**','node_modules/**','android/**','dist/**']
 }
});
