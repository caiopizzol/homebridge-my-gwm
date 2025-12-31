import type {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge'
import { AirConditionerAccessory } from './accessories/airConditioner.js'
import { BatteryAccessory } from './accessories/battery.js'
import { DoorLockAccessory } from './accessories/doorLock.js'
import { TrunkAccessory } from './accessories/trunk.js'
import { GWMClient } from './api/gwmClient.js'
import type { GWMConfig, VehicleStatus } from './api/types.js'
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js'

export class GWMPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service
  public readonly Characteristic: typeof Characteristic

  public readonly accessories: Map<string, PlatformAccessory> = new Map()
  public client!: GWMClient
  private vehicleStatus: VehicleStatus | null = null

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service
    this.Characteristic = api.hap.Characteristic

    this.log.debug('Initializing GWM platform')

    this.api.on('didFinishLaunching', () => {
      this.discoverDevices()
    })
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName)
    this.accessories.set(accessory.UUID, accessory)
  }

  private getGWMConfig(): GWMConfig {
    return {
      username: this.config.username as string,
      password: this.config.password as string,
      vin: this.config.vin as string,
      pin: this.config.pin as string,
      refreshInterval: (this.config.refreshInterval as number) ?? 60,
      acTemperature: (this.config.acTemperature as number) ?? 22,
    }
  }

  getACTemperature(): number {
    return (this.config.acTemperature as number) ?? 22
  }

  getACDuration(): number {
    return (this.config.acDuration as number) ?? 15
  }

  async discoverDevices(): Promise<void> {
    const gwmConfig = this.getGWMConfig()

    if (!gwmConfig.username || !gwmConfig.password || !gwmConfig.vin || !gwmConfig.pin) {
      this.log.error(
        'Missing required configuration. Please configure username, password, VIN, and PIN.',
      )
      return
    }

    this.client = new GWMClient(gwmConfig, this.log, this.api.user.storagePath())

    const authenticated = await this.client.authenticate()
    if (!authenticated) {
      this.log.error('Failed to authenticate with GWM. Please check your credentials.')
      return
    }

    this.vehicleStatus = await this.client.getStatus()
    if (!this.vehicleStatus) {
      this.log.warn('Could not get initial vehicle status')
    }

    this.registerAccessories(gwmConfig.vin)
    this.startStatusPolling(gwmConfig.refreshInterval ?? 60)
  }

  private registerAccessories(vin: string): void {
    const accessoryInfos = [
      { id: 'door-lock', name: 'Door Lock', AccessoryClass: DoorLockAccessory },
      { id: 'trunk', name: 'Trunk', AccessoryClass: TrunkAccessory },
      { id: 'ac', name: 'Air Conditioner', AccessoryClass: AirConditionerAccessory },
      { id: 'battery', name: 'Battery', AccessoryClass: BatteryAccessory },
    ]

    for (const info of accessoryInfos) {
      const uuid = this.api.hap.uuid.generate(`${vin}-${info.id}`)
      const displayName = `GWM ${info.name}`

      let accessory = this.accessories.get(uuid)

      if (!accessory) {
        this.log.info('Adding new accessory:', displayName)
        accessory = new this.api.platformAccessory(displayName, uuid)
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
        this.accessories.set(uuid, accessory)
      }

      new info.AccessoryClass(this, accessory)
    }
  }

  private startStatusPolling(intervalSeconds: number): void {
    const interval = Math.max(30, intervalSeconds) * 1000

    setInterval(async () => {
      try {
        this.vehicleStatus = await this.client.getStatus()
        if (this.vehicleStatus) {
          this.log.debug('Status updated:', JSON.stringify(this.vehicleStatus))
        }
      } catch (err) {
        this.log.error('Status polling failed:', err)
      }
    }, interval)

    this.log.info(`Status polling started (every ${intervalSeconds}s)`)
  }

  getVehicleStatus(): VehicleStatus | null {
    return this.vehicleStatus ?? this.client?.getCachedStatus() ?? null
  }
}
