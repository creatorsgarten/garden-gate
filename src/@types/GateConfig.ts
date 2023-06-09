export interface GateConfig {
  doors: DoorConfig[]

  /** The public key to verify the authorization token's content. */
  publicKey: string
}

/**
 * Door configuration for the HikVision hardware.
 * Stored on-device on the Raspberry Pi.
 **/
export interface DoorConfig {
  name: string
  deviceIP: string
  username: string
  password: string
}
