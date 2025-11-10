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

interface CommentsProps {
  ticketId: string
}

export default function Comments({ ticketId }: CommentsProps) {
  const queryClient = useQueryClient()
  const { data: comments = [], isLoading, error } = useComments(ticketId)
  const addCommentMutation = useAddComment(ticketId)
  const { showNotification } = useNotifications()
  
  const [newComment, setNewComment] = React.useState('')
  const [visibility, setVisibility] = React.useState<'PUBLIC' | 'INTERNAL'>('INTERNAL')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editText, setEditText] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      await addCommentMutation.mutateAsync({ body: newComment.trim(), visibility })
      setNewComment('')
      setVisibility('INTERNAL')
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
          <TextField
            fullWidth
            multiline
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            disabled={addCommentMutation.isPending}
            sx={{ mb: 2 }}
            inputProps={{
              'aria-label': 'Comment text',
            }}
          />
          
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

