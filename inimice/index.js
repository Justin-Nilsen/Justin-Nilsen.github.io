const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path')
const steamworks = require('steamworks.js')

let mainWindow;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        //width: 800,
        //height: 600,
        //fullscreen: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'bin/js/preload.js'),
            contextIsolation: false,
            nodeIntegration: true,
            //devTools: false // Disable DevTools
        }
    })

    mainWindow.maximize();
    mainWindow.show();
    //win.maximize();

    mainWindow.loadFile('index.html')

    mainWindow.webContents.openDevTools()

    // Prevent the default shortcut for opening DevTools
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
        event.preventDefault();
        }
    });
}

// Listen for the "show-save-dialog" event from the renderer
ipcMain.handle('show-save-dialog', async (event, storyName, jsonData, jsonJS = {}) => {

    const fs = require('fs');
    fs.mkdir("bin/stories/" + storyName, (err) => {});
    //fs.writeFileSync("bin/stories/" + storyName + "/" + storyName + ".json", jsonData, 'utf-8');
    fs.writeFileSync("bin/stories/" + storyName + "/" + storyName + ".inimice", jsonJS, 'utf-8');

    /*
    // Options for the save dialog
    const options = {
        title: 'Save Your File',
        defaultPath: 'example.txt',
        filters: [
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] },
        ],
    };

    const result = await dialog.showSaveDialog(mainWindow, options);
    if (result.filePath) {
        console.log(`File path selected: ${result.filePath}`);
        // Here you could save content to the file path using fs.writeFile
        const fs = require('fs');
        fs.writeFileSync(result.filePath, content, 'utf-8');
    } else {
        console.log('Save dialog was canceled.');
    }
    */
});

app.whenReady().then(() => {

    //const client = steamworks.init(3432010);
    //steamworks.electronEnableSteamOverlay();

    // INIMIS
    // DUNIMIS
    // TENIMIS
    // QUADIMIS
    // CINIMIS
    // VENIMIS
    createWindow();

    // You can pass an appId, or don't pass anything and use a steam_appid.txt file

    // Print Steam username
    //console.log(client.localplayer.getName())
    console.log(app.getPath('userData'));

    // Tries to activate an achievement
    //if (client.achievement.activate('ACHIEVEMENT')) {
        // ...
    //}

    app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    app.quit();
})