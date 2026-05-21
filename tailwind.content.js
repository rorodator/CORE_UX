import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Content globs for CORE_UX components (for a future app-level Tailwind setup).
 * Not required when consuming prebuilt dist/core-ux.css.
 *
 * @returns {string[]}
 */
export function getCoreUxTailwindContent() {
  return [
    path.join(root, 'components/**/*.js'),
    path.join(root, 'styles/**/*.css')
  ];
}

export default getCoreUxTailwindContent();
