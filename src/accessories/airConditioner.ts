import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge'
import type { GWMPlatform } from '../platform.js'

export class AirConditionerAccessory {
  private service: Service

  constructor(
    private readonly platform: GWMPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)
      ?.setCharacteristic(this.platform.Characteristic.Manufacturer, 'GWM')
      .setCharacteristic(this.platform.Characteristic.Model, 'Vehicle A/C')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.platform.config.vin as string,
      )

    this.service =
      this.accessory.getService(this.platform.Service.Switch) ??
      this.accessory.addService(this.platform.Service.Switch)

    this.service.setCharacteristic(this.platform.Characteristic.Name, 'A/C')

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onGet(this.getACState.bind(this))
      .onSet(this.setACState.bind(this))
  }

  private getACState(): CharacteristicValue {
    const status = this.platform.getVehicleStatus()
    const isOn = status?.acOn ?? false

    this.platform.log.debug('A/C state:', isOn ? 'ON' : 'OFF')

    return isOn
  }

  private async setACState(value: CharacteristicValue): Promise<void> {
    const shouldTurnOn = value as boolean

    this.platform.log.info(`Setting A/C to: ${shouldTurnOn ? 'ON' : 'OFF'}`)

    const result = await this.platform.client.controlAC(shouldTurnOn ? 'ON' : 'OFF')

    if (!result.result) {
      this.platform.log.error('Failed to control A/C:', result.message)
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      )
    }
  }
}
