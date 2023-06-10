import { Elysia, t, type Context } from 'elysia'
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

const cards: Map<string, CardInfo> = new Map()

const simulator = new Elysia()
    .group(
        '/ISAPI/AccessControl/CardInfo',
        {
            beforeHandle: digestAuth,
            query: t.Optional(
                t.Object({
                    format: t.Literal('json'),
                }),
            ),
            headers: t.Object({
                authorization: t.String(),
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
                    '/Search',
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
                                CardInfo: found,
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
                    '/Record',
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
                                CardInfo: { cardNo },
                            },
                        }) {
                            const cardNoRegex = /^[0-9a-zA-Z-]{1,20}$/
                            if (!cardNoRegex.test(cardNo)) {
                                return badRequest(
                                    `invalid cardNo (must match ${cardNoRegex})`,
                                )
                            }

                            if (cards.has(cardNo)) {
                                return new Response(
                                    `[simulator] cardNo ${cardNo} already exists`,
                                    { status: 409 },
                                )
                            }
                        },
                        body: t.Object({
                            CardInfo: t.Object({
                                employeeNo: t.String(),
                                cardNo: t.String(),
                                cardType: t.Literal('normalCard'),
                            }),
                        }),
                    },
                )
                .put(
                    '/Delete',
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
                ),
        // TODO: Implement POST /ISAPI/AccessControl/AcsEvent
    )
    .listen(3331)

export type Simuator = typeof simulator
