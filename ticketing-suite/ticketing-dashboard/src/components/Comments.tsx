import React from 'react'
import {
  Card,
  CardContent,
  Typography,
  Alert,
  Box,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  CircularProgress,
} from '@mui/material'
import { Send as SendIcon } from '@mui/icons-material'
import { useQueryClient } from '@tanstack/react-query'
import { updateComment, deleteComment, type Comment } from '../lib/api'
import { useComments, useAddComment } from '../hooks/useTickets'
import { useNotifications } from '../lib/notifications'
import { useUsers } from '../hooks/useDirectory'
import type { UserOpt } from '../lib/directory'

interface CommentsProps {
  ticketId: string
}

export default function Comments({ ticketId }: CommentsProps) {
  const queryClient = useQueryClient()
  const { data: comments = [], isLoading, error } = useComments(ticketId)
  const addCommentMutation = useAddComment(ticketId)
  const { showNotification } = useNotifications()
  const { data: users = [] } = useUsers()
  
  const [newComment, setNewComment] = React.useState('')
  const [visibility, setVisibility] = React.useState<'PUBLIC' | 'INTERNAL'>('INTERNAL')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editText, setEditText] = React.useState('')
  const [mentionState, setMentionState] = React.useState<{ start: number; end: number; query: string } | null>(null)
  const [mentionLookup, setMentionLookup] = React.useState<Map<string, string>>(() => new Map())
  const [mentionHighlight, setMentionHighlight] = React.useState(0)
  const textAreaRef = React.useRef<HTMLTextAreaElement | null>(null)

  const mentionSuggestions = React.useMemo(() => {
    if (!mentionState) {
      return []
    }
    const query = mentionState.query.toLowerCase()
    const source = users.map((user) => ({
      ...user,
      label: user.name?.trim() || user.email,
    }))
    if (query.length === 0) {
      return source.slice(0, 8)
    }
    return source
      .filter((user) => {
        const label = user.label.toLowerCase()
        return label.includes(query) || user.email.toLowerCase().includes(query)
      })
      .slice(0, 8)
  }, [mentionState, users])

  React.useEffect(() => {
    if (mentionSuggestions.length > 0) {
      setMentionHighlight(0)
    }
  }, [mentionSuggestions.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    const mentionIds = Array.from(mentionLookup.entries())
      .filter(([label]) => newComment.includes(`@${label}`))
      .map(([, id]) => id)

    try {
      await addCommentMutation.mutateAsync({ body: newComment.trim(), visibility, mentions: mentionIds })
      setNewComment('')
      setVisibility('INTERNAL')
      setMentionState(null)
      setMentionLookup(new Map())
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  const handleEdit = (comment: Comment) => {
    setEditingId(comment.id)
    setEditText(comment.body)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return

    try {
      await updateComment(ticketId, commentId, editText.trim())
      setEditingId(null)
      setEditText('')
      queryClient.invalidateQueries({ queryKey: ['comments', ticketId] })
      showNotification('success', 'Comment updated')
    } catch (e: any) {
      showNotification('error', e?.response?.data?.message || e?.message || 'Failed to update comment')
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await deleteComment(ticketId, commentId)
      queryClient.invalidateQueries({ queryKey: ['comments', ticketId] })
      showNotification('success', 'Comment deleted')
    } catch (e: any) {
      showNotification('error', e?.response?.data?.message || e?.message || 'Failed to delete comment')
    }
  }

  const findMentionAtCursor = React.useCallback((text: string, cursor: number) => {
    const uptoCursor = text.slice(0, cursor)
    const atIndex = uptoCursor.lastIndexOf('@')
    if (atIndex === -1) return null
    if (atIndex > 0) {
      const charBefore = uptoCursor[atIndex - 1]
      if (!/\s|[\(\[{]/.test(charBefore)) {
        return null
      }
    }
    const query = text.slice(atIndex + 1, cursor)
    if (query.includes('\n') || query.includes(' ')) return null
    for (let i = atIndex + 1; i < cursor; i += 1) {
      const ch = text[i]
      if (ch && !/[a-zA-Z0-9._-]/.test(ch)) {
        return null
      }
    }
    return { start: atIndex, end: cursor, query }
  }, [])

  const updateMentionLookup = React.useCallback((value: string) => {
    setMentionLookup((prev) => {
      let mutated = false
      const next = new Map(prev)
      for (const label of prev.keys()) {
        if (!value.includes(`@${label}`)) {
          next.delete(label)
          mutated = true
        }
      }
      return mutated ? next : prev
    })
  }, [])

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursor = e.target.selectionStart ?? value.length
    setNewComment(value)
    updateMentionLookup(value)
    const mention = findMentionAtCursor(value, cursor)
    if (mention && mention.query.length === 0) {
      setMentionState(mention)
    } else if (mention && mention.query.length > 0) {
      setMentionState(mention)
    } else {
      setMentionState(null)
    }
  }

  const insertMention = (user: UserOpt & { label?: string }) => {
    if (!mentionState) return
    const label = user.label || user.name?.trim() || user.email
    const insertion = `@${label}`
    const trailingSpace = ' '
    setNewComment((prev) => {
      const before = prev.slice(0, mentionState.start)
      const after = prev.slice(mentionState.end)
      const nextValue = `${before}${insertion}${trailingSpace}${after}`
      updateMentionLookup(nextValue)
      setMentionLookup((prevLookup) => {
        const next = new Map(prevLookup)
        next.set(label, user.id)
        return next
      })
      requestAnimationFrame(() => {
        const pos = before.length + insertion.length + trailingSpace.length
        if (textAreaRef.current) {
          textAreaRef.current.focus()
          textAreaRef.current.setSelectionRange(pos, pos)
        }
      })
      return nextValue
    })
    setMentionState(null)
  }

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!mentionState || mentionSuggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMentionHighlight((prev) => (prev + 1) % mentionSuggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setMentionHighlight((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length)
    } else if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey) {
      e.preventDefault()
      const selected = mentionSuggestions[mentionHighlight]
      if (selected) {
        insertMention(selected)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setMentionState(null)
    }
  }

  const handleSelectMention = (user: UserOpt & { label?: string }) => {
    insertMention(user)
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Comments ({comments.length})
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error instanceof Error ? error.message : 'Failed to load comments'}
          </Alert>
        )}

      {isLoading ? (
        <div className="muted">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="muted">No comments yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          {comments.map(comment => (
            <div
              key={comment.id}
              style={{
                padding: 12,
                background: '#ffffff',
                borderRadius: 8,
                border: '1px solid #e3e8ef',
                boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  {new Date(comment.createdAt).toLocaleString()}
                  {comment.userId && ` · User ${comment.userId}`}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      background: comment.visibility === 'PUBLIC' ? '#e7f8ed' : '#f4f6fa',
                      color: '#3a4859',
                      border: '1px solid #d4dae5'
                    }}
                  >
                    {comment.visibility}
                  </span>
                  <button
                    onClick={() => handleEdit(comment)}
                    style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid #cfd6e3', background: '#ffffff' }}
                    title="Edit comment"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid #f0b3b3', background: '#ffe5e5', color: '#7a1f1f' }}
                    title="Delete comment"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {editingId === comment.id ? (
                <div>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    style={{ width: '100%', minHeight: 60, marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={handleCancelEdit} style={{ fontSize: 11 }}>Cancel</button>
                    <button onClick={() => handleSaveEdit(comment.id)} className="primary" style={{ fontSize: 11 }}>
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {comment.body}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

        <Box component="form" onSubmit={handleSubmit}>
          <div style={{ position: 'relative' }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={newComment}
              onChange={handleCommentChange}
              onKeyDown={handleCommentKeyDown}
              placeholder="Add a comment... Use @ to mention someone"
              disabled={addCommentMutation.isPending}
              sx={{ mb: 2 }}
              inputRef={textAreaRef}
              inputProps={{
                'aria-label': 'Comment text',
              }}
            />
            {mentionState && mentionSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  transform: 'translateY(100%)',
                  background: '#ffffff',
                  border: '1px solid #d4dae5',
                  borderRadius: 8,
                  boxShadow: '0 8px 16px rgba(15, 23, 42, 0.12)',
                  zIndex: 20,
                  minWidth: 240,
                  maxHeight: 220,
                  overflowY: 'auto',
                }}
              >
                {mentionSuggestions.map((user, idx) => {
                  const label = user.label || user.name || user.email
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectMention(user)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        width: '100%',
                        padding: '8px 12px',
                        background: idx === mentionHighlight ? '#eef2ff' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{label}</span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{user.email}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">Visibility</FormLabel>
            <RadioGroup
              row
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'INTERNAL')}
              aria-label="Comment visibility"
            >
              <FormControlLabel
                value="INTERNAL"
                control={<Radio />}
                label="Internal"
                disabled={addCommentMutation.isPending}
              />
              <FormControlLabel
                value="PUBLIC"
                control={<Radio />}
                label="Public"
                disabled={addCommentMutation.isPending}
              />
            </RadioGroup>
          </FormControl>
          
          <Button
            type="submit"
            variant="contained"
            disabled={!newComment.trim() || addCommentMutation.isPending}
            startIcon={addCommentMutation.isPending ? <CircularProgress size={20} /> : <SendIcon />}
            fullWidth
          >
            {addCommentMutation.isPending ? 'Adding Comment...' : 'Add Comment'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}

