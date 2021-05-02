/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

import { Adapter, AddonManagerProxy } from 'gateway-addon';
import { WebThingsClient } from 'webthings-client';
import { Config } from './config';
import { IServiceVector, ServerTCP } from 'modbus-serial';
import { ModbusStore } from './modbus-store';
import { Property } from 'webthings-client/lib/property';

export class ModbusBridge extends Adapter {
  private modbusStore: ModbusStore = new ModbusStore();

  constructor(
    // eslint-disable-next-line no-unused-vars
    addonManager: AddonManagerProxy,
    id: string,
    private config: Config
  ) {
    super(addonManager, ModbusBridge.name, id);
    addonManager.addAdapter(this);
  }

  async start(): Promise<void> {
    const { port } = this.config;

    await this.modbusStore.load();

    this.connectToGateway();

    const handler: IServiceVector = {
      getCoil: async (addr: number, unitID: number) => {
        try {
          const value = await this.modbusStore.getBool(unitID, addr);
          console.log(`Read coil for ${unitID} ${addr}: ${value}`);
          return value;
        } catch (e) {
          console.log(`Could not read coil for ${unitID} ${addr}: ${e}`);
          throw e;
        }
      },
      getDiscreteInput: async (addr: number, unitID: number) => {
        try {
          const value = await this.modbusStore.getBool(unitID, addr);
          console.log(`Read discrete input for ${unitID} ${addr}: ${value}`);
          return value;
        } catch (e) {
          // eslint-disable-next-line max-len
          console.log(`Could not read discrete input for ${unitID} ${addr}: ${e}`);
          throw e;
        }
      },
      getInputRegister: async (addr: number, unitID: number) => {
        try {
          const value = await this.modbusStore.getInteger(unitID, addr);
          console.log(`Read input register for ${unitID} ${addr}: ${value}`);
          return value;
        } catch (e) {
          // eslint-disable-next-line max-len
          console.log(`Could not read input register for ${unitID} ${addr}: ${e}`);
          throw e;
        }
      },
      getHoldingRegister: async (addr: number, unitID: number) => {
        try {
          const value = await this.modbusStore.getInteger(unitID, addr);
          // eslint-disable-next-line max-len
          console.log(`Read holding register for ${unitID} ${addr}: ${value}`);
          return value;
        } catch (e) {
          // eslint-disable-next-line max-len
          console.log(`Could not read holding register for ${unitID} ${addr}: ${e}`);
          throw e;
        }
      },
    };

    // set the server to answer for modbus requests
    console.log('Starting modbus tcp server');

    const serverTCP = new ServerTCP(handler, {
      host: '0.0.0.0',
      port,
      debug: true,
    });

    serverTCP.on('SocketError', (err) => {
      console.log(`Socket error in modbus server: ${err}`);
    });

    serverTCP.on('error', (err) => {
      console.log(`General error in modbus server: ${err}`);
    });

    serverTCP.on('initialized', (err) => {
      if (err) {
        console.log(`Could not initialize modbus server: ${err}`);
      } else {
        console.log(`Modbus server ist listening on port ${port}`);
      }
    });
  }

  private async connectToGateway() {
    console.log('Connecting to gateway');

    const { accessToken } = this.config;

    const webThingsClient = await WebThingsClient.local(accessToken as string);
    const devices = await webThingsClient.getDevices();

    for (const device of devices) {
      const deviceId = device.id();
      await device.connect();
      // eslint-disable-next-line max-len
      console.log(`Successfully connected to ${device.description.title} (${deviceId})`);

      // eslint-disable-next-line max-len
      device.on('propertyChanged', async (property: Property, value: unknown) => {
        const key = property.name;

        if (typeof value === 'boolean' || typeof value === 'number') {
          try {
            await this.modbusStore.put(deviceId, key, value);
          } catch (e) {
            // eslint-disable-next-line max-len
            console.log(
              `Could not save update ${JSON.stringify({
                deviceId,
                key,
                value,
              })}: ${e}`
            );
          }
        } else if (this.config.debug) {
          // eslint-disable-next-line max-len
          console.log(
            `Ignoring update ${JSON.stringify({
              deviceId,
              key,
              value,
            })} because the type '${typeof value}' is not supported`
          );
        }
      });
    }
  }
}
