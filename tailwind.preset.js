/**
 * Tailwind preset — design tokens for CORE_UX.
 * Used by CORE_UX/tailwind.config.js. Apps may reuse when adding their own Tailwind layer.
 */
export default {
  theme: {
    extend: {
      colors: {
        core: {
          primary: '#2185d0',
          'primary-hover': '#1678c2',
          secondary: '#767676',
          'secondary-hover': '#5e5e5e',
          surface: '#ffffff',
          'surface-muted': '#f9fafb',
          border: '#e0e1e2',
          text: '#1b1c1d',
          'text-muted': '#767676',
          success: '#21ba45',
          'success-muted': '#e8f6ec',
          warning: '#f2711c',
          'warning-muted': '#fff6e6',
          error: '#db2828',
          'error-muted': '#fdeaea',
          info: '#2185d0',
          'info-muted': '#e8f4fc'
        }
      },
      borderRadius: {
        core: '0.28571429rem'
      },
      fontFamily: {
        core: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ]
      },
      boxShadow: {
        core: '0 1px 3px rgba(0, 0, 0, 0.08)',
        'core-lg': '0 8px 24px rgba(0, 0, 0, 0.12)'
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
