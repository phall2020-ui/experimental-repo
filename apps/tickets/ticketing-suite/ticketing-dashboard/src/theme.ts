import { createTheme } from '@mui/material/styles'

// Create a light theme matching the modern, clean design
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0066FF',
      light: '#3385FF',
      dark: '#0052CC',
    },
    secondary: {
      main: '#6C5CE7',
      light: '#A29BFE',
      dark: '#5F3DC4',
    },
    error: {
      main: '#FF3B30',
      light: '#FF6259',
      dark: '#E62E24',
    },
    warning: {
      main: '#FF9500',
      light: '#FFAD33',
      dark: '#CC7700',
    },
    success: {
      main: '#34C759',
      light: '#5DD67D',
      dark: '#2AA047',
    },
    info: {
      main: '#0066FF',
      light: '#3385FF',
      dark: '#0052CC',
    },
    background: {
      default: '#F8F9FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#6B7280',
    },
    divider: '#E5E7EB',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    h1: {
      fontSize: '1.5rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.125rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '0.875rem',
    },
    body2: {
      fontSize: '0.8125rem',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #E5E7EB',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
    },
  },
})
