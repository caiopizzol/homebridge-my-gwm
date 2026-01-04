import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge'
import type { GWMPlatform } from '../platform.js'

export type TirePosition = 'frontLeft' | 'frontRight' | 'rearLeft' | 'rearRight'

const TIRE_NAMES: Record<TirePosition, string> = {
  frontLeft: 'Front Left',
  frontRight: 'Front Right',
  rearLeft: 'Rear Left',
  rearRight: 'Rear Right',
}

export class TirePressureAccessory {
  private service: Service

  constructor(
    private readonly platform: GWMPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly position: TirePosition,
  ) {
    const tireName = TIRE_NAMES[position]

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)
      ?.setCharacteristic(this.platform.Characteristic.Manufacturer, 'GWM')
      .setCharacteristic(this.platform.Characteristic.Model, `${tireName} Tire Pressure`)
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.platform.config.vin as string,
      )

    this.service =
      this.accessory.getService(this.platform.Service.LightSensor) ??
      this.accessory.addService(this.platform.Service.LightSensor)

    this.service.setCharacteristic(this.platform.Characteristic.Name, `${tireName} Tire Pressure`)

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onGet(this.getTirePressure.bind(this))
  }

  private getTirePressure(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const pressure = status?.tirePressures?.[this.position] ?? 0
    // LightSensor min is 0.0001, max is 100000
    return Math.max(0.0001, Math.min(100000, pressure))
  }
}
