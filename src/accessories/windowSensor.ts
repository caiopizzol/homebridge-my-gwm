import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge'
import type { VehicleStatus } from '../api/types.js'
import type { GWMPlatform } from '../platform.js'

type WindowStatusKey =
  | 'windowFrontLeftClosed'
  | 'windowFrontRightClosed'
  | 'windowRearLeftClosed'
  | 'windowRearRightClosed'
  | 'sunroofClosed'

export class WindowSensorAccessory {
  private service: Service

  constructor(
    private readonly platform: GWMPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly statusKey: WindowStatusKey,
    private readonly displayName: string,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)
      ?.setCharacteristic(this.platform.Characteristic.Manufacturer, 'GWM')
      .setCharacteristic(this.platform.Characteristic.Model, 'Vehicle Window')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.platform.config.vin as string,
      )

    this.service =
      this.accessory.getService(this.platform.Service.ContactSensor) ??
      this.accessory.addService(this.platform.Service.ContactSensor)

    this.service.setCharacteristic(this.platform.Characteristic.Name, displayName)

    this.service
      .getCharacteristic(this.platform.Characteristic.ContactSensorState)
      .onGet(this.getContactState.bind(this))
  }

  private getContactState(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const isClosed = status?.[this.statusKey] ?? true

    // CONTACT_DETECTED = closed, CONTACT_NOT_DETECTED = open
    return isClosed
      ? this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED
      : this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
  }
}
