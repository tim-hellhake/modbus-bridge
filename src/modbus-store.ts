/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

import {Database} from 'gateway-addon';
import {Config,
  DeviceAddressMapping,
  ListOfDeviceAddressMappings,
  PropertyAddressMapping} from './config';

export class ModbusStore {
    private debug = false;

    private addressMappings: ListOfDeviceAddressMappings = [];

    private deviceState: Record<number, Record<number, boolean | number>> = {};

    async load(): Promise<void> {
      const id = 'modbus-bridge';
      const db = new Database(id, '');
      await db.open();
      const config = <Config><unknown> await db.loadConfig();
      await db.close();

      this.debug = config.debug ?? false;
      this.addressMappings = config.addressMappings ?? [];

      if (this.debug) {
        console.log(`Loaded ${JSON.stringify(this.addressMappings)}`);
      }
    }

    private async save(): Promise<void> {
      const id = 'modbus-bridge';
      const db = new Database(id, '');
      await db.open();
      const config = <Config><unknown> await db.loadConfig();
      config.addressMappings = this.addressMappings;
      await db.saveConfig(config);
      await db.close();
    }

    private async getOrCreateDeviceInfo(id: string) {
      const ids = new Set<number>();

      for (const deviceInfo of this.addressMappings) {
        const {
          deviceId,
          unitID,
        } = deviceInfo;

        ids.add(unitID);

        if (deviceId === id) {
          return deviceInfo;
        }
      }

      let unitID = -1;

      for (let i = 0; i < 50000; i++) {
        if (!ids.has(i)) {
          unitID = i;
          break;
        }
      }

      // eslint-disable-next-line max-len
      console.log(`No mapping for device '${id}' found, unitID is now ${unitID}`);

      const deviceMapping: DeviceAddressMapping = {
        deviceId: id,
        unitID,
        properties: [],
      };

      this.addressMappings.push(deviceMapping);

      await this.save();

      return deviceMapping;
    }

    // eslint-disable-next-line max-len
    private async getOrCreatePropertyInfo(deviceMapping: DeviceAddressMapping, name: string) {
      const addresses = new Set<number>();

      for (const propertyInfo of deviceMapping.properties || []) {
        const {
          propertyName,
          address,
        } = propertyInfo;

        addresses.add(address);

        if (propertyName === name) {
          return propertyInfo;
        }
      }

      let address = -1;

      for (let i = 0; i < 50000; i++) {
        if (!addresses.has(i)) {
          address = i;
          break;
        }
      }

      // eslint-disable-next-line max-len
      console.log(`No mapping for property '${name}' found, address is now ${address}`);

      const propertyMapping: PropertyAddressMapping = {
        propertyName: name,
        address,
      };

      if (!deviceMapping.properties) {
        deviceMapping.properties = [];
      }

      deviceMapping.properties.push(propertyMapping);

      await this.save();

      return propertyMapping;
    }

    async put(
      deviceId: string, propertyName: string,
      value: boolean | number): Promise<void> {
      const deviceMapping = await this.getOrCreateDeviceInfo(deviceId);
      // eslint-disable-next-line max-len
      const propertyMapping = await this.getOrCreatePropertyInfo(deviceMapping, propertyName);

      const {
        unitID,
      } = deviceMapping;

      const {
        address,
      } = propertyMapping;

      if (!this.deviceState[unitID]) {
        this.deviceState[unitID] = {};
      }

      this.deviceState[unitID][address] = value;

      if (this.debug) {
        // eslint-disable-next-line max-len
        console.log(`The value of ${deviceId} (${unitID}) ${propertyName} (${address}) is now ${value}`);
      }
    }

    async getBool(unitID: number, address: number): Promise<boolean> {
      const value = await this.get(unitID, address);

      if (typeof value !== 'boolean') {
        throw new Error(`Value ${value} is not a number`);
      }

      return value;
    }

    async getInteger(unitID: number, address: number): Promise<number> {
      const value = await this.get(unitID, address);

      if (typeof value !== 'number') {
        throw new Error(`Value ${value} is not a number`);
      }

      return value;
    }

    async get(unitID: number, address: number): Promise<unknown> {
      const deviceState = this.deviceState[unitID];

      if (!deviceState) {
        let message = `No device with unitID ${unitID} known`;

        if (this.debug) {
          message += ` in ${JSON.stringify(this.deviceState)}`;
        }

        throw new Error(message);
      }

      if (!deviceState[address]) {
        let message = `No property with address ${address} known`;

        if (this.debug) {
          message += ` in ${JSON.stringify(deviceState)}`;
        }

        throw new Error(message);
      }

      return deviceState[address];
    }
}
