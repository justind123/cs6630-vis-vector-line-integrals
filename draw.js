/************************************************
 * DRAWING and D3 logic lives here
 ************************************************/

// See for more info and workings for path animation: https://d3js.org/d3-timer

const DIVERGING_COLORS = ['#0000ff', '#000000', '#ff0000'];
const SOLID_PATH_COLOR = 'red';


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
    area: svg.append('g').attr('class', 'path-area'),
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

// diverging scale centered on zero
function createDivergingScale(values) {
  const maxAbs = d3.max(values, Math.abs);

  // help fix rounding issues for super small integrals
  // if max value anywhere on the line path is basically
  // zero then set the color scale to [-1, 1]
  let domainMax;
  if (maxAbs > 1e-10) {
    domainMax = maxAbs;
  } else {
    domainMax = 1;
  }

  return d3.scaleLinear()
    .domain([-domainMax, 0, domainMax])
    .range(DIVERGING_COLORS)
    .interpolate(d3.interpolateLab)
    .clamp(true);
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

  // Divide by own magnitude
  const len = d => {
    if (normalize) {
      return d.mag;
    } else {
      return maxMag;
    }
  };

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
function showPath(segments, scales, colorScale) {
  stopPathAnimation();
  drawStyledPath(segments, scales, colorScale);
  updateIntegralValue(integralUpTo(segments));
}

// draws the path in the style chosen in the config panel
// (state.pathStyle is only updated when Render is clicked)
function drawStyledPath(segments, scales, colorScale) {
  const style = state.pathStyle;

  // when color gradient is selected
  let lineColor;
  if (style === 'gradient') {
    lineColor = d => colorScale(d.cumulative);
  } else {
    lineColor = () => SOLID_PATH_COLOR;
  }

  // when shaded area style is selected
  let areaSegments;
  if (style === 'area') {
    areaSegments = segments;
  } else {
    areaSegments = [];
  }

  // only need color map legend when not default solid
  let legendDisplay;
  if (style === 'solid') {
    legendDisplay = 'none';
  } else {
    legendDisplay = null;
  }

  drawArea(layers.area, areaSegments, scales, colorScale);
  drawPath(layers.path, segments, scales, lineColor);
  d3.select('#path-legend').style('display', legendDisplay);
}

function drawPath(layer, segments, scales, color) {
  layer.selectAll('line')
    .data(segments)
    .join('line')
    .attr('x1', d => scales.x(d.a.x))
    .attr('y1', d => scales.y(d.a.y))
    .attr('x2', d => scales.x(d.b.x))
    .attr('y2', d => scales.y(d.b.y))
    .attr('stroke', color)
    .attr('stroke-width', 2)
}

const AREA_MAX_PX = 40; // largest band width possible so it doesn't explode

// shaded area beside the path whose width is the running integral,
// positive values extend to right side of path, negative to left
// using polygon so the the area looks continuous and not just single lines
// coming out from each line path segment
function drawArea(layer, segments, scales, colorScale) {
  const pxPerUnit = AREA_MAX_PX / colorScale.domain()[2];

  layer.selectAll('polygon')
    .data(segments)
    .join('polygon')
    .attr('points', (d, i) => {
      // running integral at the start and end of this segment
      let startValue;
      if (i > 0) {
        startValue = segments[i - 1].cumulative;
      } else {
        startValue = 0;
      }
      const endValue = d.cumulative;

      // segment start and end points
      const ax = scales.x(d.a.x);
      const ay = scales.y(d.a.y);
      const bx = scales.x(d.b.x);
      const by = scales.y(d.b.y);

      // unit vector perpendicular to the segment, in pixels
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / len;
      const ny = (bx - ax) / len;

      // band width (in pixels) at the start and end of the segment
      const startWidth = startValue * pxPerUnit;
      const endWidth = endValue * pxPerUnit;

      // four corners of the shaded band: two on the path
      const pathStart = [ax, ay];
      const pathEnd = [bx, by];
      const bandEnd = [bx + nx * endWidth, by + ny * endWidth];
      const bandStart = [ax + nx * startWidth, ay + ny * startWidth];

      // points for svg
      const corners = [pathStart, pathEnd, bandEnd, bandStart];

      return corners.join(' ');
    })
    .attr('fill', d => colorScale(d.cumulative))
    .attr('fill-opacity', 0.4);
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
function animatePath(segments, scales, colorScale) {
  // stop any active animation before starting new one
  stopPathAnimation();

  pathTimer = d3.timer(elapsed => {
    const progress = Math.min(elapsed / state.animationDuration, 1);
    const drawn = segments.slice(0, Math.floor(progress * segments.length));

    drawStyledPath(drawn, scales, colorScale);
    updateIntegralValue(integralUpTo(drawn));

    if (progress === 1) stopPathAnimation();
  });
}

function updatePathLegend(colorScale) {
  const [min, , max] = colorScale.domain();
  d3.select('#path-legend .legend-bar')
    .style('background', `linear-gradient(to right, ${DIVERGING_COLORS.join(', ')})`);
  d3.select('#legend-min').text(formatNumber(min, 2));
  d3.select('#legend-max').text(formatNumber(max, 2));
}