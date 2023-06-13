import { edenTreaty } from '@elysiajs/eden'
import type { Simuator } from './simulator'
import { GATE_CONFIG } from './constants'
import DigestClient from 'digest-fetch'
import { GateConfig } from './@types/GateConfig'

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

    return edenTreaty<Simuator>(door.host, {
        fetcher: client.fetch.bind(client) as any,
    })
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

            return (data?.CardInfoSearch?.CardInfo || []).map((card) => ({
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
                count: data.CardInfoSearch.CardInfo.length,
            }
        }),
    )
}
