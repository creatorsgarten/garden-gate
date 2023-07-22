import './elysia-polyfills'
import { Elysia, t, type Context } from 'elysia'
import { staticPlugin } from '@elysiajs/static'
import {
    DIGEST,
    parseAuthorizationHeader,
    buildWWWAuthenticateHeader,
} from 'http-auth-utils'

/*
To run the simulator, run the following command:

bun run src/simulator.ts

To test with the simulator, use the following environment variables:

HIKVISION_IP=127.0.0.1:3331
HIKVISION_EMPLOYEE_NO=500033
HIKVISION_ADMIN_PASSWORD=simulatorPassword
*/

function digestAuth({ headers, request: { method } }: Context<any>) {
    const realm = 'DS-SIMULATOR'
    const qop = 'auth'
    const { authorization } = headers
    if (!authorization) {
        return unauthorized('authorize please')
    }

    const result = parseAuthorizationHeader(authorization, [DIGEST])
    const hash = DIGEST.computeHash({
        algorithm: 'md5',
        qop,
        realm,
        username: result.data.username,
        password: 'simulatorPassword',
        uri: result.data.uri,
        nonce: result.data.nonce,
        nc: result.data.nc || '',
        method: method.toUpperCase(),
        cnonce: result.data.cnonce || '',
    })
    if (hash !== result.data.response) {
        return unauthorized('invalid digest hash')
    }

    function unauthorized(message: string) {
        return new Response(`[simulator / auth] ${message}`, {
            status: 401,
            headers: {
                'WWW-Authenticate': buildWWWAuthenticateHeader(DIGEST, {
                    realm,
                    qop,
                    nonce: '1234567890',
                    opaque: '0987654321',
                }),
            },
        })
    }
}

function badRequest(message: string): any {
    return new Response(`[simulator: bad request] ${message}`, {
        status: 400,
    })
}

interface CardInfo {
    employeeNo: string
    cardNo: string
    leaderCard: string
    cardType: string
}

interface LogEvent {
    major: 5
    minor: 1
    time: string
    cardNo: string
    cardType: 1
    name: string
    cardReaderNo: 1
    doorNo: 1
    employeeNoString: string
    type: 0
    serialNo: number
    userType: 'normal'
    currentVerifyMode: 'cardOrFaceOrFp'
}

const cards: Map<string, CardInfo> = new Map()
const log: LogEvent[] = []

