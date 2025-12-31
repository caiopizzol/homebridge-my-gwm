export interface GWMConfig {
  username: string
  password: string
  vin: string
  pin: string
  refreshInterval?: number
  acTemperature?: number
  acDuration?: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface SensorData {
  code: number
  value: string
}

export interface VehicleStatusResponse {
  code?: string
  message?: string
  data: {
    items: SensorData[]
    latitude?: string
    longitude?: string
    hyEngSts?: string
  }
}

export interface VehicleStatus {
  doorLocked: boolean
  trunkClosed: boolean
  batteryLevel: number
  isCharging: boolean
  acOn: boolean
  latitude?: number
  longitude?: number
  lastUpdated: Date
}

export interface CommandResult {
  result: boolean
  message?: string
  code?: string
  description?: string
}

export interface LastCommand {
  seqNo: string
  timestamp: number
}

export type DoorAction = 'OPEN' | 'CLOSE'
export type TrunkAction = 'OPEN' | 'CLOSE'
export type ACAction = 'ON' | 'OFF'
