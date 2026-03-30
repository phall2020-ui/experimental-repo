import { TicketPriority } from '@prisma/client';

describe('TicketPriority Enum', () => {
  it('should have P1, P2, P3, P4 values', () => {
    expect(TicketPriority.P1).toBe('P1');
    expect(TicketPriority.P2).toBe('P2');
    expect(TicketPriority.P3).toBe('P3');
    expect(TicketPriority.P4).toBe('P4');
  });

  it('should not have High, Medium, Low values', () => {
    expect((TicketPriority as any).High).toBeUndefined();
    expect((TicketPriority as any).Medium).toBeUndefined();
    expect((TicketPriority as any).Low).toBeUndefined();
  });
});
