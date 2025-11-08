import React from 'react'
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormLabel,
  Checkbox,
  FormControlLabel,
  InputLabel,
} from '@mui/material'
import type { FieldDefOpt } from '../lib/directory'

interface CustomFieldsFormProps {
  fieldDefs: FieldDefOpt[]
  values: Record<string, any>
  onChange: (values: Record<string, any>) => void
}

export default function CustomFieldsForm({ fieldDefs, values, onChange }: CustomFieldsFormProps) {
  const updateField = (key: string, value: any) => {
    onChange({ ...values, [key]: value })
  }

  const renderField = (def: FieldDefOpt) => {
    const value = values[def.key] ?? ''

    switch (def.datatype) {
      case 'string':
        return (
          <TextField
            fullWidth
            type="text"
            value={value}
            onChange={e => updateField(def.key, e.target.value)}
            placeholder={def.label}
            required={def.required}
            size="small"
            inputProps={{
              'aria-label': def.label,
            }}
          />
        )
      
      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            value={value}
            onChange={e => updateField(def.key, e.target.value ? Number(e.target.value) : '')}
            placeholder={def.label}
            required={def.required}
            size="small"
            inputProps={{
              'aria-label': def.label,
            }}
          />
        )
      
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={value === true}
                onChange={e => updateField(def.key, e.target.checked)}
              />
            }
            label={def.label}
          />
        )
      
      case 'date':
        return (
          <TextField
            fullWidth
            type="date"
            value={value ? new Date(value).toISOString().split('T')[0] : ''}
            onChange={e => updateField(def.key, e.target.value ? new Date(e.target.value).toISOString() : '')}
            required={def.required}
            size="small"
            InputLabelProps={{ shrink: true }}
            inputProps={{
              'aria-label': def.label,
            }}
          />
        )
      
      case 'enum':
        return (
          <FormControl fullWidth size="small">
            <InputLabel id={`${def.key}-label`}>{def.label}</InputLabel>
            <Select
              labelId={`${def.key}-label`}
              value={value}
              onChange={e => updateField(def.key, e.target.value)}
              required={def.required}
              label={def.label}
              aria-label={def.label}
            >
              <MenuItem value="">
                <em>Select {def.label}</em>
              </MenuItem>
              {def.enumOptions?.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )
      
      default:
        return null
    }
  }

  if (fieldDefs.length === 0) return null

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {fieldDefs.map(def => (
        <Box key={def.key}>
          {def.datatype !== 'boolean' && (
            <FormLabel sx={{ display: 'block', mb: 1, fontWeight: 600, fontSize: '0.875rem' }}>
              {def.label}
              {def.required && <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>*</Box>}
            </FormLabel>
          )}
          {renderField(def)}
        </Box>
      ))}
    </Box>
  )
}

