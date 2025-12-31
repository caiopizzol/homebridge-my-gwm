import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge'
import type { GWMPlatform } from '../platform.js'

export class BatteryAccessory {
  private service: Service

  constructor(
    private readonly platform: GWMPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)
      ?.setCharacteristic(this.platform.Characteristic.Manufacturer, 'GWM')
      .setCharacteristic(this.platform.Characteristic.Model, 'Vehicle Battery')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.platform.config.vin as string,
      )

    this.service =
      this.accessory.getService(this.platform.Service.Battery) ??
      this.accessory.addService(this.platform.Service.Battery)

    this.service.setCharacteristic(this.platform.Characteristic.Name, 'Battery')

    this.service
      .getCharacteristic(this.platform.Characteristic.BatteryLevel)
      .onGet(this.getBatteryLevel.bind(this))

    this.service
      .getCharacteristic(this.platform.Characteristic.ChargingState)
      .onGet(this.getChargingState.bind(this))

    this.service
      .getCharacteristic(this.platform.Characteristic.StatusLowBattery)
      .onGet(this.getLowBatteryStatus.bind(this))
  }

  private getBatteryLevel(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const level = status?.batteryLevel ?? 0

    this.platform.log.debug('Battery level:', level)

    return Math.min(100, Math.max(0, level))
  }

  private getChargingState(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const isCharging = status?.isCharging ?? false

    this.platform.log.debug('Charging state:', isCharging ? 'CHARGING' : 'NOT_CHARGING')

    return isCharging
      ? this.platform.Characteristic.ChargingState.CHARGING
      : this.platform.Characteristic.ChargingState.NOT_CHARGING
  }

  private getLowBatteryStatus(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const level = status?.batteryLevel ?? 0
    const isLow = level < 20

    this.platform.log.debug('Low battery:', isLow)

    return isLow
      ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
      : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL
  }
}
