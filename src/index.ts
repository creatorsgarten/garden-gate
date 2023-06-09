import {Elysia, t} from 'elysia'

import {verifyRequestAuthenticity} from './verify'
import {CARD_VALIDITY_IN_MINUTES} from './constants'
import {createTimedAccessCard, deleteTimedAccessCard} from './access'

// TODO: #1 expose the server only to allowed hostnames for security
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
        // TODO: #1 revoke the prior access cards if the user has an unexpired card.
        const cardNo = await createTimedAccessCard()

        // Delete the timed access card after X minutes.
        setTimeout(async () => {
          await deleteTimedAccessCard(cardNo)
        }, 1000 * 60 * CARD_VALIDITY_IN_MINUTES)
      })
  )
  .listen(3000)

console.log(
  `Garden gate is running at ${app.server?.hostname}:${app.server?.port}`
)
