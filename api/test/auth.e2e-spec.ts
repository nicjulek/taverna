import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createApp, signUp } from './helpers'

describe('auth', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('cadastra, mantém a sessão no cookie e sai', async () => {
    const user = await signUp(app, 'Lia')
    const me = await user.agent().get('/api/auth/me').expect(200)
    expect(me.body).toMatchObject({ id: user.id, displayName: 'Lia' })
    expect(me.body).not.toHaveProperty('passwordHash')
    const logout = await user.agent().post('/api/auth/logout').expect(204)
    expect(String(logout.headers['set-cookie'])).toContain('taverna_session=;')
  })

  it('recusa e-mail repetido', async () => {
    const body = { displayName: 'Duplicada', email: `dup-${Date.now()}@teste.dev`, password: 'senha-forte-123' }
    await request(app.getHttpServer()).post('/api/auth/register').send(body).expect(201)
    const res = await request(app.getHttpServer()).post('/api/auth/register').send(body).expect(409)
    expect(res.body.fields.email).toBeDefined()
  })

  it('login com senha errada devolve 401 sem dizer se o e-mail existe', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ninguem@teste.dev', password: 'qualquer' })
      .expect(401)
    expect(res.body.message).toBe('E-mail ou senha incorretos')
  })

  it('valida os campos com mensagens por campo', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ displayName: 'A', email: 'x', password: '123' })
      .expect(400)
    expect(Object.keys(res.body.fields).sort()).toEqual(['displayName', 'email', 'password'])
  })

  it('bloqueia rotas privadas sem sessão', async () => {
    await request(app.getHttpServer()).get('/api/campaigns').expect(401)
  })
})
