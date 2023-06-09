import jwt from 'jwt-promisify'

import {AccessRequest} from './@types/AccessRequest'
import {GATE_CONFIG} from './constants'

const PUBLIC_KEY = GATE_CONFIG.publicKey

class AuthorizationError extends Error {
  code = 401
  status = 'Unauthorized'
}

export async function verifyRequestAuthenticity(
  authorization: string
): Promise<boolean> {
  const match = authorization.match(/Bearer (.*)/)
  if (!match) throw new AuthorizationError('Invalid authorization header.')

  const [_, token] = match

  try {
    await jwt.verify(token, PUBLIC_KEY)
  } catch (err) {
    throw new AuthorizationError('Invalid request token.')
  }

  return true
}
