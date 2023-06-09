import fetch from 'node-fetch'

import {CARD_ID_LENGTH, GATE_CONFIG} from './constants'

const doors = GATE_CONFIG.doors

class CardCreationError extends Error {
  message = 'Failed to create a timed access card.'
}

/** Create a timed access card. */
export async function createTimedAccessCard() {
  const cardNo = createCardNumber()

  try {
    await doors.map(async (door) => {
      // @todo #1 create a timed access card in the HikVision database.
      const res = await fetch(
        `http://${door.deviceIP}/ISAPI/AccessControl/CardInfo/Record?format=json`,
        {
          method: 'POST',
          body: JSON.stringify({
            CardInfo: {
              employeeNo: door.username,
              cardNo,
              cardType: 'normalCard',
            },
          }),
          headers: {Authorization: `Digest admin ${door.password}`},
        }
      )
    })
  } catch (err) {
    throw new CardCreationError()
  }

  return cardNo
}

/** As the card is timed, we should schedule a cronjob to delete it within minutes. */
export async function deleteTimedAccessCard(cardNo: string) {
  try {
    await doors.map(async (door) => {
      const res = await fetch(
        `http://${door.deviceIP}/ISAPI/AccessControl/CardInfo/Delete?format=json`,
        {
          method: 'PUT',
          body: JSON.stringify({
            CardInfoDelCond: {
              CardNoList: [{cardNo}],
            },
          }),
          headers: {Authorization: `Digest admin ${door.password}`},
        }
      )
    })
  } catch (err) {}
}

export function createCardNumber() {
  const charSet =
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

  return (
    'garten-' +
    Array.from(
      crypto.getRandomValues(new Uint8Array(CARD_ID_LENGTH)),
      (x) => charSet[x % charSet.length]
    ).join('')
  )
}
