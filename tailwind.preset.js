/**
 * Tailwind preset — maps utility tokens to CSS custom properties (runtime theming).
 * Default values live in styles/tokens.css. Used by CORE_UX/tailwind.config.js.
 */
export default {
  theme: {
    extend: {
      colors: {
        core: {
          primary: 'var(--core-color-primary)',
          'primary-hover': 'var(--core-color-primary-hover)',
          'primary-subtle': 'var(--core-color-primary-subtle)',
          'on-primary': 'var(--core-color-on-primary)',
          surface: 'var(--core-color-surface)',
          'surface-muted': 'var(--core-color-surface-muted)',
          'surface-hover': 'var(--core-color-surface-hover)',
          'surface-active': 'var(--core-color-surface-active)',
          border: 'var(--core-color-border)',
          text: 'var(--core-color-text)',
          'text-muted': 'var(--core-color-text-muted)',
          overlay: 'var(--core-color-overlay)',
          'overlay-subtle': 'var(--core-color-overlay-subtle)',
          info: 'var(--core-color-info)',
          'info-muted': 'var(--core-color-info-muted)',
          'info-border': 'var(--core-color-info-border)',
          success: 'var(--core-color-success)',
          'success-muted': 'var(--core-color-success-muted)',
          'success-border': 'var(--core-color-success-border)',
          'success-on-muted': 'var(--core-color-success-on-muted)',
          warning: 'var(--core-color-warning)',
          'warning-muted': 'var(--core-color-warning-muted)',
          'warning-border': 'var(--core-color-warning-border)',
          'warning-on-muted': 'var(--core-color-warning-on-muted)',
          error: 'var(--core-color-error)',
          'error-muted': 'var(--core-color-error-muted)',
          'error-border': 'var(--core-color-error-border)',
          'error-on-muted': 'var(--core-color-error-on-muted)',
          'error-hover': 'var(--core-color-error-hover)',
          'neutral-muted': 'var(--core-color-neutral-muted)',
          'neutral-on-muted': 'var(--core-color-neutral-on-muted)',
          'primary-ring': 'var(--core-color-primary-ring)',
          'primary-ring-strong': 'var(--core-color-primary-ring-strong)',
          'error-ring': 'var(--core-color-error-ring)'
        }
      },
      borderRadius: {
        core: 'var(--core-radius)'
      },
      fontFamily: {
        core: ['var(--core-font-family)']
      },
      boxShadow: {
        core: 'var(--core-shadow)',
        'core-sm': 'var(--core-shadow-sm)',
        'core-lg': 'var(--core-shadow-lg)'
      },
      maxWidth: {
        'core-sm': '640px',
        'core-md': '768px',
        'core-lg': '1024px',
        'core-xl': '1280px'
      }
    }
  },
  plugins: []
};
