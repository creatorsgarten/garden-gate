import { Elysia, t } from 'elysia'
import { Database } from 'bun:sqlite'
import { CARD_VALIDITY_IN_MINUTES } from './constants'
import { verifyRequestAuthenticity } from './verify'
import {
    createCardNumber,
    createTimedAccessCard,
    deleteTimedAccessCard,
    getDoorStats,
} from './access'

const db = new Database('.data/gardengate.sqlite')

// Create a table for
db.query(
    `CREATE TABLE IF NOT EXISTS timed_access_cards (
        card_no TEXT PRIMARY KEY,
        access_id TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
    )`,
).run()

// TODO: #1 expose the server only to allowed hostnames for security
const app = new Elysia()
    .onError(({ error }) => {
        console.error(error)
        if (error.cause) {
            console.error(error.cause)
            if ((error.cause as any).cause) {
                console.error((error.cause as any).cause)
            }
        }
        throw error
    })
    .get('/', () => ({ status: 'Garden Gate is active.' }))
    .get('/stats-public', async () => {
        return { doors: await getDoorStats() }
    })
    .guard(
        {
            headers: t.Object({ authorization: t.String() }),
            // beforeHandle: (req) =>
            //   verifyRequestAuthenticity(req.headers.Authorization ?? ''),
        },
        (app) =>
            app.post(
                '/access/generate',
                async ({ body: { accessId } }) => {
                    const cardNo = createCardNumber()
                    const timeoutIn = 1000 * 60 * CARD_VALIDITY_IN_MINUTES
                    const createdAt = new Date()
                    const expiresAt = new Date(Date.now() + timeoutIn)

                    // We must first insert the card into the database before creating it in Hikvision.
                    // Otherwise, there may be a race condition in which a cleanup worker run between
                    // the database insertion and the Hikvision creation.
                    db.query(
                        `INSERT INTO timed_access_cards (
                            card_no,
                            access_id,
                            created_at,
                            expires_at
                        ) VALUES (
                            $cardNo,
                            $accessId,
                            $createdAt,
                            $expiresAt
                        )`,
                    ).all({
                        $cardNo: cardNo,
                        $accessId: accessId,
                        $createdAt: createdAt.toISOString(),
                        $expiresAt: expiresAt.toISOString(),
                    })

                    await createTimedAccessCard(cardNo)
                    console.log(`created: ${cardNo}`)

                    // Delete the timed access card after X minutes.
                    // TODO: Replace this code with a worker than runs every, say, 15 seconds.
                    //  In each iteration, the worker should do these:
                    //   1. Query the active cards from Hikvision.
                    //   2. For each active card:
                    //       1. Check if it exists in the database. If not, delete it from Hikvision.
                    //       2. If it exists in the database, check if it has expired. If so, delete it from Hikvision and the database.
                    setTimeout(async () => {
                        console.log('deleting', cardNo)

                        // await deleteTimedAccessCard(cardNo)
                    }, timeoutIn)

                    return {
                        accessKey: cardNo,
                        createdAt,
                        expiresAt,
                    }
                },
                {
                    body: t.Object({ accessId: t.String() }),
                },
            ),
    )
    .listen(3000)

console.log(
    `Garden gate is running at ${app.server?.hostname}:${app.server?.port}`,
)
