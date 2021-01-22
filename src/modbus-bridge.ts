/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

import {Adapter, AddonManagerProxy} from 'gateway-addon';
import {WebThingsClient} from 'webthings-client';
import {Config} from './config';
import {IServiceVector, ServerTCP} from 'modbus-serial';
import {ModbusStore} from './modbus-store';

export class ModbusBridge extends Adapter {
    private modbusStore: ModbusStore = new ModbusStore();

    constructor(
      // eslint-disable-next-line no-unused-vars
      addonManager: AddonManagerProxy, id: string, private config: Config) {
      super(addonManager, ModbusBridge.name, id);
      addonManager.addAdapter(this);
    }

    async start(): Promise<void> {
      const {
        port,
      } = this.config;

      await this.modbusStore.load();

      this.connectToGateway();

      const handler: IServiceVector = {
        getCoil: (addr: number, unitID: number) => {
          return this.modbusStore.getBool(unitID, addr);
        },
        getDiscreteInput: (addr: number, unitID: number) => {
          return this.modbusStore.getBool(unitID, addr);
        },
        getInputRegister: (addr: number, unitID: number) => {
          return this.modbusStore.getInteger(unitID, addr);
        },
        getHoldingRegister: (addr: number, unitID: number) => {
          return this.modbusStore.getInteger(unitID, addr);
        },
      };

      // set the server to answer for modbus requests
      console.log('Starting modbus tcp server');

      const serverTCP = new ServerTCP(
        handler, {host: '0.0.0.0', port, debug: true});

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

      const {
        accessToken,
      } = this.config;

      const webThingsClient = await WebThingsClient.local(accessToken);
      await webThingsClient.connect();

      webThingsClient.on('propertyChanged', async (deviceId, key, value) => {
        if (typeof value === 'boolean' || typeof value === 'number') {
          await this.modbusStore.put(deviceId, key, value);
        }
      });
    }
}
