import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { configureApp } from '../src/setup'

export async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
  const app = moduleRef.createNestApplication()
  configureApp(app)
  await app.init()
  return app
}

let counter = 0

export interface TestUser {
  id: string
  cookie: string
  agent: () => request.Agent
}

export async function signUp(app: INestApplication, name = 'Aventureira'): Promise<TestUser> {
  counter += 1
  const email = `user${counter}-${Date.now()}@teste.dev`
  const res = await request(app.getHttpServer()).post('/api/auth/register').send({ displayName: name, email, password: 'senha-forte-123' }).expect(201)
  const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? [])[0]!.split(';')[0]!
  return {
    id: res.body.id as string,
    cookie,
    agent: () => request.agent(app.getHttpServer()).set('Cookie', cookie)
  }
}
