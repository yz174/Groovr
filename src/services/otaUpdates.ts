import * as Updates from 'expo-updates';

export type OtaUpdateResult =
  | { status: 'unsupported' }
  | { status: 'upToDate' }
  | { status: 'applied' }
  | { status: 'failed'; message: string };

export function isOtaSupported(): boolean {
  return Updates.isEnabled && !__DEV__;
}

export async function checkAndApplyOtaUpdate(): Promise<OtaUpdateResult> {
  if (!isOtaSupported()) {
    return { status: 'unsupported' };
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) {
      return { status: 'upToDate' };
    }

    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return { status: 'applied' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown OTA update error';
    return { status: 'failed', message };
  }
}

export async function prefetchOtaUpdate(): Promise<void> {
  if (!isOtaSupported()) {
    return;
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
    }
  } catch {
    // Ignore background OTA errors. Users can still trigger a manual check.
  }
}
