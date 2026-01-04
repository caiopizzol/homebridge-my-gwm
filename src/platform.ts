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
import { AuxiliaryBatteryAccessory } from './accessories/auxiliaryBattery.js'
import { BatteryAccessory } from './accessories/battery.js'
import { ChargerConnectedAccessory } from './accessories/chargerConnected.js'
import { ChargingStatusAccessory } from './accessories/chargingStatus.js'
import { DoorLockAccessory } from './accessories/doorLock.js'
import { EVRangeAccessory } from './accessories/evRange.js'
import { GasRangeAccessory } from './accessories/gasRange.js'
import { OdometerAccessory } from './accessories/odometer.js'
import { type TirePosition, TirePressureAccessory } from './accessories/tirePressure.js'
import { TireTemperatureAccessory } from './accessories/tireTemperature.js'
import { TrunkAccessory } from './accessories/trunk.js'
import { WindowSensorAccessory } from './accessories/windowSensor.js'
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
      { id: 'ev-range', name: 'EV Range', AccessoryClass: EVRangeAccessory },
      { id: 'gas-range', name: 'Gas Range', AccessoryClass: GasRangeAccessory },
      { id: 'aux-battery', name: '12V Battery', AccessoryClass: AuxiliaryBatteryAccessory },
      { id: 'odometer', name: 'Odometer', AccessoryClass: OdometerAccessory },
      { id: 'charging-status', name: 'Charging', AccessoryClass: ChargingStatusAccessory },
      { id: 'charger-connected', name: 'Charger', AccessoryClass: ChargerConnectedAccessory },
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

    // Window and sunroof sensors
    const windowSensors = [
      { id: 'window-fl', name: 'Front Left Window', key: 'windowFrontLeftClosed' as const },
      { id: 'window-fr', name: 'Front Right Window', key: 'windowFrontRightClosed' as const },
      { id: 'window-rl', name: 'Rear Left Window', key: 'windowRearLeftClosed' as const },
      { id: 'window-rr', name: 'Rear Right Window', key: 'windowRearRightClosed' as const },
      { id: 'sunroof', name: 'Sunroof', key: 'sunroofClosed' as const },
    ]

    for (const sensor of windowSensors) {
      const uuid = this.api.hap.uuid.generate(`${vin}-${sensor.id}`)
      const displayName = `GWM ${sensor.name}`

      let accessory = this.accessories.get(uuid)

      if (!accessory) {
        this.log.info('Adding new accessory:', displayName)
        accessory = new this.api.platformAccessory(displayName, uuid)
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
        this.accessories.set(uuid, accessory)
      }

      new WindowSensorAccessory(this, accessory, sensor.key, sensor.name)
    }

    // Tire pressure sensors
    const tirePositions: TirePosition[] = ['frontLeft', 'frontRight', 'rearLeft', 'rearRight']
    const tireNames: Record<TirePosition, string> = {
      frontLeft: 'Front Left',
      frontRight: 'Front Right',
      rearLeft: 'Rear Left',
      rearRight: 'Rear Right',
    }

    for (const position of tirePositions) {
      // Tire pressure
      const pressureUuid = this.api.hap.uuid.generate(`${vin}-tire-pressure-${position}`)
      const pressureName = `GWM ${tireNames[position]} Tire Pressure`

      let pressureAccessory = this.accessories.get(pressureUuid)
      if (!pressureAccessory) {
        this.log.info('Adding new accessory:', pressureName)
        pressureAccessory = new this.api.platformAccessory(pressureName, pressureUuid)
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [pressureAccessory])
        this.accessories.set(pressureUuid, pressureAccessory)
      }
      new TirePressureAccessory(this, pressureAccessory, position)

      // Tire temperature
      const tempUuid = this.api.hap.uuid.generate(`${vin}-tire-temp-${position}`)
      const tempName = `GWM ${tireNames[position]} Tire Temp`

      let tempAccessory = this.accessories.get(tempUuid)
      if (!tempAccessory) {
        this.log.info('Adding new accessory:', tempName)
        tempAccessory = new this.api.platformAccessory(tempName, tempUuid)
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [tempAccessory])
        this.accessories.set(tempUuid, tempAccessory)
      }
      new TireTemperatureAccessory(this, tempAccessory, position)
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
