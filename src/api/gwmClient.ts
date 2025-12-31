import * as crypto from 'node:crypto'
import * as fs from 'node:fs'
import * as https from 'node:https'
import * as path from 'node:path'
import axios, { type AxiosInstance } from 'axios'
import type { Logger } from 'homebridge'
import md5 from 'md5'
import {
  API_ENDPOINTS,
  API_HEADERS,
  COMMAND_TIMEOUT_MS,
  SENSOR_CODES,
  SERVICE_CODES,
} from './constants.js'
import type {
  ACAction,
  AuthTokens,
  CommandResult,
  DoorAction,
  GWMConfig,
  LastCommand,
  TrunkAction,
  VehicleStatus,
  VehicleStatusResponse,
} from './types.js'

export class GWMClient {
  private readonly config: GWMConfig
  private readonly log: Logger
  private readonly storagePath: string
  private tokens: AuthTokens | null = null
  private deviceId: string
  private httpsAgent: https.Agent
  private lastCommand: LastCommand | null = null
  private cachedStatus: VehicleStatus | null = null

  constructor(config: GWMConfig, log: Logger, storagePath: string) {
    this.config = config
    this.log = log
    this.storagePath = storagePath
    this.deviceId = this.getOrCreateDeviceId()
    this.httpsAgent = this.createHttpsAgent()
    this.loadTokens()
  }

  private getOrCreateDeviceId(): string {
    const deviceIdPath = path.join(this.storagePath, 'gwm-device-id.txt')
    try {
      if (fs.existsSync(deviceIdPath)) {
        return fs.readFileSync(deviceIdPath, 'utf8').trim()
      }
    } catch {
      // File doesn't exist or can't be read
    }
    const newId = md5(crypto.randomUUID())
    try {
      fs.writeFileSync(deviceIdPath, newId)
    } catch (err) {
      this.log.warn('Could not save device ID:', err)
    }
    return newId
  }

  private createHttpsAgent(): https.Agent {
    const certsDir = path.join(__dirname, '..', '..', 'certs')
    try {
      const cert = fs.readFileSync(path.join(certsDir, 'gwm_general.cer'))
      const key = fs.readFileSync(path.join(certsDir, 'gwm_general.key'))
      const ca = fs.readFileSync(path.join(certsDir, 'gwm_root.cer'))

      return new https.Agent({
        cert,
        key,
        ca,
        rejectUnauthorized: false,
      })
    } catch (err) {
      this.log.warn('SSL certificates not found, using default agent:', err)
      return new https.Agent({ rejectUnauthorized: false })
    }
  }

  private getTokensPath(): string {
    return path.join(this.storagePath, 'gwm-tokens.json')
  }

  private loadTokens(): void {
    try {
      const data = fs.readFileSync(this.getTokensPath(), 'utf8')
      this.tokens = JSON.parse(data)
    } catch {
      this.tokens = null
    }
  }

  private saveTokens(): void {
    if (this.tokens) {
      try {
        fs.writeFileSync(this.getTokensPath(), JSON.stringify(this.tokens))
      } catch (err) {
        this.log.warn('Could not save tokens:', err)
      }
    }
  }

  private isTokenExpired(): boolean {
    if (!this.tokens) {
      return true
    }
    return Date.now() >= this.tokens.expiresAt - 60000 // 1 min buffer
  }

