import React from 'react'
import {
  Box,
  TextField,
  Button,
  Typography,
  Chip,
  Stack,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { Modal } from './common'
import { useNotifications } from '../lib/notifications'

interface AdvancedSearchProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (query: string, filters: Record<string, any>) => void
  initialQuery?: string
}

export default function AdvancedSearch({ isOpen, onClose, onSearch, initialQuery = '' }: AdvancedSearchProps) {
  const [query, setQuery] = React.useState(initialQuery)
  const [searchHistory, setSearchHistory] = React.useState<string[]>(() => {
    const saved = localStorage.getItem('searchHistory')
    return saved ? JSON.parse(saved) : []
  })
  const { showNotification } = useNotifications()

  const handleSearch = () => {
    if (!query.trim()) {
      showNotification('warning', 'Please enter a search query')
      return
    }
    
    // Save to history
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10)
    setSearchHistory(newHistory)
    localStorage.setItem('searchHistory', JSON.stringify(newHistory))
    
    onSearch(query, {})
    onClose()
  }

  const useHistoryItem = (item: string) => {
    setQuery(item)
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Advanced Search"
      maxWidth="md"
      actions={
        <Button
          variant="contained"
          onClick={handleSearch}
          startIcon={<SearchIcon />}
        >
          Search
        </Button>
      }
    >
      <Box>
        <TextField
          fullWidth
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search tickets by description, details, type..."
          autoFocus
          inputProps={{
            'aria-label': 'Search query',
          }}
        />

        {searchHistory.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              Recent Searches
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {searchHistory.map((item, idx) => (
                <Chip
                  key={idx}
                  label={item}
                  onClick={() => useHistoryItem(item)}
                  size="small"
                />
              ))}
            </Stack>
          </Box>
        )}

        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight={600}>
            Search Tips:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary', '& li': { mb: 0.5 } }}>
            <li>Search across ticket descriptions, details, and types</li>
            <li>Use multiple words to narrow results</li>
            <li>Search is case-insensitive</li>
            <li>Results update in real-time as you type</li>
          </Box>
        </Box>
      </Box>
    </Modal>
  )
}
