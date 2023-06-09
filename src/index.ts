import { Elysia, t } from 'elysia'

import { CARD_VALIDITY_IN_MINUTES } from './constants'
import { verifyRequestAuthenticity } from './verify'
import { createTimedAccessCard, deleteTimedAccessCard } from './access'

// TODO: #1 expose the server only to allowed hostnames for security
const app = new Elysia()
    .get('/', () => ({ status: 'Garden Gate is active.' }))
    .guard(
        {
            headers: t.Object({ Authorization: t.String() })
            // beforeHandle: (req) =>
            //   verifyRequestAuthenticity(req.headers.Authorization ?? ''),
        },
        (app) =>
            app.post('/access/generate', async () => {
                // TODO: #1 revoke the prior access cards if the user has an unexpired card.
                const cardNo = await createTimedAccessCard()
                console.log('creating', cardNo)

                // Delete the timed access card after X minutes.
                let timeoutIn = 1000 * 60 * CARD_VALIDITY_IN_MINUTES
                setTimeout(async () => {
                    console.log('deleting', cardNo)

                    // await deleteTimedAccessCard(cardNo)
                }, timeoutIn)

                return { cardNo, expireAt: new Date(new Date().valueOf() + timeoutIn)  }
            })
    )
    .listen(3000)

console.log(
    `Garden gate is running at ${app.server?.hostname}:${app.server?.port}`
)
