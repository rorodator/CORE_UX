import path from 'path';
import { fileURLToPath } from 'url';
import preset from './tailwind.preset.js';

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Tailwind config for CORE_UX kit build only.
 * Applications do not need this file unless they add their own Tailwind layer.
 */
export default {
  presets: [preset],
  content: [
    path.join(root, 'components/**/*.js'),
    path.join(root, 'styles/**/*.css')
  ]
};
