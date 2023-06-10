import fs from 'fs'
import { GateConfig } from './@types/GateConfig'

export const GATE_CONFIG = getGateConfig()

/** The card is only valid for X minutes, then it will be destroyed by a cronjob. */
export const CARD_VALIDITY_IN_MINUTES = 3

/** Length of the access card identifier. Must not exceed 15. */
export const CARD_ID_LENGTH = 15

function getGateConfig(): GateConfig {
    // TODO: #1 validate if the config file is present.
    const file = fs.readFileSync('./config.json', 'utf-8')

    // TODO: #1 validate the gate configuration.
    const config: GateConfig = JSON.parse(file)

    return config
}
