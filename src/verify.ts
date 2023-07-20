import { GATE_CONFIG } from './constants.js'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const issuer = 'https://accounts.google.com'
const keySetUrl = new URL('https://www.googleapis.com/oauth2/v3/certs')
const keySet = createRemoteJWKSet(keySetUrl)
function validate(jwt: string) {
    return jwtVerify(jwt, keySet, {
        issuer,
        audience: GATE_CONFIG.allowedAudiences,
    })
}

class AuthorizationError extends Error {
    code = 401
    status = 'Unauthorized'
    constructor(message: string, cause?: unknown) {
        super(message + (cause ? `: ${cause}` : ''), { cause })
    }
}

export async function verifyRequestAuthenticity(
    authorization: string,
): Promise<void> {
    const match = authorization.match(/^Bearer (.+)$/)
    if (!match) throw new AuthorizationError('Invalid authorization header.')

    const [_, token] = match
    const result = await validate(token).catch((e) => {
        throw new AuthorizationError('Invalid authorization token.', e)
    })
    if (!result.payload.email_verified) {
        throw new AuthorizationError('Email address not verified.')
    }
    if (!GATE_CONFIG.allowedEmails.includes(result.payload.email as string)) {
        throw new AuthorizationError('Email address not in allowlist.')
    }
}
