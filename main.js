/************************************************
 * ENTRY POINT
 ************************************************/


// Completed by Justin Duross and Emmalee Ingman
//
// https://www.khanacademy.org/math/multivariable-calculus/integrating-multivariable-functions/line-integrals-in-vector-fields-articles/a/line-integrals-in-a-vector-field

// inital config for visualization
const config = {
  width: 600,
  height: 600,
  margin: 40
}

// current state for visualization,
// intended to change w/ interactivity
const state = {
  fieldText: {
    u: '-y',
    v: 'x',
  },
  F: (x, y) => [-y, x],
  domain: [-10, 10],
  step: 1,
  normalize: false,
  color: false,
  animate: true,
  animationDuration: 2000,
  curve: { // integral path is represented as a parametric curve
    r: t => [5 * Math.cos(t), 5 * Math.sin(t)],
    tRange: [0, Math.PI], // start and end for t used in r(t)
    samples: 1000 // number of samples to take along path
  }
}

// path animation timer
// global so we can start/stop it when needed
let pathTimer = null;

function stopPathAnimation() {
  if (pathTimer) pathTimer.stop();
  pathTimer = null;
}


const svg = createSvg('#vis', config);
defineArrowhead(svg);
const layers = createLayers(svg);

// builds the vector field from the user input boxes
// uses built-in Function class to pass strings as javascript
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function
function buildField(u, v) {
  // Function() returns a function
  // this function, here called F, takes in parameters x and y
  // it returns array [u, v], where u and v come from the text input from the user
  const F = new Function('x', 'y', `return [${u}, ${v}]`);

  // quick error check to see if function is valid
  const [a, b] = F(1, 1);
  if (typeof a !== 'number' || typeof b !== 'number') {
    return null;
  }

  return F;
}

// reads state defaults and populates input values
function initInputs() {
  d3.select('#t-end').property('value', state.curve.tRange[1]);
  d3.select('#samples').property('value', state.curve.samples);
  d3.select('#animate').property('checked', state.animate);
  d3.select('#duration').property('value', state.animationDuration);
  d3.select('#field-u').property('value', state.fieldText.u);
  d3.select('#field-v').property('value', state.fieldText.v);
  d3.select('#arrow-step').property('value', state.step);
}

// updates input labels with user-selected values
function updateInputLabels() {
  d3.select('#t-end-value').text(formatNumber(Number(d3.select('#t-end').property('value')), 2));
  d3.select('#samples-value').text(d3.select('#samples').property('value'));
  d3.select('#duration-value').text(d3.select('#duration').property('value'));
  d3.select('#arrow-step-value').text(d3.select('#arrow-step').property('value'));
}

// reads inputs from user and sets state values
function readInputs() {
  const u = d3.select('#field-u').property('value');
  const v = d3.select('#field-v').property('value');
  const F = buildField(u, v);

  if (!F) {
    alert('Invalid formula. Use JavaScript syntax, e.g. Math.sin(x), x**2');
    return false;
  }

  state.fieldText = { u, v };
  state.F = F;
  state.curve.tRange = [state.curve.tRange[0], Number(d3.select('#t-end').property('value'))];
  state.curve.samples = Number(d3.select('#samples').property('value'));
  state.animate = d3.select('#animate').property('checked');
  state.animationDuration = Number(d3.select('#duration').property('value'));
  state.step = Number(d3.select('#arrow-step').property('value'));

  return true;
}

// init config panel with input defaults and labels
function setupConfig() {
  initInputs();
  updateInputLabels();

  // keep slider labels live while dragging
  d3.selectAll('.config input[type="range"]').on('input', updateInputLabels);

  // apply all inputs and redraw only when Render is clicked
  d3.select('#render-button').on('click', () => {
    if (readInputs()) {
      render();
    }
  });
}

function render() {
  const scales = createScales();
  drawAxes(layers, scales);

  const fieldSamples = sampleField(state.F, state.domain, state.step);
  drawField(layers.field, fieldSamples, scales, state);

  const pathSamples = sampleCurve(state.curve);
  if (state.animate) {
    animatePath(pathSamples, scales)
  } else {
    showPath(pathSamples, scales)
  }
}

setupConfig();
render();