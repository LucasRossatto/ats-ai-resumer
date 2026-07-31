import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { MulterError } from 'multer';
import { ResponseService } from '@application/services/response.service';

/**
 * Multer throws before the route handler runs, so the errors it raises never
 * reach ApiExceptionFilter as HttpExceptions. This maps them to the same
 * response envelope used by the rest of the API.
 */
@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  constructor(private readonly responseService: ResponseService) {}

  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isTooLarge = exception.code === 'LIMIT_FILE_SIZE';
    const status = isTooLarge
      ? HttpStatus.PAYLOAD_TOO_LARGE
      : HttpStatus.BAD_REQUEST;
    const message = isTooLarge
      ? 'The file must be at most 5MB'
      : exception.message;
    const code = isTooLarge ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST';

    const errorResponse = this.responseService.error(message, code);
    const responseWithContext = this.responseService.withRequest(
      errorResponse,
      request,
    );

    response.status(status).json(responseWithContext);
  }
}
