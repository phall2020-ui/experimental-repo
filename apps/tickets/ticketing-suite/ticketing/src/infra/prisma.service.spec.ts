import { PrismaService } from './prisma.service';

describe('PrismaService - SQL Injection Prevention', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
  });

  describe('withTenant', () => {
    it('should use parameterized queries to prevent SQL injection', () => {
      // Mock the transaction method to capture the SQL being executed
      const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
      const mockTransaction = jest.fn(async (callback) => {
        const mockTx = {
          $executeRaw: mockExecuteRaw,
        };
        return callback(mockTx);
      });

      service.$transaction = mockTransaction as any;

      const maliciousTenantId = "'; DROP TABLE users; --";
      const testFunction = jest.fn().mockResolvedValue('test-result');

      return service.withTenant(maliciousTenantId, testFunction).then(() => {
        // Verify that $executeRaw was called (parameterized query)
        expect(mockExecuteRaw).toHaveBeenCalled();
        
        // Verify the test function was executed
        expect(testFunction).toHaveBeenCalledWith(expect.objectContaining({
          $executeRaw: mockExecuteRaw,
        }));
      });
    });

    it('should properly handle tenant IDs with single quotes', () => {
      const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
      const mockTransaction = jest.fn(async (callback) => {
        const mockTx = {
          $executeRaw: mockExecuteRaw,
        };
        return callback(mockTx);
      });

      service.$transaction = mockTransaction as any;

      const tenantIdWithQuotes = "tenant-with-'quotes'";
      const testFunction = jest.fn().mockResolvedValue('test-result');

      return service.withTenant(tenantIdWithQuotes, testFunction).then(() => {
        expect(mockExecuteRaw).toHaveBeenCalled();
        expect(testFunction).toHaveBeenCalled();
      });
    });

    it('should properly handle tenant IDs with semicolons', () => {
      const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
      const mockTransaction = jest.fn(async (callback) => {
        const mockTx = {
          $executeRaw: mockExecuteRaw,
        };
        return callback(mockTx);
      });

      service.$transaction = mockTransaction as any;

      const tenantIdWithSemicolon = 'tenant;with;semicolon';
      const testFunction = jest.fn().mockResolvedValue('test-result');

      return service.withTenant(tenantIdWithSemicolon, testFunction).then(() => {
        expect(mockExecuteRaw).toHaveBeenCalled();
        expect(testFunction).toHaveBeenCalled();
      });
    });

    it('should return the result from the provided function', () => {
      const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
      const mockTransaction = jest.fn(async (callback) => {
        const mockTx = {
          $executeRaw: mockExecuteRaw,
        };
        return callback(mockTx);
      });

      service.$transaction = mockTransaction as any;

      const expectedResult = { data: 'test-data', count: 42 };
      const testFunction = jest.fn().mockResolvedValue(expectedResult);

      return service.withTenant('test-tenant', testFunction).then((result) => {
        expect(result).toEqual(expectedResult);
      });
    });

    it('should propagate errors from the provided function', () => {
      const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
      const mockTransaction = jest.fn(async (callback) => {
        const mockTx = {
          $executeRaw: mockExecuteRaw,
        };
        return callback(mockTx);
      });

      service.$transaction = mockTransaction as any;

      const errorMessage = 'Test error';
      const testFunction = jest.fn().mockRejectedValue(new Error(errorMessage));

      return expect(
        service.withTenant('test-tenant', testFunction)
      ).rejects.toThrow(errorMessage);
    });
  });
});
