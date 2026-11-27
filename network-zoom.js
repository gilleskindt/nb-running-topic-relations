window.attachNetworkZoom = function(plot, controls, dismissTooltip) {
  const maxZoom = 4, step = 1.5;
  const surface = plot.closest('.nr-graph');
  const out = controls.querySelector('[data-zoom="out"]');
  const zoomIn = controls.querySelector('[data-zoom="in"]');
  const reset = controls.querySelector('[data-zoom="reset"]');
  const level = controls.querySelector('[data-zoom="level"]');
  let width = 1, height = 1, zoom = 1, cx = .5, cy = .5;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function draw() {
    const half = .5 / zoom;
    cx = clamp(cx, half, 1 - half);
    cy = clamp(cy, half, 1 - half);
    const viewLeft = (cx-half)*width, viewTop = (cy-half)*height;
    plot.setAttribute('viewBox', [viewLeft,viewTop,width/zoom,height/zoom].join(' '));
    out.disabled = zoom === 1;
    reset.disabled = zoom === 1;
    zoomIn.disabled = zoom === maxZoom;
    level.textContent = Math.round(zoom*100) + '%';
    plot.classList.toggle('is-zoomed', zoom > 1);
    // Apply the SVG camera to the full canvas grid, including the space above and below the plot.
    const rect = plot.getBoundingClientRect(), frame = surface.getBoundingClientRect();
    const scale = Math.min(rect.width/width,rect.height/height);
    const left = rect.left-frame.left-surface.clientLeft + (rect.width-width*scale)/2;
    const top = rect.top-frame.top-surface.clientTop + (rect.height-height*scale)/2;
    surface.style.setProperty('--nr-grid-zoom',zoom);
    surface.style.backgroundPosition = ((1-zoom)*left-viewLeft*scale*zoom)+'px '+((1-zoom)*top-viewTop*scale*zoom)+'px';
  }
  function move(next, fromX, fromY, toX, toY) {
    const rect = plot.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scale = Math.min(rect.width / width, rect.height / height);
    const originX = rect.left + rect.width / 2, originY = rect.top + rect.height / 2;
    next = clamp(next, 1, maxZoom);
    cx += ((fromX-originX)/zoom - (toX-originX)/next) / (width*scale);
    cy += ((fromY-originY)/zoom - (toY-originY)/next) / (height*scale);
    zoom = next;
    dismissTooltip();
    draw();
  }
  controls.addEventListener('click', event => {
    const action = event.target.closest('button')?.dataset.zoom;
    if (!action) return;
    zoom = action === 'reset' ? 1 : clamp(action === 'in' ? zoom * step : zoom / step, 1, maxZoom);
    dismissTooltip();
    draw();
  });
  plot.addEventListener('wheel', event => {
    event.preventDefault();
    const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
    const factor = Math.exp(-event.deltaY * units * .005);
    move(zoom * factor, event.clientX, event.clientY, event.clientX, event.clientY);
  }, {passive:false});

  const points = new Map();
  let dragging = false, suppressClick = false;
  function captureGesture() {
    dragging = suppressClick = true;
    plot.classList.add('is-panning');
    for (const id of points.keys()) plot.setPointerCapture(id);
    dismissTooltip();
  }
  plot.addEventListener('pointerdown', event => {
    if (event.button !== 0 || points.size >= 2) return;
    if (!points.size) suppressClick = false;
    const {clientX:x, clientY:y} = event;
    points.set(event.pointerId, {x, y, startX:x, startY:y});
    if (points.size === 2) captureGesture();
  });
  window.addEventListener('pointermove', event => {
    const point = points.get(event.pointerId);
    if (!point) return;
    const {clientX:x, clientY:y} = event;
    if (!dragging && zoom > 1 && Math.hypot(x-point.startX,y-point.startY) > 4) captureGesture();
    if (dragging) {
      const other = [...points.values()].find(value => value !== point);
      if (other) {
        const before = Math.hypot(point.x-other.x,point.y-other.y);
        const after = Math.hypot(x-other.x,y-other.y);
        if (before > 0 && after > 0) {
          move(zoom*after/before,(point.x+other.x)/2,(point.y+other.y)/2,(x+other.x)/2,(y+other.y)/2);
        }
      } else {
        move(zoom,point.x,point.y,x,y);
      }
    }
    point.x = x;
    point.y = y;
  });
  function release(event) {
    if (!points.delete(event.pointerId) || points.size) return;
    dragging = false;
    plot.classList.remove('is-panning');
  }
  window.addEventListener('pointerup',release);
  window.addEventListener('pointercancel',release);
  window.addEventListener('blur',() => {
    points.clear();
    dragging = false;
    plot.classList.remove('is-panning');
  });
  plot.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);

  plot.addEventListener('focusin', event => {
    if (zoom === 1 || !event.target.matches('[role="button"]:focus-visible')) return;
    const mark = event.target.getBoundingClientRect(), rect = plot.getBoundingClientRect();
    const x = mark.left + mark.width / 2, y = mark.top + mark.height / 2;
    if (x < rect.left+8 || x > rect.right-8 || y < rect.top+8 || y > rect.bottom-8) {
      move(zoom, x,y, rect.left+rect.width/2,rect.top+rect.height/2);
    }
  });
  return {
    resize(w,h) { width = w; height = h; draw(); }
  };
};
