import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiError extends HttpException {
  constructor(
    status: HttpStatus,
    errorCode: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(
      { errorCode, message, error: errorCode, ...(details ?? {}) },
      status,
    );
  }
}

export function notFound(code: string, message: string) {
  return new ApiError(HttpStatus.NOT_FOUND, code, message);
}

export function badRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return new ApiError(HttpStatus.BAD_REQUEST, code, message, details);
}

export function conflict(code: string, message: string) {
  return new ApiError(HttpStatus.CONFLICT, code, message);
}

export function unauthorized(code: string, message: string) {
  return new ApiError(HttpStatus.UNAUTHORIZED, code, message);
}

export function forbidden(code: string, message: string) {
  return new ApiError(HttpStatus.FORBIDDEN, code, message);
}

export function tooManyRequests(code: string, message: string) {
  return new ApiError(HttpStatus.TOO_MANY_REQUESTS, code, message);
}

export function serviceUnavailable(code: string, message: string) {
  return new ApiError(HttpStatus.SERVICE_UNAVAILABLE, code, message);
}

export function notImplemented(code: string, message: string) {
  return new ApiError(HttpStatus.NOT_IMPLEMENTED, code, message);
}
