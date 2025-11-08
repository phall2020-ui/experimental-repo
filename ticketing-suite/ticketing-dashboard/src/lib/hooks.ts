import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import type { Ticket, Comment, Attachment } from './api'

// Query Keys
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...ticketKeys.lists(), { filters }] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
  history: (id: string) => [...ticketKeys.detail(id), 'history'] as const,
  comments: (id: string) => [...ticketKeys.detail(id), 'comments'] as const,
}

// Tickets Hooks
export const useTickets = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: ticketKeys.list(params),
    queryFn: () => api.listTickets(params),
    enabled: true,
  })
}

export const useTicket = (id: string) => {
  return useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => api.getTicket(id),
    enabled: !!id,
  })
}

export const useTicketHistory = (id: string) => {
  return useQuery({
    queryKey: ticketKeys.history(id),
    queryFn: () => api.listTicketHistory(id),
    enabled: !!id,
  })
}

export const useCreateTicket = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
    },
  })
}

export const useUpdateTicket = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateTicket>[1] }) =>
      api.updateTicket(id, patch),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.id) })
    },
  })
}

// Comments Hooks
export const useComments = (ticketId: string) => {
  return useQuery({
    queryKey: ticketKeys.comments(ticketId),
    queryFn: () => api.listComments(ticketId),
    enabled: !!ticketId,
  })
}

export const useAddComment = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ ticketId, body, visibility }: { 
      ticketId: string
      body: string
      visibility: 'PUBLIC' | 'INTERNAL'
    }) => api.addComment(ticketId, body, visibility),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.comments(variables.ticketId) })
    },
  })
}

// Health Hooks
export const useHealth = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

export const useHealthDb = () => {
  return useQuery({
    queryKey: ['health', 'db'],
    queryFn: api.getHealthDb,
    refetchInterval: 30000,
  })
}

export const useHealthRedis = () => {
  return useQuery({
    queryKey: ['health', 'redis'],
    queryFn: api.getHealthRedis,
    refetchInterval: 30000,
  })
}
