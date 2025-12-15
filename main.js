const { app, BrowserWindow } = require('electron');
const path = require('path');

// --- YOUR TARGET URL HERE ---
const TARGET_URL = 'https://foxyai1.netlify.app/'; // <--- REPLACE THIS
// ----------------------------

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Foxy AI Assistant", // Set the window title
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load the external URL
  mainWindow.loadURL(TARGET_URL);

  // Optional: Remove the menu bar (File, Edit, etc.)
  mainWindow.setMenuBarVisibility(false);
}

// When Electron is ready
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});