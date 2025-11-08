import { createTheme, ThemeOptions } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    tertiary: Palette['primary']
  }
  interface PaletteOptions {
    tertiary?: PaletteOptions['primary']
  }
}

const getDesignTokens = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Light mode colors
          primary: {
            main: '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0',
            contrastText: '#fff',
          },
          secondary: {
            main: '#9c27b0',
            light: '#ba68c8',
            dark: '#7b1fa2',
            contrastText: '#fff',
          },
          tertiary: {
            main: '#2ecc71',
            light: '#58d68d',
            dark: '#27ae60',
            contrastText: '#fff',
          },
          error: {
            main: '#e74c3c',
            light: '#ef5350',
            dark: '#c0392b',
          },
          warning: {
            main: '#f1c40f',
            light: '#ffeb3b',
            dark: '#f39c12',
          },
          info: {
            main: '#3498db',
            light: '#64b5f6',
            dark: '#2980b9',
          },
          success: {
            main: '#2ecc71',
            light: '#81c784',
            dark: '#27ae60',
          },
          background: {
            default: '#f5f5f5',
            paper: '#ffffff',
          },
          text: {
            primary: 'rgba(0, 0, 0, 0.87)',
            secondary: 'rgba(0, 0, 0, 0.6)',
            disabled: 'rgba(0, 0, 0, 0.38)',
          },
        }
      : {
          // Dark mode colors (matching current design)
          primary: {
            main: '#5b9cff',
            light: '#7ab3ff',
            dark: '#4a7dcc',
            contrastText: '#041022',
          },
          secondary: {
            main: '#ba68c8',
            light: '#ce93d8',
            dark: '#9c27b0',
            contrastText: '#fff',
          },
          tertiary: {
            main: '#2ecc71',
            light: '#58d68d',
            dark: '#27ae60',
            contrastText: '#fff',
          },
          error: {
            main: '#e74c3c',
            light: '#ffb3b3',
            dark: '#c0392b',
          },
          warning: {
            main: '#f1c40f',
            light: '#ffe1a1',
            dark: '#f39c12',
          },
          info: {
            main: '#5b9cff',
            light: '#b1d8ff',
            dark: '#4a7dcc',
          },
          success: {
            main: '#2ecc71',
            light: '#a6f0c2',
            dark: '#27ae60',
          },
          background: {
            default: '#0b0f14',
            paper: '#121821',
          },
          text: {
            primary: '#e6eef6',
            secondary: '#8ca0b3',
            disabled: 'rgba(230, 238, 246, 0.38)',
          },
        }),
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: '0.875rem',
          fontWeight: 600,
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
      defaultProps: {
        elevation: 0,
        variant: 'outlined',
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontSize: '0.75rem',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: mode === 'dark' ? '1px solid #1c2532' : undefined,
        },
      },
    },
  },
})

export const createAppTheme = (mode: 'light' | 'dark') => {
  return createTheme(getDesignTokens(mode))
}
