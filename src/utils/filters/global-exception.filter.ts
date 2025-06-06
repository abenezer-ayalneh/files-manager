import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common'
import { Response } from 'express'
import ValidationException from '../exceptions/validation.exception'
import FilterResponseInterface from './interfaces/filter-response.interface'

/**
 * Catch every exception and handle it here
 * and return a consistent error message
 */
@Catch()
export default class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    // Log the error before responding
    this.logger.error({ caughtException: exception })
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    // Create the default response data structure
    const responseData: FilterResponseInterface = {
      statusCode: 500,
      message: 'Internal server error',
      error: 'Server Error',
    }

    if (exception instanceof ValidationException) {
      responseData.message = exception.getMessage
      responseData.statusCode = exception.getStatusCode
      responseData.error = exception.getError
    } else if (exception instanceof HttpException) {
      responseData.message = exception.getResponse()
      responseData.statusCode = exception.getStatus()
      responseData.error = 'HTTP Error'
    }

    response.status(responseData.statusCode).json(responseData)
  }
}
