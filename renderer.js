const baudRate = 9600;
const maxValue = 1024;
const serialport = require('serialport');
let activePort;
let nSteps = -1;
let stepDivs = [];
let canvases = [];
let textValues = [];
let textThresholds = [];
let interval;

const init = async () => {
	await serialport.list().then((ports) => {
		const options = ports.map((port) => {
			const option = document.createElement('option');
			option.appendChild(document.createTextNode(port.path));
			return option;
		});
		const selectedIndex = ports.findIndex((port) =>
			port.pnpId.startsWith('USB')
		);
		if (selectedIndex) {
			initializePort(ports[selectedIndex].path);
			options[selectedIndex].selected = 'selected';
		}
		const select = document.querySelector('#ports-dropdown');
		options.forEach((option) => select.add(option));
		select.addEventListener('change', (event) => {
			nSteps = -1;
			initializePort(event.target.value);
		});
	});
};

const initializePort = (portName) => {
	clearInterval(interval);
	if (activePort) activePort.close();
	clear();
	activePort = new serialport(portName, {
		baudRate: baudRate,
	});
	activePort.on('data', (data) => parseData(data));
	interval = setInterval(queryPort, 10);
};

const queryPort = () => {
	activePort.write('v\nt\n');
};

const parseData = (data) => {
	const values = data.toString().trim().split(' ');
	const lastIdx = values.findIndex((v) => v.endsWith('\n'));
	const stepReadings = values.slice(0, lastIdx + 1).map((n) => parseInt(n));
	const thresholds = values
		.slice(lastIdx + 1, lastIdx + 1 + stepReadings.length)
		.map((n) => parseInt(n));

	if (nSteps === -1) {
		clear();
		nSteps = thresholds.length;
		const container = document.querySelector('#container');
		stepDivs = thresholds.map(() => document.createElement('div'));
		canvases = thresholds.map(() => document.createElement('canvas'));
		textThresholds = thresholds.map(() => document.createElement('span'));
		textValues = thresholds.map(() => document.createElement('span'));
		textThresholds.forEach((tt, idx) => {
			tt.className = 'text-threshold';
			tt.innerText = thresholds[idx];
			stepDivs[idx].appendChild(tt);
		});
		textValues.forEach((tv, idx) => {
			tv.className = 'text-value';
			stepDivs[idx].appendChild(tv);
		});
		canvases.forEach((canvas, idx) => {
			canvas.width = 100;
			canvas.height = 500;
			stepDivs[idx].appendChild(canvas);
		});
		stepDivs.forEach((s) => {
			s.className = 'step';
			container.appendChild(s);
		});
	}

	textThresholds.forEach((tt, idx) => (tt.innerText = thresholds[idx]));
	textValues.forEach((tv, idx) => (tv.innerText = stepReadings[idx]));
	canvases.forEach((canvas, idx) =>
		drawCanvas(canvas, stepReadings[idx], thresholds[idx])
	);
};

const drawCanvas = (canvas, value, threshold) => {
	const ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = value > threshold ? '#BF616A' : '#5E81AC';
	const normalizedValue = value / maxValue;
	const top = normalizedValue * canvas.height;
	ctx.fillRect(0, canvas.height - top, canvas.width, top);

	ctx.fillStyle = '#ECEFF4';
	const normalizedThreshold = threshold / maxValue;
	ctx.fillRect(
		0,
		canvas.height - normalizedThreshold * canvas.height - 3,
		canvas.width,
		3
	);
};

const editThresholds = () => {
	const editButton = document.querySelector('#change-thresholds');
	editButton.innerText = 'Save';
	let tbValues = textThresholds.map((tt) => tt.innerHTML);
	const cancelButton = document.createElement('button');
	cancelButton.innerText = 'Cancel';
	cancelButton.id = 'cancel-edit';
	cancelButton.onclick = cancelEdit;
	editButton.parentNode.insertBefore(cancelButton, editButton);
	const textBoxes = textThresholds.map(() => document.createElement('input'));
	textBoxes.forEach((tb, idx) => {
		tb.type = 'text';
		tb.size = '3';
		tb.value = tbValues[idx];
		stepDivs[idx].replaceChild(
			tb,
			stepDivs[idx].querySelector('.text-threshold')
		);
	});
	editButton.onclick = () =>
		saveThresholds(textBoxes.map((tb) => parseInt(tb.value)));
};

const saveThresholds = (values) => {
	if (values.every((n) => n < maxValue && n > 0)) {
		const command = values.map((v, idx) => `${idx}${v}`).join('\n');
		activePort.write(command);
		cancelEdit();
	}
};

const cancelEdit = () => {
	const saveButton = document.querySelector('#change-thresholds');
	saveButton.innerText = 'Edit Thresholds';
	saveButton.onclick = editThresholds;
	const cancelButton = document.querySelector('#cancel-edit');
	cancelButton.remove();
	textThresholds.forEach((tt, idx) => {
		stepDivs[idx].replaceChild(tt, stepDivs[idx].querySelector('input'));
	});
};

const clear = () => {
	const container = document.querySelector('#container');
	while (container.firstChild) {
		container.removeChild(container.firstChild);
	}
};

init();
