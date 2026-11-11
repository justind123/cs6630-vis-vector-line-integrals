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

// D3 INIT AND SETUP FUNCTIONS
function createSvg(selector, config) {
  return d3.select(selector)
    .append('svg')
    .attr('width', config.width)
    .attr('height', config.height);
}

// defines the arrowhead shape
// uses 'defs' which can be referenced
// wherever needed
function defineArrowhead(svg) {
  svg.append('defs').append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '0 0 6 6')
    .attr('markerWidth', 4) // change these two values for sizing arrowhead
    .attr('markerHeight', 4)
    .attr('refX', 5)
    .attr('refY', 3)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,0 L6,3 L0,6 Z');
}

// defines layers like xAxis, yAxis, field, and (very soon) path
// these layers should hopefully make it easy to redraw and modify
// the existing svgs for interactivity
function createLayers(svg) {
  return {
    xAxis: svg.append('g').attr('class', 'x-axis'),
    yAxis: svg.append('g').attr('class', 'y-axis'),
    field: svg.append('g').attr('class', 'vector-field'),
    path: svg.append('g').attr('class', 'path')
  };
}

// DRAW FUNCTIONS

function createScales() {
  const { width, height, margin } = config
  return {
    x: d3.scaleLinear().domain(state.domain).range([margin, width - margin]),
    y: d3.scaleLinear().domain(state.domain).range([height - margin, margin]),
  };
}

function drawAxes(layers, scales) {
  layers.xAxis
    .attr('transform', `translate(0, ${scales.y(0)})`)
    .call(d3.axisBottom(scales.x));
  layers.yAxis
    .attr('transform', `translate(${scales.x(0)}, 0)`)
    .call(d3.axisLeft(scales.y));
}

// samples the vector field at a defined step size
// for the provided domain and function
function sampleField(F, domain, step) {
  const points = [];
  for (let x = domain[0]; x <= domain[1]; x += step) {
    for (let y = domain[0]; y <= domain[1]; y += step) {
      const [u, v] = F(x, y);
      points.push({
        x: x,
        y: y,
        u: u,
        v: v,
        mag: Math.hypot(u, v)
      });
    }
  }

  return points;
}

// takes in the field layer, with the samples points
// to draw the actual arrows in the view.
// 
// arrows are created my adding lines from the sampled points
function drawField(layer, points, scales, state) {
  const { step, normalize } = state;
  const maxMag = d3.max(points, d => d.mag) || 1;
  const arrowPx = (scales.x(step) - scales.x(0)) * 0.85;

  // Divide by own magnitude (same length) or by max (length ∝ magnitude)
  const len = d => (normalize ? d.mag : maxMag);

  layer.selectAll('line')
    .data(points.filter(d => d.mag > 0))
    .join('line')
    .attr('x1', d => scales.x(d.x))
    .attr('y1', d => scales.y(d.y))
    .attr('x2', d => scales.x(d.x) + (d.u / len(d)) * arrowPx)
    .attr('y2', d => scales.y(d.y) - (d.v / len(d)) * arrowPx)
    .attr('stroke', d => '#000')
    .attr('stroke-width', 1.5)
    .attr('marker-end', 'url(#arrowhead)');
}

// samples the curve along r(t) 
function sampleCurve(curve) {
  const { r, tRange, samples } = curve;
  const [t0, t1] = tRange;
  const points = []

  for (let i = 0; i <= samples; i++) {
    // calcuate current t based on samples
    const t = t0 + (i / samples) * (t1 - t0);
    const [x, y] = r(t);
    points.push({ t, x, y });
  }

  return points;
}

function drawPath(layer, points, scales) {
  const line = d3.line()
    .x(d => scales.x(d.x))
    .y(d => scales.y(d.y))
  
  layer.selectAll('path')
    .data([points])
    .join('path')
    .attr('d', line)
    .attr('fill', 'none')
    .attr('stroke', 'red')
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