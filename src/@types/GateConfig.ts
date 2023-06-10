import { JWK } from 'jose'

export interface GateConfig {
    doors: DoorConfig[]

    /** The public key to verify the authorization token's content. */
    publicKey: JWK
}

/**
 * Door configuration for the HikVision hardware.
 * Stored on-device on the Raspberry Pi.
 **/
export interface DoorConfig {
    name: string
    host: string
    username: string
    password: string
    employeeNo: string
}
