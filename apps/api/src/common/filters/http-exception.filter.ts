import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

/** Matches the ported outreach frontend's expected error envelope:
 * {success:false, error:{code,message}}. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const obj = body as Record<string, unknown>;
        message = (obj.message as string) || message;
        code = (obj.errorCode as string) || (obj.error as string) || code;
        if (Array.isArray(obj.message)) {
          message = obj.message.join('; ');
          code = 'VALIDATION_ERROR';
        }
      }
    }
    // A plain Error (not an HttpException we deliberately authored via
    // badRequest/notFound/etc.) falls through with the generic defaults
    // above — its real message is only logged server-side below, never
    // sent to the client, since it may contain upstream provider details
    // (status codes, response bodies, vendor names) never meant to be seen.

    if (status >= 500) {
      const detail = exception instanceof Error ? exception.message : message;
      this.logger.error(`${request.method} ${request.url} -> ${status} ${code}: ${detail}`);
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status} ${code}: ${message}`);
    }

    response.status(status).json({ success: false, error: { code, message } });
  }
}
