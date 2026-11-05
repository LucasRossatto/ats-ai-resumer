import { ArgumentsHost, BadRequestException } from '@nestjs/common';
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

  it('keeps Nest HTTP exceptions on their own status', () => {
    filter.catch(new BadRequestException(['name must be a string']), host);
    expect(status).toHaveBeenCalledWith(400);
  });
});
