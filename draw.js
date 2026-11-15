/************************************************
 * DRAWING and D3 logic lives here
 ************************************************/

// See for more info and workings for path animation: https://d3js.org/d3-timer

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

// shows path and displays integral value with
// no animation
function showPath(points, scales) {
  // stop any active animation
  stopPathAnimation();
  drawPath(layers.path, points, scales);
  updateIntegralValue(lineIntegral(state.F, points));
}

function drawPath(layer, points, scales, duration) {
  const line = d3.line()
    .x(d => scales.x(d.x))
    .y(d => scales.y(d.y))
  
  layer.selectAll('path')
    .data([points])
    .join('path')
    .attr('d', line)
    .attr('fill', 'none')
    .attr('stroke', 'red')
    .attr('stroke-width', '1')
}

// keeps the displayed integral value consistent,
// especially with super low values so it doesn't
// flicker between -0.000 and 0.000
function formatNumber(value, decimals) {
  let rounded = Number(value.toFixed(decimals));
  if (rounded === 0) {
    rounded = 0;
  }

  return rounded.toFixed(decimals);
}

function updateIntegralValue(value) {
  d3.select('#integral').text(`Integral Value: ${formatNumber(value, 3)}`);
}

/************************************************
 * PATH ANIMATION
 * https://d3js.org/d3-timer
 ************************************************/

// uses d3.timer() to interpolate how many steps to draw
// per frame for the specified animationDuration
function animatePath(points, scales) {
  // stop any active animation before starting new one
  stopPathAnimation();

  const lastStep = points.length - 1;
  let currStep = 0;
  let total = 0;

  pathTimer = d3.timer(elapsed => {
    // clean up timer when done
    if (currStep === lastStep) {
      stopPathAnimation();
    }

    const progress = Math.min(elapsed / state.animationDuration, 1);
    const targetStep = Math.floor(progress * lastStep);

    while (currStep < targetStep) {
      total += segmentIntegral(state.F, points[currStep], points[currStep + 1]);
      currStep++;
    }

    drawPath(layers.path, points.slice(0, currStep + 1), scales);
    updateIntegralValue(total);
  });
}