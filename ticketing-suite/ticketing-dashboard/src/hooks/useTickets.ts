import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listComments,
  addComment,
  listAttachments,
  presignAttachment,
  finalizeAttachment,
  getTicket,
  updateTicket,
  listTickets,
  createTicket,
  listTicketHistory,
  type Comment,
  type Attachment,
  type Ticket,
  type TicketHistoryEntry,
} from '../lib/api'

// Query keys
export const queryKeys = {
  tickets: ['tickets'] as const,
  ticket: (id: string) => ['ticket', id] as const,
  ticketHistory: (id: string) => ['ticketHistory', id] as const,
  comments: (ticketId: string) => ['comments', ticketId] as const,
  attachments: (ticketId: string) => ['attachments', ticketId] as const,
}

// Tickets
export const useTickets = (params?: any) => {
  return useQuery({
    queryKey: [...queryKeys.tickets, params],
    queryFn: () => listTickets(params),
  })
}

export const useTicket = (id: string) => {
  return useQuery({
    queryKey: queryKeys.ticket(id),
    queryFn: () => getTicket(id),
    enabled: !!id,
  })
}

export const useTicketHistory = (id: string) => {
  return useQuery({
    queryKey: queryKeys.ticketHistory(id),
    queryFn: () => listTicketHistory(id),
    enabled: !!id,
  })
}

export const useCreateTicket = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets })
    },
  })
}

export const useUpdateTicket = (id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => updateTicket(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ticket(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets })
      queryClient.invalidateQueries({ queryKey: queryKeys.ticketHistory(id) })
    },
  })
}

// Comments
export const useComments = (ticketId: string) => {
  return useQuery({
    queryKey: queryKeys.comments(ticketId),
    queryFn: () => listComments(ticketId),
    enabled: !!ticketId,
  })
}

export const useAddComment = (ticketId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ body, visibility }: { body: string; visibility: 'PUBLIC' | 'INTERNAL' }) =>
      addComment(ticketId, body, visibility),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(ticketId) })
    },
  })
}

// Attachments
export const useAttachments = (ticketId: string) => {
  return useQuery({
    queryKey: queryKeys.attachments(ticketId),
    queryFn: () => listAttachments(ticketId),
    enabled: !!ticketId,
  })
}

export const usePresignAttachment = (ticketId: string) => {
  return useMutation({
    mutationFn: ({ filename, contentType }: { filename: string; contentType: string }) =>
      presignAttachment(ticketId, filename, contentType),
  })
}

export const useFinalizeAttachment = (ticketId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ attachmentId, fileSize, checksum }: { attachmentId: string; fileSize: number; checksum: string }) =>
      finalizeAttachment(ticketId, attachmentId, fileSize, checksum),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attachments(ticketId) })
    },
  })
}
