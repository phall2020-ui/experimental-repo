import { QueryTicketDto } from './query-ticket.dto';
import { validate } from 'class-validator';

describe('QueryTicketDto', () => {
  it('should accept valid date range filters', async () => {
    const dto = new QueryTicketDto();
    dto.createdFrom = '2025-01-01';
    dto.createdTo = '2025-12-31';
    
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept valid assignedUserId filter', async () => {
    const dto = new QueryTicketDto();
    dto.assignedUserId = '550e8400-e29b-41d4-a716-446655440000';
    
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid date format for createdFrom', async () => {
    const dto = new QueryTicketDto();
    dto.createdFrom = 'invalid-date';
    
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('createdFrom');
  });

  it('should reject invalid date format for createdTo', async () => {
    const dto = new QueryTicketDto();
    dto.createdTo = 'not-a-date';
    
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('createdTo');
  });

  it('should reject invalid UUID for assignedUserId', async () => {
    const dto = new QueryTicketDto();
    dto.assignedUserId = 'not-a-uuid';
    
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('assignedUserId');
  });

  it('should accept valid custom field filters', async () => {
    const dto = new QueryTicketDto();
    dto.cf_key = 'test_field';
    dto.cf_val = 'test_value';
    
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept all filters together', async () => {
    const dto = new QueryTicketDto();
    dto.status = 'NEW';
    dto.priority = 'P1';
    dto.siteId = '550e8400-e29b-41d4-a716-446655440000';
    dto.assignedUserId = '550e8400-e29b-41d4-a716-446655440001';
    dto.createdFrom = '2025-01-01';
    dto.createdTo = '2025-12-31';
    dto.cf_key = 'test_field';
    dto.cf_val = 'test_value';
    dto.search = 'test query';
    dto.limit = '50';
    
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
