process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://taverna:taverna@localhost:5432/taverna_test'
process.env.JWT_SECRET = 'segredo-dos-testes-da-taverna'