const simulator = new Elysia()
    .get('/', async () => {
        return new Response(
            [
                'This is a simulator for a Hikvision door access terminal.',
                '',
                'Access the UI at /ui/index.html',
                '',
                'Currently registered cards:',
                ...Array.from(cards.values()).map((card) =>
                    JSON.stringify(card),
                ),
                '',
                'To attempt to access a door, send a POST request to /simulator/access with {"cardNo": "..."}',
                '',
                'Logs:',
                ...log.map((event) => JSON.stringify(event)),
            ].join('\n'),
            {
                headers: {
                    'content-type': 'text/plain',
                },
            },
        )
    })
    .post(
        '/simulator/access',
        async ({ body: { cardNo } }) => {
            const card = cards.get(cardNo)
            if (!card) return { ok: false, message: 'Card not found' }
            log.push({
                major: 5,
                minor: 1,
                time: new Date(Date.now() + 7 * 3600e3)
                    .toISOString()
                    .replace(/\.\d+Z$/, '+07:00'),
                cardNo: card.cardNo,
                cardType: 1,
                name: 'Creatorgarten',
                cardReaderNo: 1,
                doorNo: 1,
                employeeNoString: card.employeeNo,
                type: 0,
                serialNo: 50000 + log.length,
                userType: 'normal',
                currentVerifyMode: 'cardOrFaceOrFp',
            })
            if (log.length > 1000) {
                log.shift()
            }
            return { ok: true }
        },
        {
            body: t.Object({
                cardNo: t.String(),
            }),
        },
    )
    .get('/simulator/cards', async () => {
        return Array.from(cards.values())
    })
    .get('/simulator/log', async () => {
        return log
    })
    .group(
        '/ISAPI',
        {
            beforeHandle: digestAuth,
            query: t.Optional(
                t.Object({
                    format: t.Literal('json'),
                }),
            ),
            headers: t.Object({
                authorization: t.Optional(t.String()),
            }),
        },
        (app) =>
            app
                .model(
                    '418',
                    t.Object({
                        something: t.String(),
                    }),
                )
                .post(
                    '/AccessControl/CardInfo/Search',
                    ({
                        body: {
                            CardInfoSearchCond: { EmployeeNoList, searchID },
                        },
                    }) => {
                        const found = Array.from(cards.values()).filter(
                            (card) =>
                                EmployeeNoList.some(
                                    (employee) =>
                                        employee.employeeNo === card.employeeNo,
                                ),
                        )

                        console.log(`[Search] Found ${found.length} cards`)

                        return {
                            CardInfoSearch: {
                                searchID,
                                responseStatusStrg: 'OK',
                                numOfMatches: found.length,
                                totalMatches: found.length,
                                CardInfo: undefinedIfEmpty(found),
                            },
                        }
                    },
                    {
                        body: t.Object({
                            CardInfoSearchCond: t.Object({
                                searchID: t.String(),
                                maxResults: t.Number(),
                                searchResultPosition: t.Number(),
                                EmployeeNoList: t.Array(
                                    t.Object({
                                        employeeNo: t.String(),
                                    }),
                                ),
                            }),
                        }),
                    },
                )
                .post(
                    '/AccessControl/CardInfo/Record',
                    ({
                        body: {
                            CardInfo,
                            CardInfo: { cardNo, employeeNo },
                        },
                    }) => {
                        cards.set(cardNo, {
                            // This is strictly typed, shape must be exact
                            // no problem with rest params
                            ...CardInfo,
                            leaderCard: '',
                        })
                        console.log(
                            `[Record] Added card ${cardNo} for employee ${employeeNo}`,
                        )
                        return {
                            statusCode: 1,
                            statusString: 'OK',
                            subStatusCode: 'ok',
                        }
                    },
                    {
                        // This is separate here because it's a validation logic
                        // Business logic is put in the main handler
                        beforeHandle({
                            body: {
                                CardInfo: { cardNo, employeeNo },
                            },
                        }) {
                            if (cards.has(cardNo)) {
                                return new Response(
                                    `[simulator] cardNo ${cardNo} already exists`,
                                    { status: 409 },
                                )
                            }
                        },
                        body: t.Object({
                            CardInfo: t.Object({
                                employeeNo: t.String({
                                    pattern: '^[0-9]{1,12}$',
                                }),
                                cardNo: t.String({
                                    pattern: '^[0-9a-zA-Z-]{1,20}$',
                                }),
                                cardType: t.Literal('normalCard'),
                            }),
                        }),
                    },
                )
                .put(
                    '/AccessControl/CardInfo/Delete',
                    ({
                        body: {
                            CardInfoDelCond: { CardNoList },
                        },
                    }) => {
                        for (const cardNo of CardNoList) {
                            if (!cards.has(cardNo.cardNo)) {
                                console.log(
                                    `[Delete] Card ${cardNo.cardNo} not found`,
                                )
                                continue
                            }
                            cards.delete(cardNo.cardNo)
                            console.log(
                                `[Delete] Deleted card ${cardNo.cardNo}`,
                            )
                        }

                        return {
                            statusCode: 1,
                            statusString: 'OK',
                            subStatusCode: 'ok',
                        }
                    },
                    {
                        body: t.Object({
                            CardInfoDelCond: t.Object({
                                CardNoList: t.Array(
                                    t.Object({
                                        cardNo: t.String(),
                                    }),
                                ),
                            }),
                        }),
                    },
                )
                // POST /ISAPI/AccessControl/AcsEvent
                .post(
                    '/AccessControl/AcsEvent',
                    ({ body }) => {
                        const matched = log.filter(
                            (entry) =>
                                entry.time >= body.AcsEventCond.startTime &&
                                entry.time <= body.AcsEventCond.endTime &&
                                body.AcsEventCond.employeeNoString ===
                                    entry.employeeNoString,
                        )
                        return {
                            AcsEvent: {
                                searchID: body.AcsEventCond.searchID,
                                totalMatches: matched.length,
                                responseStatusStrg: 'OK',
                                numOfMatches: matched.length,
                                InfoList: undefinedIfEmpty(matched),
                            },
                        }
                    },
                    {
                        body: t.Object({
                            AcsEventCond: t.Object({
                                searchID: t.String({
                                    pattern:
                                        '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
                                }),
                                searchResultPosition: t.Number(),
                                maxResults: t.Number(),
                                major: t.Literal(0),
                                minor: t.Number(),
                                startTime: t.String({
                                    pattern:
                                        '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\+07:00$',
                                }),
                                endTime: t.String({
                                    pattern:
                                        '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\+07:00$',
                                }),
                                employeeNoString: t.String({
                                    pattern: '^[0-9]{1,12}$',
                                }),
                            }),
                        }),
                    },
                ),
    )
    .use(staticPlugin({ assets: 'src/simulator-ui', prefix: '/ui' }))
    .listen(+process.env.PORT || 3331)

function undefinedIfEmpty<T>(array: T[]): T[] | undefined {
    return array.length === 0 ? undefined : array
}

export type Simulator = typeof simulator

console.log(
    `Simulator for a Hikvision door access terminal is running at ${simulator.server?.hostname}:${simulator.server?.port}`,
)
