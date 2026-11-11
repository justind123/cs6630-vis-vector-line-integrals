/************************************************
 * MATH functions and logic exist here
 ************************************************/


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