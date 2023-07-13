import { Elysia, t } from 'elysia'
import { Database } from 'bun:sqlite'
import fs from 'fs'
import { APP_VERSION, CARD_VALIDITY_IN_MINUTES } from './constants'
import { verifyRequestAuthenticity } from './verify'
import {
    createTimedAccessCard,
    deleteTimedAccessCard,
    getCards,
    getDoorStats,
    getLogs,
} from './access'
import { createCardNumber } from './createCardNumber'
import { GATE_CONFIG } from './constants'

const { doors } = GATE_CONFIG

if (!fs.existsSync('.data')) await fs.promises.mkdir('.data')
const db = new Database('.data/gardengate.sqlite')

// Create a table for timed_access_cards
db.query(
    `CREATE TABLE IF NOT EXISTS timed_access_cards (
        card_no TEXT PRIMARY KEY,
        access_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
    )`,
).run()

interface TimedAccessCard {
    card_no: string
    access_id: string
    user_id: string
    created_at: string
    expires_at: string
}

setInterval(async () => {
    await cleanup()
}, 15000) // 15 seconds

async function cleanup(log = false) {
    // Delete the timed access card when expired.
    //   1. Query the active cards, and logs from Hikvision.
    //   2. For each active card:
    //       1. Check if it exists in the database. If not, delete it from Hikvision.
    //       2. If it exists in the database, check if it has expired. If so, delete it from Hikvision and the database.
    //       3. If not expired and card has been used in any door, then it's safe to remove that card from Hikvision

    const [activeCards, doorLogs] = await Promise.all([getCards(), getLogs(3600)])
    for (const { door, card } of activeCards) {
        const timedCard = db
            .query(`SELECT * FROM timed_access_cards WHERE card_no = $cardNo`)
            .get({ $cardNo: card.cardNo }) as TimedAccessCard | null
        if (!timedCard) {
            console.log(
                `[cleanup] Unknown card "${card.cardNo}" found in door "${door.name}". Deleting.`,
            )
            await deleteTimedAccessCard(door, card.cardNo)
            continue
        }
        if (new Date() > new Date(timedCard.expires_at)) {
            console.log(
                `[cleanup] Card "${card.cardNo}" in door "${door.name}" has expired. Deleting.`,
            )
            await deleteTimedAccessCard(door, card.cardNo)
            db.query(
                `DELETE FROM timed_access_cards WHERE card_no = $cardNo`,
            ).run({ $cardNo: card.cardNo })
            continue
        }
        if (doorLogs.data.find(log => log.event.cardNo === card.cardNo && log.door.name === log.door.name)) {
            console.log(
                `[cleanup] Card "${card.cardNo}" has already been used at door "${door.name}". Deleting.`,
            )
            await deleteTimedAccessCard(door, card.cardNo)
            continue
        }
        if (log) {
            console.log(
                `[cleanup] Access "${timedCard.access_id}" in door "${door.name}" is still active.`,
            )
        }
    }
}

await cleanup(true)

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
            beforeHandle: async (req) => {
                await verifyRequestAuthenticity(req.headers.authorization ?? '')
            },
        },
        (app) =>
            app
                .post(
                    '/access/generate',
                    async ({ body: { accessId, prefix, userId } }) => {
                        const cardNo = createCardNumber(prefix)
                        const timeoutIn = 1000 * 60 * CARD_VALIDITY_IN_MINUTES
                        const createdAt = new Date()
                        const expiresAt = new Date(Date.now() + timeoutIn)

                        // Before generating a new one, we have to make sure to revoke any existing active card
                        // related to userId first before creating a new one.
                        const userCards = db
                            .query(`SELECT * FROM timed_access_cards WHERE user_id = $user_id`)
                            .all({ $user_id: userId }) as TimedAccessCard[]
                        
                        if (userCards.length > 0) {
                            console.log(
                                `[cleanup] Removing ${userCards.length} cards owned by user ${userId} before granting a new card`
                            )

                            for await (const card of userCards) {
                                await Promise.allSettled(doors.map(async door => {
                                    await deleteTimedAccessCard(door, card.card_no)
                                    db.query(
                                        `DELETE FROM timed_access_cards WHERE card_no = $cardNo`,
                                    ).run({ $cardNo: card.card_no })
                                }))
                            }
                        }

                        // We must first insert the card into the database before creating it in Hikvision.
                        // Otherwise, there may be a race condition in which a cleanup worker run between
                        // the database insertion and the Hikvision creation.
                        db.query(
                            `INSERT INTO timed_access_cards (
                            card_no,
                            access_id,
                            user_id,
                            created_at,
                            expires_at
                        ) VALUES (
                            $cardNo,
                            $accessId,
                            $userId,
                            $createdAt,
                            $expiresAt
                        )`,
                        ).all({
                            $cardNo: cardNo,
                            $accessId: accessId,
                            $userId: userId,
                            $createdAt: createdAt.toISOString(),
                            $expiresAt: expiresAt.toISOString(),
                        })

                        await createTimedAccessCard(cardNo)
                        console.log(`created: ${cardNo}`)

                        return {
                            accessKey: cardNo,
                            createdAt,
                            expiresAt,
                        }
                    },
                    {
                        body: t.Object({
                            accessId: t.String(),
                            userId: t.String(),
                            prefix: t.String({ pattern: '^[a-zA-Z]{0,10}$' }),
                        }),
                    },
                )
                .get(
                    '/access/log',
                    async ({ query }) => {
                        const timeLimitSeconds =
                            +query.timeLimitSeconds! || 3600
                        const logs = await getLogs(timeLimitSeconds)
                        return {
                            errors: logs.errors.map((e) => {
                                return { door: e.door.name, error: e.error }
                            }),
                            entries: logs.data.map((e) => {
                                return {
                                    door: e.door.name,
                                    accessKey: e.event.cardNo,
                                    usedAt: new Date(e.event.time).toJSON(),
                                }
                            }),
                        }
                    },
                    {
                        query: t.Object({
                            timeLimitSeconds: t.Optional(t.String()),
                        }),
                    },
                ),
    )
    .listen(+Bun.env.PORT! || 3310)

console.log(
    `Garden gate [${APP_VERSION}] is running at ${app.server?.hostname}:${app.server?.port}`,
)
