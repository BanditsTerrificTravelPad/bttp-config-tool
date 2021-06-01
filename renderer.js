const baudRate = 115200;
const maxValue = 1024;
const serialport = require("serialport");
const Readline = require("@serialport/parser-readline");
let activePort;
let parser;
let nSteps = -1;

let readings = [];
let thresholds = [];

let intervalHandle;

// HTML elements
let stepDivElements = [];
let canvasElements = [];
let textValueElements = [];
let textThresholdElements = [];

const init = async () => {
  const ports = await serialport.list();

  const optionElements = ports.map((port) => {
    const optionElement = document.createElement("option");
    optionElement.appendChild(document.createTextNode(port.path));
    return optionElement;
  });

  const selectedIndex = ports.findIndex((port) => port.pnpId.startsWith("USB"));
  if (selectedIndex != -1) {
    initializePort(ports[selectedIndex].path);
    optionElements[selectedIndex].selected = "selected";
  }

  const selectElement = document.querySelector("#ports-dropdown");
  optionElements.forEach((option) => selectElement.add(option));
  selectElement.addEventListener("change", (event) => {
    nSteps = -1;
    initializePort(event.target.value);
  });
};

const initializePort = (portName) => {
  clearInterval(intervalHandle);
  if (activePort) activePort.close();
  clear();
  activePort = new serialport(portName, {
    baudRate: baudRate,
  });
  parser = activePort.pipe(new Readline({ delimiter: "\n" }));
  parser.on("data", parseData);
  intervalHandle = setInterval(queryPort, 1000 / 60);
};

const queryPort = () => {
  activePort.write("v\nt\n");
};

const parseData = (data) => {
  const s = data.toString();
  if (s.startsWith("v")) {
    readings = Array.from(s.match(/ \d+/g)).map((i) =>
      Number.parseInt(i.trim())
    );
    updateDisplay();
  } else if (s.startsWith("t")) {
    thresholds = Array.from(s.match(/ \d+/g)).map((i) =>
      Number.parseInt(i.trim())
    );
    updateDisplay();
  }
};

const updateDisplay = () => {
  if (nSteps != thresholds.length) {
    clear();
    nSteps = thresholds.length;
    const container = document.querySelector("#container");
    stepDivElements = thresholds.map(() => document.createElement("div"));
    canvasElements = thresholds.map(() => document.createElement("canvas"));
    textThresholdElements = thresholds.map(() =>
      document.createElement("span")
    );
    textValueElements = thresholds.map(() => document.createElement("span"));
    textThresholdElements.forEach((e, idx) => {
      e.className = "text-threshold";
      e.innerText = thresholds[idx];
      stepDivElements[idx].appendChild(e);
    });
    textValueElements.forEach((e, idx) => {
      e.className = "text-value";
      stepDivElements[idx].appendChild(e);
    });
    canvasElements.forEach((e, idx) => {
      e.style.width = `calc(${100 / canvasElements.length}vw - 12px)`;
      e.style.height = `calc(100vh - 75px)`;
      stepDivElements[idx].appendChild(e);
    });
    stepDivElements.forEach((e) => {
      e.className = "step";
      container.appendChild(e);
    });
  }

  textThresholdElements.forEach((tt, idx) => (tt.innerText = thresholds[idx]));
  textValueElements.forEach((tv, idx) => (tv.innerText = readings[idx]));
  canvasElements.forEach((canvas, idx) =>
    drawCanvas(canvas, readings[idx], thresholds[idx])
  );
};

const drawCanvas = (canvas, value, threshold) => {
  let canvasWidth = canvas.clientWidth;
  let canvasHeight = canvas.clientHeight;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = value > threshold ? "#BF616A" : "#5E81AC";
  const normalizedValue = value / maxValue;
  const top = normalizedValue * canvasHeight;
  ctx.fillRect(0, canvasHeight - top, canvasWidth, top);

  ctx.fillStyle = "#ECEFF4";
  const normalizedThreshold = threshold / maxValue;
  ctx.fillRect(
    0,
    canvasHeight - normalizedThreshold * canvasHeight - 3,
    canvasWidth,
    3
  );
};

const editThresholds = () => {
  const editButton = document.querySelector("#change-thresholds");
  editButton.innerText = "Save";
  let tbValues = textThresholdElements.map((tt) => tt.innerHTML);
  const cancelButton = document.createElement("button");
  cancelButton.innerText = "Cancel";
  cancelButton.id = "cancel-edit";
  cancelButton.onclick = cancelEdit;
  editButton.parentNode.insertBefore(cancelButton, editButton);
  const textBoxes = textThresholdElements.map(() =>
    document.createElement("input")
  );
  textBoxes.forEach((tb, idx) => {
    tb.type = "text";
    tb.size = "3";
    tb.value = tbValues[idx];
    stepDivElements[idx].replaceChild(
      tb,
      stepDivElements[idx].querySelector(".text-threshold")
    );
  });
  editButton.onclick = () =>
    saveThresholds(textBoxes.map((tb) => parseInt(tb.value)));
};

const saveThresholds = (values) => {
  if (values.every((n) => n < maxValue && n > 0)) {
    const command = values.map((v, idx) => `${idx}${v}`).join("\n");
    activePort.write(command);
    cancelEdit();
  }
};

const cancelEdit = () => {
  const saveButton = document.querySelector("#change-thresholds");
  saveButton.innerText = "Edit Thresholds";
  saveButton.onclick = editThresholds;
  const cancelButton = document.querySelector("#cancel-edit");
  cancelButton.remove();
  textThresholdElements.forEach((tt, idx) => {
    stepDivElements[idx].replaceChild(
      tt,
      stepDivElements[idx].querySelector("input")
    );
  });
};

const clear = () => {
  const container = document.querySelector("#container");
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

init();
