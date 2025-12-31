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

    // Use HumiditySensor to display battery SoC as percentage
    // (Battery service alone is incompatible as standalone in HomeKit)
    this.service =
      this.accessory.getService(this.platform.Service.HumiditySensor) ??
      this.accessory.addService(this.platform.Service.HumiditySensor)

    this.service.setCharacteristic(this.platform.Characteristic.Name, 'Battery')

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getBatteryLevel.bind(this))
  }

  private getBatteryLevel(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const level = status?.batteryLevel ?? 0
    return Math.min(100, Math.max(0, level))
  }
}
