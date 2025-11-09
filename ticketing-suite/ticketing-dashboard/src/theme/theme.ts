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
          // Modern, clean, bright light mode colors
          primary: {
            main: '#0066FF',
            light: '#3385FF',
            dark: '#0052CC',
            contrastText: '#FFFFFF',
          },
          secondary: {
            main: '#6C5CE7',
            light: '#A29BFE',
            dark: '#5F3DC4',
            contrastText: '#FFFFFF',
          },
          tertiary: {
            main: '#00D9A3',
            light: '#33E3B5',
            dark: '#00B386',
            contrastText: '#FFFFFF',
          },
          error: {
            main: '#FF3B30',
            light: '#FF6259',
            dark: '#E62E24',
            contrastText: '#FFFFFF',
          },
          warning: {
            main: '#FF9500',
            light: '#FFAD33',
            dark: '#CC7700',
            contrastText: '#FFFFFF',
          },
          info: {
            main: '#0066FF',
            light: '#3385FF',
            dark: '#0052CC',
            contrastText: '#FFFFFF',
          },
          success: {
            main: '#34C759',
            light: '#5DD67D',
            dark: '#2AA047',
            contrastText: '#FFFFFF',
          },
          background: {
            default: '#F8F9FA',
            paper: '#FFFFFF',
          },
          text: {
            primary: '#1A1A1A',
            secondary: '#6B7280',
            disabled: '#9CA3AF',
          },
          divider: '#E5E7EB',
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.9375rem',
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 20px',
          fontSize: '0.9375rem',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: mode === 'light' ? '0 2px 8px rgba(0, 102, 255, 0.15)' : undefined,
          },
        },
        contained: {
          '&:hover': {
            boxShadow: mode === 'light' ? '0 4px 12px rgba(0, 102, 255, 0.25)' : undefined,
          },
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: mode === 'light' ? '#FFFFFF' : undefined,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'light' ? '#0066FF' : undefined,
            },
          },
        },
      },
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 16,
          ...(mode === 'light' && {
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
          }),
        },
        outlined: {
          borderColor: mode === 'light' ? '#E5E7EB' : undefined,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          ...(mode === 'light' && {
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }),
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
          borderRadius: 8,
          fontSize: '0.8125rem',
          fontWeight: 500,
          height: 28,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: mode === 'light' ? '1px solid #F3F4F6' : '1px solid #1c2532',
          padding: '16px',
        },
        head: {
          fontWeight: 600,
          color: mode === 'light' ? '#374151' : undefined,
          backgroundColor: mode === 'light' ? '#F9FAFB' : undefined,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'light' ? '#FFFFFF' : undefined,
          color: mode === 'light' ? '#1A1A1A' : undefined,
          boxShadow: mode === 'light' ? '0 1px 3px rgba(0, 0, 0, 0.05)' : undefined,
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          ...(mode === 'light' && {
            border: '1px solid #E5E7EB',
          }),
        },
      },
    },
  },
})

export const createAppTheme = (mode: 'light' | 'dark') => {
  return createTheme(getDesignTokens(mode))
}
