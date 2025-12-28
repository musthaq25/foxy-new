// Interface for the exposed Electron API
interface ElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

const getElectron = (): ElectronAPI | undefined => {
  return (window as any).electron;
};

export const desktopService = {
  /**
   * Attempts to open a Windows application via Electron's main process.
   * Assumes the main process listens for 'system:open-app'.
   */
  openApp: async (appName: string): Promise<boolean> => {
    const electron = getElectron();
    
    // Debugging logs
    console.log(`[DesktopService] Attempting to open: ${appName}`);
    console.log(`[DesktopService] Electron detected: ${!!electron}`);

    if (!electron) {
      console.warn('[DesktopService] Desktop service not available (Not in Electron).');
      return false;
    }

    try {
      // Invoke the IPC handler defined in Electron's main process
      const result = await electron.invoke('system:open-app', appName);
      console.log(`[DesktopService] Result:`, result);
      return result && result.success;
    } catch (error) {
      console.error('[DesktopService] Failed to execute desktop command:', error);
      return false;
    }
  }
};