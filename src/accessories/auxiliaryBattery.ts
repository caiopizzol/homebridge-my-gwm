import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge'
import type { GWMPlatform } from '../platform.js'

export class AuxiliaryBatteryAccessory {
  private service: Service

  constructor(
    private readonly platform: GWMPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)
      ?.setCharacteristic(this.platform.Characteristic.Manufacturer, 'GWM')
      .setCharacteristic(this.platform.Characteristic.Model, '12V Battery')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.platform.config.vin as string,
      )

    this.service =
      this.accessory.getService(this.platform.Service.HumiditySensor) ??
      this.accessory.addService(this.platform.Service.HumiditySensor)

    this.service.setCharacteristic(this.platform.Characteristic.Name, '12V Battery')

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getAuxiliaryBattery.bind(this))
  }

  private getAuxiliaryBattery(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const level = status?.auxiliaryBattery ?? 0
    return Math.min(100, Math.max(0, level))
  }
}
