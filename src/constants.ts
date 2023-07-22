import fs from 'fs'
import { GateConfig } from './@types/GateConfig.js'

export const GATE_CONFIG = getGateConfig()

export const APP_VERSION = process.env.APP_VERSION ?? 'undefined'

/** The card is only valid for X minutes, then it will be destroyed by a cronjob. */
export const CARD_VALIDITY_IN_MINUTES = 3

function getGateConfig(): GateConfig {
    // TODO: #1 validate if the config file is present.
    const file = fs.readFileSync(process.env.GARDEN_GATE_CONFIG_PATH || './config.json', 'utf-8')

    // TODO: #1 validate the gate configuration.
    const config: GateConfig = JSON.parse(file)

    return config
}
