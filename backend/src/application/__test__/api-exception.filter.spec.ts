import { ArgumentsHost, BadRequestException, Logger } from '@nestjs/common';
import { ApiExceptionFilter } from '@application/filters/api-exception.filter';
import { DomainValidationError } from '@domain/errors/domain-validation.error';

describe('ApiExceptionFilter', () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const responseService = {
    error: jest.fn((message: string, code: string, details: unknown) => ({
      message,
      error: { code, details },
    })),
    withRequest: jest.fn((body: unknown) => body),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/x', method: 'POST' }),
    }),
  } as unknown as ArgumentsHost;
  const filter = new ApiExceptionFilter(responseService as never);

  beforeEach(() => jest.clearAllMocks());

  it('maps a business rule violation to 400 VALIDATION_ERROR, not 500', () => {
    filter.catch(
      new DomainValidationError('Password does not meet requirements'),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(responseService.error).toHaveBeenCalledWith(
      'Password does not meet requirements',
      'VALIDATION_ERROR',
      null,
    );
  });

  it('keeps unexpected errors as 500', () => {
    filter.catch(new Error('boom'), host);
    expect(status).toHaveBeenCalledWith(500);
  });

  it('never sends the message of an unexpected error to the client', () => {
    const errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    filter.catch(new Error('E11000 duplicate key index: emailHash_1'), host);

    expect(responseService.error).toHaveBeenCalledWith(
      'Internal server error',
      'APPLICATION_ERROR',
      null,
    );
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('E11000 duplicate key'),
    );
    errorLog.mockRestore();
  });

  it('keeps Nest HTTP exceptions on their own status', () => {
    filter.catch(new BadRequestException(['name must be a string']), host);
    expect(status).toHaveBeenCalledWith(400);
  });
});
