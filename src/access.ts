import { edenTreaty } from '@elysiajs/eden'
import type { Simuator } from './simulator'
import { CARD_ID_LENGTH, GATE_CONFIG } from './constants'
import DigestClient from 'digest-fetch'
import { GateConfig } from './@types/GateConfig'
import { randomUUID } from 'crypto'
import ObjectID from 'bson-objectid'

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
export async function createTimedAccessCard() {
    const cardNo = createCardNumber()
    const cardId = ObjectID().toHexString()

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

    return {
        /**
         * The card number that is added to the door access system.
         * Use this to generate the QR code.
         */
        cardNo,

        /**
         * A unique ID for the card. May be exposed publicly.
         * This is used for tracking only and does not provide any access.
         */
        cardId,
    }
}

/** As the card is timed, we should schedule a cronjob to delete it within minutes. */
export async function deleteTimedAccessCard(cardNo: string) {
    try {
        return Promise.all(
            doors.map(async (door) => {
                const { ISAPI } = createDoorClient(door)

                const { data, error } =
                    await ISAPI.AccessControl.CardInfo.Delete.put({
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

                data
            }),
        )
    } catch (err) {}
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

export function createCardNumber() {
    const charSet =
        '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

    return (
        'grtn-' +
        Array.from(
            crypto.getRandomValues(new Uint8Array(CARD_ID_LENGTH)),
            (x) => charSet[x % charSet.length],
        ).join('')
    )
}