  private parseJwtExpiration(token: string): number {
    try {
      const payload = token.split('.')[1]
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString())
      return decoded.exp * 1000
    } catch {
      return Date.now() + 3600000 // Default 1 hour
    }
  }

  async authenticate(): Promise<boolean> {
    if (this.tokens && !this.isTokenExpired()) {
      return true
    }

    this.log.info('Authenticating with GWM...')

    try {
      const response = await axios.post(
        API_ENDPOINTS.login,
        {
          account: this.config.username,
          password: md5(this.config.password),
          deviceId: this.deviceId,
        },
        {
          headers: {
            ...API_HEADERS,
            'Content-Type': 'application/json',
          },
        },
      )

      if (response.data?.data?.accessToken) {
        this.tokens = {
          accessToken: response.data.data.accessToken,
          refreshToken: response.data.data.refreshToken,
          expiresAt: this.parseJwtExpiration(response.data.data.accessToken),
        }
        this.saveTokens()
        this.log.info('Authentication successful')
        return true
      }

      this.log.error('Authentication failed: No token received')
      return false
    } catch (err) {
      this.log.error('Authentication failed:', err)
      return false
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      ...API_HEADERS,
      'Content-Type': 'application/json',
      accessToken: this.tokens?.accessToken ?? '',
      refreshToken: this.tokens?.refreshToken ?? '',
    }
  }

  private createApiClient(): AxiosInstance {
    return axios.create({
      baseURL: API_ENDPOINTS.vehicle,
      headers: this.getAuthHeaders(),
      httpsAgent: this.httpsAgent,
    })
  }

  async getStatus(): Promise<VehicleStatus | null> {
    if (!(await this.authenticate())) {
      return null
    }

    try {
      const client = this.createApiClient()
      const response = await client.get<VehicleStatusResponse>(
        `/vehicle/getLastStatus?vin=${this.config.vin}&flag=true`,
      )

      if (!response.data?.data?.items) {
        this.log.warn('No status data received')
        return null
      }

      const items = response.data.data.items
      const findValue = (code: number): string | undefined => {
        return items.find((item) => item.code === code)?.value
      }

      this.cachedStatus = {
        doorLocked: findValue(SENSOR_CODES.doorLock) === '0',
        trunkClosed: findValue(SENSOR_CODES.trunkState) === '0',
        batteryLevel: Number.parseInt(findValue(SENSOR_CODES.batterySOC) ?? '0', 10),
        isCharging: findValue(SENSOR_CODES.chargingStatus) === '1',
        acOn: findValue(SENSOR_CODES.acStatus) === '1',
        latitude: response.data.data.latitude
          ? Number.parseFloat(response.data.data.latitude)
          : undefined,
        longitude: response.data.data.longitude
          ? Number.parseFloat(response.data.data.longitude)
          : undefined,
        lastUpdated: new Date(),
      }

      return this.cachedStatus
    } catch (err) {
      this.log.error('Failed to get vehicle status:', err)
      return this.cachedStatus
    }
  }

  getCachedStatus(): VehicleStatus | null {
    return this.cachedStatus
  }

  private canSendCommand(): boolean {
    if (!this.lastCommand) {
      return true
    }
    return Date.now() - this.lastCommand.timestamp >= COMMAND_TIMEOUT_MS
  }

  private async sendCommand(
    serviceCode: string,
    instructions: Record<string, unknown>,
  ): Promise<CommandResult> {
    if (!(await this.authenticate())) {
      return { result: false, message: 'Authentication failed' }
    }

    if (!this.canSendCommand()) {
      const waitTime = Math.ceil(
        (COMMAND_TIMEOUT_MS - (Date.now() - (this.lastCommand?.timestamp ?? 0))) / 1000,
      )
      return {
        result: false,
        message: `Please wait ${waitTime}s before sending another command`,
      }
    }

    const seqNo = `${crypto.randomUUID()}1234`

    try {
      const client = this.createApiClient()
      const response = await client.post('/vehicle/T5/sendCmd', {
        instructions: {
          [serviceCode]: instructions,
        },
        remoteType: 0,
        securityPassword: md5(this.config.pin),
        seqNo,
        type: 2,
        vin: this.config.vin,
      })

      this.lastCommand = { seqNo, timestamp: Date.now() }

      if (response.data?.result === true) {
        this.log.info('Command sent successfully')
        return { result: true, message: 'Command sent' }
      }

      return {
        result: false,
        message: response.data?.message ?? 'Unknown error',
        code: response.data?.code,
      }
    } catch (err) {
      this.log.error('Failed to send command:', err)
      return { result: false, message: 'Command failed' }
    }
  }

  async controlDoors(action: DoorAction): Promise<CommandResult> {
    this.log.info(`Controlling doors: ${action}`)
    return this.sendCommand(SERVICE_CODES.doors, {
      doorLock: {
        switchOrder: action === 'CLOSE' ? '2' : '1',
      },
    })
  }

  async controlTrunk(action: TrunkAction): Promise<CommandResult> {
    this.log.info(`Controlling trunk: ${action}`)
    return this.sendCommand(SERVICE_CODES.trunk, {
      trunk: {
        switchOrder: action === 'CLOSE' ? '2' : '1',
      },
    })
  }

  async controlAC(action: ACAction, temperature = 22): Promise<CommandResult> {
    this.log.info(`Controlling A/C: ${action}`)
    return this.sendCommand(SERVICE_CODES.ac, {
      airConditioner: {
        operationTime: '15',
        switchOrder: action === 'ON' ? '1' : '2',
        temperature: temperature.toString(),
      },
    })
  }
}
