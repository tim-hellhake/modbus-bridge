/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

import {AddonManagerProxy, Database} from 'gateway-addon';
import {Config} from './config';
import {ModbusBridge} from './modbus-bridge';

export = async function(addonManager: AddonManagerProxy): Promise<void> {
  const id = 'modbus-bridge';
  const db = new Database(id, '');
  await db.open();
  const config = <Config><unknown> await db.loadConfig();
  await db.close();
  const modbusBridge = new ModbusBridge(addonManager, id, config);
  await modbusBridge.start();
}
