import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge'
import type { GWMPlatform } from '../platform.js'

export class ChargerConnectedAccessory {
  private service: Service

  constructor(
    private readonly platform: GWMPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)
      ?.setCharacteristic(this.platform.Characteristic.Manufacturer, 'GWM')
      .setCharacteristic(this.platform.Characteristic.Model, 'Charger Connection')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.platform.config.vin as string,
      )

    this.service =
      this.accessory.getService(this.platform.Service.ContactSensor) ??
      this.accessory.addService(this.platform.Service.ContactSensor)

    this.service.setCharacteristic(this.platform.Characteristic.Name, 'Charger')

    this.service
      .getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getChargerConnected.bind(this))
  }

  private getChargerConnected(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const isConnected = status?.chargerConnected ?? false
    // CONTACT_DETECTED (0) = connected, CONTACT_NOT_DETECTED (1) = disconnected
    return isConnected
      ? this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED
      : this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
  }
}
