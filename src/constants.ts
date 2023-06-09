import fs from 'fs'
import {GateConfig} from './@types/GateConfig'

export const GATE_CONFIG = getGateConfig()

function getGateConfig(): GateConfig {
  // @todo #1 validate if the config file is present.
  const file = fs.readFileSync('./config.json', 'utf-8')

  // @todo #1 validate the configuration.
  const config: GateConfig = JSON.parse(file)

  return config
}
