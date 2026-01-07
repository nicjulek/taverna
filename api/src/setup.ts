import { INestApplication } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api', { exclude: ['/'] })
  app.use(cookieParser())
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }))
}
