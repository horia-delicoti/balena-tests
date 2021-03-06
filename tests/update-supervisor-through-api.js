/*
 * Copyright 2017 balena
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict'

module.exports = {
  title: 'Update supervisor through the API',
  run: async (test, context, options, components) => {
    // Get supervisor update info
    const supervisorImage = await components.balena.sdk.executeCommandInHostOS(
      'source /etc/resin-supervisor/supervisor.conf ; echo $SUPERVISOR_IMAGE',
      context.uuid,
      context.key.privateKeyPath
    )
    const supervisorTag = await components.balena.sdk.executeCommandInHostOS(
      'source /etc/resin-supervisor/supervisor.conf ; echo $SUPERVISOR_TAG',
      context.uuid,
      context.key.privateKeyPath
    )

    // Get config.json path
    const configPath = await components.balena.sdk.executeCommandInHostOS(
      'systemctl show config-json.path --no-pager | grep PathChanged | cut -d \'=\' -f 2',
      context.uuid,
      context.key.privateKeyPath
    )

    test.isNot(supervisorImage, '')
    test.isNot(supervisorTag, '')
    test.isNot(configPath, '')

    // Get config.json content
    const config = JSON.parse(await components.balena.sdk.executeCommandInHostOS(
      `cat ${configPath}`,
      context.uuid,
      context.key.privateKeyPath
    ))

    // Get Supervisor ID
    const supervisorId = (await components.balena.sdk.pine.get({
      resource: 'supervisor_release',
      options: {
        $select: 'id',
        $filter: {
          device_type: config.deviceType,
          supervisor_version: supervisorTag
        }
      }
    }))[0].id

    test.is(await components.balena.sdk.pine.patch({
      resource: 'device',
      id: config.deviceId,
      body: {
        should_be_managed_by__supervisor_release: supervisorId
      }
    }), 'OK')

    test.resolveMatch(components.balena.sdk.executeCommandInHostOS(
      'update-resin-supervisor | grep "Supervisor configuration found from API"',
      context.uuid,
      context.key.privateKeyPath
    ), 'Supervisor configuration found from API')
  }
}
