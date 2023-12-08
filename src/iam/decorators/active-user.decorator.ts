import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { REQUEST_USER_KEY } from '../iam.constants'
import { ActiveUserData } from '../interfaces/active-user-data.interface'

export const ActiveUser = createParamDecorator(
  (field: keyof ActiveUserData | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest()
    const user: ActiveUserData | undefined = request[REQUEST_USER_KEY]
    return field ? user?.[field] : user
  },
)
