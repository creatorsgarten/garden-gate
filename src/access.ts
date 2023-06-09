import { edenTreaty } from '@elysiajs/eden'
import type { Simuator } from './simulator'
import { CARD_ID_LENGTH, GATE_CONFIG } from './constants'

const { doors } = GATE_CONFIG

class CardCreationError extends Error {
    message = 'Failed to create a timed access card.'
}

/** Create a timed access card. */
export async function createTimedAccessCard() {
    const cardNo = createCardNumber()

    try {
        const response = await doors.map(
            async ({ username, password, deviceIP }) => {
                const {
                    ISAPI: {
                        AccessControl: { CardInfo }
                    }
                } = edenTreaty<Simuator>(deviceIP)

                const { data, error } = await CardInfo.Record.post({
                    $query: {
                        format: 'json'
                    },
                    $fetch: {
                        headers: {
                            Authorization: `Digest admin ${password}`
                        }
                    },
                    CardInfo: {
                        employeeNo: username,
                        cardNo,
                        cardType: 'normalCard'
                    }
                })

                // Error need to be handle to unwrap null type from data (type guard)
                if (error) {
                    // ? status error can be map here
                    switch (error.status) {
                        default:
                            return
                    }
                }

                data

                // Above is equivalent to this but with type-safety
                // const res = await fetch(
                //     `http://${deviceIP}/ISAPI/AccessControl/CardInfo/Record?format=json`,
                //     {
                //         method: 'POST',
                //         body: JSON.stringify({
                //             CardInfo: {
                //                 employeeNo: username,
                //                 cardNo,
                //                 cardType: 'normalCard'
                //             }
                //         }),
                //         headers: { Authorization: `Digest admin ${password}` }
                //     }
                // )
            }
        )
    } catch (err) {
        throw new CardCreationError()
    }

    return cardNo
}

/** As the card is timed, we should schedule a cronjob to delete it within minutes. */
export async function deleteTimedAccessCard(cardNo: string) {
    try {
        await doors.map(async ({ deviceIP, password }) => {
            const {
                ISAPI: {
                    AccessControl: { CardInfo }
                }
            } = edenTreaty<Simuator>(deviceIP)

            const { data, error } = await CardInfo.Delete.put({
                $query: {
                    format: 'json'
                },
                CardInfoDelCond: {
                    CardNoList: [{ cardNo }]
                }
            })

            // Error need to be handle to unwrap null type from data (type guard)
            if (error) {
                // ? status error can be map here
                switch (error.status) {
                    default:
                        return
                }
            }

            data

            // Above is equivalent to this but with type-safety
            // const res = await fetch(
            //     `http://${door.deviceIP}/ISAPI/AccessControl/CardInfo/Delete?format=json`,
            //     {
            //         method: 'PUT',
            //         body: JSON.stringify({
            //             CardInfoDelCond: {
            //                 CardNoList: [{ cardNo }]
            //             }
            //         }),
            //         headers: { Authorization: `Digest admin ${door.password}` }
            //     }
            // )
        })
    } catch (err) {}
}

export function createCardNumber() {
    const charSet =
        '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

    return (
        'grtn-' +
        Array.from(
            crypto.getRandomValues(new Uint8Array(CARD_ID_LENGTH)),
            (x) => charSet[x % charSet.length]
        ).join('')
    )
}
