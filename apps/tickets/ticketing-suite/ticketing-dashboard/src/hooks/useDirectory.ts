import { useQuery } from '@tanstack/react-query'
import {
  listSites,
  listUsers,
  listIssueTypes,
  listFieldDefinitions,
} from '../lib/directory'

// Query keys
export const directoryQueryKeys = {
  sites: ['directory', 'sites'] as const,
  users: ['directory', 'users'] as const,
  issueTypes: ['directory', 'issueTypes'] as const,
  fieldDefinitions: ['directory', 'fieldDefinitions'] as const,
}

export const useSites = () => {
  return useQuery({
    queryKey: directoryQueryKeys.sites,
    queryFn: listSites,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useUsers = () => {
  return useQuery({
    queryKey: directoryQueryKeys.users,
    queryFn: listUsers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useIssueTypes = () => {
  return useQuery({
    queryKey: directoryQueryKeys.issueTypes,
    queryFn: listIssueTypes,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useFieldDefinitions = () => {
  return useQuery({
    queryKey: directoryQueryKeys.fieldDefinitions,
    queryFn: listFieldDefinitions,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}
