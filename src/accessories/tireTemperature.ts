import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge'
import type { GWMPlatform } from '../platform.js'

export type TirePosition = 'frontLeft' | 'frontRight' | 'rearLeft' | 'rearRight'

const TIRE_NAMES: Record<TirePosition, string> = {
  frontLeft: 'Front Left',
  frontRight: 'Front Right',
  rearLeft: 'Rear Left',
  rearRight: 'Rear Right',
}

export class TireTemperatureAccessory {
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
      .setCharacteristic(this.platform.Characteristic.Model, `${tireName} Tire Temperature`)
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.platform.config.vin as string,
      )

    this.service =
      this.accessory.getService(this.platform.Service.TemperatureSensor) ??
      this.accessory.addService(this.platform.Service.TemperatureSensor)

    this.service.setCharacteristic(this.platform.Characteristic.Name, `${tireName} Tire Temp`)

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getTireTemperature.bind(this))
  }

  private getTireTemperature(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const temp = status?.tireTemperatures?.[this.position] ?? 0
    // TemperatureSensor range is -270 to 100 by default
    return Math.max(-270, Math.min(100, temp))
  }
}
