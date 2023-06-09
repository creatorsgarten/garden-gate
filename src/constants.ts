import fs from 'fs'
import {GateConfig} from './@types/GateConfig'

export const GATE_CONFIG = getGateConfig()

/** The card is only valid for X minutes, then it will be destroyed by a cronjob. */
export const CARD_DURATION_IN_MINUTES = 3

/** Length of the access card identifier. */
export const CARD_ID_LENGTH = 16

function getGateConfig(): GateConfig {
  // @todo #1 validate if the config file is present.
  const file = fs.readFileSync('./config.json', 'utf-8')

  // @todo #1 validate the configuration.
  const config: GateConfig = JSON.parse(file)

  return config
}
