import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge'
import type { GWMPlatform } from '../platform.js'

export class ChargingStatusAccessory {
  private service: Service

  constructor(
    private readonly platform: GWMPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)
      ?.setCharacteristic(this.platform.Characteristic.Manufacturer, 'GWM')
      .setCharacteristic(this.platform.Characteristic.Model, 'Charging Status')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.platform.config.vin as string,
      )

    this.service =
      this.accessory.getService(this.platform.Service.ContactSensor) ??
      this.accessory.addService(this.platform.Service.ContactSensor)

    this.service.setCharacteristic(this.platform.Characteristic.Name, 'Charging')

    this.service
      .getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getChargingStatus.bind(this))
  }

  private getChargingStatus(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const isCharging = status?.isCharging ?? false
    // CONTACT_DETECTED (0) = charging, CONTACT_NOT_DETECTED (1) = not charging
    return isCharging
      ? this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED
      : this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
  }
}
