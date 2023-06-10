export interface GateConfig {
    doors: DoorConfig[]
    allowedEmails: string[]
    allowedAudiences: string[]
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
