export const API_ENDPOINTS = {
  login:
    'https://br-front-service.gwmcloud.com/br-official-commerce/br-official-gateway/pc-api/api/v1.0/userAuth/loginAccount',
  vehicle: 'https://br-app-gateway.gwmcloud.com/app-api/api/v1.0',
} as const

export const LOGIN_HEADERS = {
  appid: '6',
  brand: '6',
  brandid: 'CCZ001',
  country: 'BR',
  devicetype: '0',
  enterpriseid: 'CC01',
  gwid: '',
  language: 'pt_BR',
  rs: '5',
  terminal: 'GW_PC_GWM',
} as const

export const VEHICLE_HEADERS = {
  brand: '6',
  country: 'BR',
  language: 'pt_BR',
  regioncode: 'BR',
  rs: '2',
  systemtype: '2',
  terminal: 'GW_APP_GWM',
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
  chargingStatus: 2041142,
  acStatus: 2202001,
} as const

export const COMMAND_TIMEOUT_MS = 60000
