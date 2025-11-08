import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Box, Button, Typography, Paper, Container } from '@mui/material'
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              py: 4,
            }}
          >
            <Paper
              elevation={0}
              variant="outlined"
              sx={{
                p: 4,
                width: '100%',
                textAlign: 'center',
              }}
            >
              <ErrorIcon
                sx={{
                  fontSize: 64,
                  color: 'error.main',
                  mb: 2,
                }}
              />
              
              <Typography variant="h4" component="h1" gutterBottom>
                Something went wrong
              </Typography>
              
              <Typography variant="body1" color="text.secondary" paragraph>
                An error occurred while rendering this component. Please try refreshing the page.
              </Typography>

              {this.state.error && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    mt: 3,
                    mb: 3,
                    textAlign: 'left',
                    bgcolor: 'error.dark',
                    color: 'error.contrastText',
                  }}
                >
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {this.state.error.toString()}
                    {this.state.errorInfo && '\n\n' + this.state.errorInfo.componentStack}
                  </Typography>
                </Paper>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReset}
                >
                  Try Again
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </Button>
              </Box>
            </Paper>
          </Box>
        </Container>
      )
    }

    return this.props.children
  }
}
