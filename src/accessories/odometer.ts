import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge'
import type { GWMPlatform } from '../platform.js'

export class OdometerAccessory {
  private service: Service

  constructor(
    private readonly platform: GWMPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)
      ?.setCharacteristic(this.platform.Characteristic.Manufacturer, 'GWM')
      .setCharacteristic(this.platform.Characteristic.Model, 'Odometer')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.platform.config.vin as string,
      )

    this.service =
      this.accessory.getService(this.platform.Service.LightSensor) ??
      this.accessory.addService(this.platform.Service.LightSensor)

    this.service.setCharacteristic(this.platform.Characteristic.Name, 'Odometer')

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(this.getOdometer.bind(this))
  }

  private getOdometer(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const km = status?.odometer ?? 0
    // LightSensor min is 0.0001, max is 100000
    return Math.max(0.0001, Math.min(100000, km))
  }
}
