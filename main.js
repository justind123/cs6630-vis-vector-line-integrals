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
  F: (x, y) => [-y, x],
  domain: [-10, 10],
  step: 1,
  normalize: false,
  color: false,
  curve: { // integral path is represented as a parametric curve
    r: t => [5 * Math.cos(t), 5 * Math.sin(t)],
    tRange: [0, Math.PI], // start and end for t used in r(t)
    samples: 1000 // number of samples to take along path
  }
}


const svg = createSvg('#vis', config);
defineArrowhead(svg);
const layers = createLayers(svg);

function render() {
  const scales = createScales();
  drawAxes(layers, scales);

  const fieldSamples = sampleField(state.F, state.domain, state.step);
  drawField(layers.field, fieldSamples, scales, state);

  const pathSamples = sampleCurve(state.curve);
  drawPath(layers.path, pathSamples, scales);
}

render();