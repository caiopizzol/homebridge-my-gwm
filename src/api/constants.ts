export const API_ENDPOINTS = {
  login:
    'https://br-front-service.gwmcloud.com/br-official-commerce/br-official-gateway/pc-api/api/v1.0/userAuth/loginAccount',
  vehicle: 'https://br-app-gateway.gwmcloud.com/app-api/api/v1.0',
} as const

export const API_HEADERS = {
  rs: '5',
  terminal: 'GW_PC_GWM',
  brand: '6',
  brandid: 'CCZ001',
  language: 'pt_BR',
  systemtype: '2',
  regioncode: 'LA',
  country: 'BR',
  appid: '6',
  devicetype: '0',
  enterpriseid: 'CC01',
} as const

export const SERVICE_CODES = {
  engine: '0x03',
  ac: '0x04',
  doors: '0x05',
  windows: '0x08',
  trunk: '0x09',
  charging: '0x01',
} as const

export const SENSOR_CODES = {
  doorLock: 2208001,
  trunkState: 2206001,
  batterySOC: 2013021,
  chargingStatus: 2013009,
  acStatus: 2122001,
} as const

export const COMMAND_TIMEOUT_MS = 60000
