import base from './playwright.config';
import { defineConfig } from '@playwright/test';
// Local reproduction of the CI renderer: no GPU, software WebGL.
export default defineConfig({
  ...base,
  workers: 1,
  projects: base.projects!.map(p => ({ ...p, use: { ...p.use, launchOptions: { args: ['--use-angle=swiftshader', '--use-gl=angle', '--disable-gpu'] } } })),
});
