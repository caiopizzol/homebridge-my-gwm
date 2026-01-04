import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge'
import type { GWMPlatform } from '../platform.js'

export class GasRangeAccessory {
  private service: Service

  constructor(
    private readonly platform: GWMPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)
      ?.setCharacteristic(this.platform.Characteristic.Manufacturer, 'GWM')
      .setCharacteristic(this.platform.Characteristic.Model, 'Gas Range')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.platform.config.vin as string,
      )

    this.service =
      this.accessory.getService(this.platform.Service.LightSensor) ??
      this.accessory.addService(this.platform.Service.LightSensor)

    this.service.setCharacteristic(this.platform.Characteristic.Name, 'Gas Range')

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(this.getGasRange.bind(this))
  }

  private getGasRange(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const range = status?.gasRange ?? 0
    // LightSensor min is 0.0001, max is 100000
    return Math.max(0.0001, Math.min(100000, range))
  }
}
