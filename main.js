const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const path = require('path');

let win;

function createWindow() {
	win = new BrowserWindow({
		width: 250,
		height: 370,
		webPreferences: {
			nodeIntegration: true,
			preload: path.join(__dirname, 'preload.js'),
		},
		icon: './icon.png',
	});

	win.loadFile('index.html');
	win.removeMenu();

	win.on('closed', function () {
		win = null;
	});
}

app.allowRendererProcessReuse = false;

app.on('ready', createWindow);

app.on('window-all-closed', function () {
	app.quit();
});

app.on('activate', function () {
	if (win === null) {
		createWindow();
	}
});
