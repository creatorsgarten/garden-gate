import { edenTreaty } from '@elysiajs/eden'
import DigestClient from 'digest-fetch'

import { GATE_CONFIG } from './constants.js'
import { GateConfig } from './@types/GateConfig.js'
import type { Simuator } from './simulator.js'

type Door = GateConfig['doors'][number]

const { doors } = GATE_CONFIG

class CardCreationError extends Error {
    constructor(cause: unknown) {
        super('Failed to create a timed access card.', { cause })
        this.name = 'CardCreationError'
    }
}

function createDoorClient(door: GateConfig['doors'][number]) {
    const client = new DigestClient(door.username, door.password)
    const treaty = edenTreaty<Simuator>(door.host, {
        fetcher: client.fetch.bind(client) as any,
    })
    return treaty
}

/** Create a timed access card. */
export async function createTimedAccessCard(cardNo: string) {
    try {
        const responses = await Promise.all(
            doors.map(async (door) => {
                const { ISAPI } = createDoorClient(door)

                const { data, error } =
                    await ISAPI.AccessControl.CardInfo.Record.post({
                        $query: {
                            format: 'json',
                        },
                        $fetch: {},
                        CardInfo: {
                            employeeNo: door.employeeNo,
                            cardNo,
                            cardType: 'normalCard',
                        },
                    })

                // Error need to be handle to unwrap null type from data (type guard)
                if (error) {
                    throw new Error(
                        `Unable to create card with the door "${door.name}" with error ${error.status} ${error.value}`,
                        { cause: error },
                    )
                }

                data
            }),
        )
    } catch (err) {
        throw new CardCreationError(err)
    }
}

/** As the card is timed, we should schedule a cronjob to delete it within minutes. */
export async function deleteTimedAccessCard(door: Door, cardNo: string) {
    const { ISAPI } = createDoorClient(door)

    const { error } = await ISAPI.AccessControl.CardInfo.Delete.put({
        $query: {
            format: 'json',
        },
        CardInfoDelCond: {
            CardNoList: [{ cardNo }],
        },
    })

    // Error need to be handle to unwrap null type from data (type guard)
    if (error) {
        throw new Error(
            `Unable to delete card with the door "${door.name}" with error ${error.status} ${error.value}`,
            { cause: error },
        )
    }
}

export async function getCards() {
    return Promise.all(
        doors.map(async (door) => {
            const { ISAPI } = createDoorClient(door)

            const { data, error } =
                await ISAPI.AccessControl.CardInfo.Search.post({
                    $query: {
                        format: 'json',
                    },
                    CardInfoSearchCond: {
                        maxResults: 2000,
                        searchID: crypto.randomUUID(),
                        searchResultPosition: 0,
                        EmployeeNoList: [{ employeeNo: door.employeeNo }],
                    },
                })

            if (error) {
                throw error
            }

            return (data.CardInfoSearch.CardInfo || []).map((card) => ({
                door,
                card,
            }))
        }),
    ).then((a) => a.flat())
}

export async function getDoorStats() {
    return Promise.all(
        doors.map(async (door) => {
            const { ISAPI } = createDoorClient(door)

            const { data, error } =
                await ISAPI.AccessControl.CardInfo.Search.post({
                    $query: {
                        format: 'json',
                    },
                    CardInfoSearchCond: {
                        maxResults: 2000,
                        searchID: crypto.randomUUID(),
                        searchResultPosition: 0,
                        EmployeeNoList: [{ employeeNo: door.employeeNo }],
                    },
                })

            if (error) {
                return { name: door.name, error: error.status }
            }

            return {
                name: door.name,
                count: (data.CardInfoSearch.CardInfo || []).length,
            }
        }),
    )
}

function formatTimeAsiaBangkok(time = Date.now()) {
    return new Date(time + 7 * 3600e3)
        .toISOString()
        .replace(/\.\d+Z$/, '+07:00')
}

export async function getLogs(timeLimitSeconds: number) {
    const perDoor = await Promise.all(
        doors.map(async (door) => {
            const { ISAPI } = createDoorClient(door)
            const { data, error } = await ISAPI.AccessControl.AcsEvent.post({
                $query: {
                    format: 'json',
                },
                AcsEventCond: {
                    searchID: crypto.randomUUID(),
                    searchResultPosition: 0,
                    maxResults: 2000,
                    major: 0,
                    minor: 0,
                    startTime: formatTimeAsiaBangkok(
                        Date.now() - timeLimitSeconds * 1e3,
                    ),
                    endTime: formatTimeAsiaBangkok(Date.now() + 600e3),
                    employeeNoString: door.employeeNo,
                },
            })
            if (error) {
                return { door, error }
            }
            return { door, data }
        }),
    )
    const data = perDoor.flatMap(({ door, data }) => {
        if (!data) return []
        return (data.AcsEvent.InfoList || []).map((event) => {
            return { door, event }
        })
    })
    const errors = perDoor.flatMap(({ door, error }) => {
        if (!error) return []
        return { door, error }
    })
    return { data, errors }
}
