import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'

import { bleService } from './ble.service'

export const BLE_SCAN_TASK = 'SPORS_BLE_SCAN'

if (!TaskManager.isTaskDefined(BLE_SCAN_TASK)) {
  TaskManager.defineTask(BLE_SCAN_TASK, async () => {
    try {
      const permission = await Location.getForegroundPermissionsAsync()
      if (permission.status !== 'granted') {
        return BackgroundFetch.BackgroundFetchResult.NoData
      }

      let detectedAny = false

      await bleService.scanForSPORSDevices((_beaconId, _rssi) => {
        detectedAny = true
      })

      await new Promise((resolve) => setTimeout(resolve, 10000))
      bleService.stopScan()

      return detectedAny
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.NoData
    } catch {
      bleService.stopScan()
      return BackgroundFetch.BackgroundFetchResult.Failed
    }
  })
}

export async function enableBackgroundBleScanTask() {
  const status = await BackgroundFetch.getStatusAsync()
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    return false
  }

  const registered = await TaskManager.getRegisteredTasksAsync()
  const exists = registered.some((task) => task.taskName === BLE_SCAN_TASK)

  if (!exists) {
    await BackgroundFetch.registerTaskAsync(BLE_SCAN_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    })
  }

  return true
}

export async function disableBackgroundBleScanTask() {
  const registered = await TaskManager.getRegisteredTasksAsync()
  const exists = registered.some((task) => task.taskName === BLE_SCAN_TASK)

  if (exists) {
    await BackgroundFetch.unregisterTaskAsync(BLE_SCAN_TASK)
  }
}
