import {Elysia, t} from 'elysia'

import {verifyRequestAuthenticity} from './verify'
import {createTimedAccessCard} from './access'

// @todo #1 expose the server only to allowed hostnames for security
const app = new Elysia()

app
  .get('/', () => ({status: 'Garden Gate is active.'}))
  .guard(
    {
      headers: t.Object({Authorization: t.String()}),
      beforeHandle: (req) =>
        verifyRequestAuthenticity(req.headers.Authorization ?? ''),
    },
    (app) =>
      app.post('/access/generate', async () => {
        await createTimedAccessCard()
      })
  )
  .listen(3000)

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
