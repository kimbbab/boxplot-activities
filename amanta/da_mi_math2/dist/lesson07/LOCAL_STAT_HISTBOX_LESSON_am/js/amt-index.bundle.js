/* 상자그림 계산: 홀수 개의 자료에서는 중앙값을 제외하고 사분위수를 구합니다. */
(function (root) {
  'use strict';

  var MAX_COUNT = 200;
  var MAX_MAGNITUDE = 1000000000;
  var DECIMAL_SCALE = 1000000;

  function validateValues(values) {
    if (!Array.isArray(values) || values.length < 2) {
      throw new Error('자료를 2개 이상 입력해 주세요.');
    }
    if (values.length > MAX_COUNT) {
      throw new Error('자료는 200개까지 입력할 수 있습니다.');
    }
    for (var i = 0; i < values.length; i += 1) {
      if (typeof values[i] !== 'number' || !Number.isFinite(values[i])) {
        throw new Error((i + 1) + '번째 자료가 올바른 숫자가 아닙니다.');
      }
      if (Math.abs(values[i]) > MAX_MAGNITUDE) {
        throw new Error('자료의 절댓값은 1,000,000,000 이하여야 합니다.');
      }
    }
  }

  function parseData(text) {
    var normalized = String(text == null ? '' : text)
      .normalize('NFKC')
      .replace(/\u2212/g, '-')
      .replace(/\u3001/g, ',')
      .trim();
    if (!normalized) {
      throw new Error('자료를 2개 이상 입력해 주세요.');
    }
    var tokens = normalized.split(/[\s,;]+/).filter(Boolean);
    if (tokens.length > MAX_COUNT) {
      throw new Error('자료는 200개까지 입력할 수 있습니다.');
    }
    var values = tokens.map(function (token, index) {
      if (!/^[+-]?(?:\d+(?:\.\d{0,6})?|\.\d{1,6})$/.test(token)) {
        throw new Error((index + 1) + '번째 자료 “' + token + '”를 확인해 주세요. 숫자는 소수점 아래 6자리까지 입력할 수 있습니다.');
      }
      var value = Number(token);
      if (!Number.isFinite(value) || Math.abs(value) > MAX_MAGNITUDE) {
        throw new Error((index + 1) + '번째 자료의 절댓값은 1,000,000,000 이하여야 합니다.');
      }
      return value === 0 ? 0 : value;
    });
    validateValues(values);
    return values.sort(function (a, b) { return a - b; });
  }

  function median(sorted) {
    var middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : sorted[middle - 1] / 2 + sorted[middle] / 2;
  }

  function summarize(values) {
    validateValues(values);
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var middle = Math.floor(sorted.length / 2);
    var lower = sorted.slice(0, middle);
    var upper = sorted.slice(middle + sorted.length % 2);
    // Input has at most six decimal places. Millionths are safe integers:
    // |unit| <= 1e15, and a sum or difference stays <= 2e15 < 2^53.
    // Medians may be half a unit; those also remain exact in this range.
    var units = sorted.map(function (value) { return Math.round(value * DECIMAL_SCALE); });
    var q1Units = median(units.slice(0, middle));
    var q3Units = median(units.slice(middle + sorted.length % 2));
    var min = sorted[0];
    var max = sorted[sorted.length - 1];
    return {
      sorted: sorted,
      min: min,
      q1: q1Units / DECIMAL_SCALE,
      median: median(units) / DECIMAL_SCALE,
      q3: q3Units / DECIMAL_SCALE,
      max: max,
      n: sorted.length,
      range: (units[units.length - 1] - units[0]) / DECIMAL_SCALE,
      iqr: (q3Units - q1Units) / DECIMAL_SCALE,
      lower: lower,
      upper: upper
    };
  }

  function parseFiveNumber(values) {
    if (!Array.isArray(values) || values.length !== 5) {
      throw new Error('최솟값, 제1사분위수, 중앙값, 제3사분위수, 최댓값을 모두 입력해 주세요.');
    }
    var names = ['최솟값', '제1사분위수', '중앙값', '제3사분위수', '최댓값'];
    var numbers = names.map(function (_, index) {
      var input = values[index];
      var token = String(input == null ? '' : input).normalize('NFKC').replace(/\u2212/g, '-').trim();
      if (!token) {
        throw new Error(names[index] + '을(를) 입력해 주세요.');
      }
      if ((typeof input !== 'number' && typeof input !== 'string') || !/^[+-]?(?:\d+(?:\.\d{0,6})?|\.\d{1,6})$/.test(token)) {
        throw new Error(names[index] + '은(는) 소수점 아래 6자리까지의 숫자로 입력해 주세요.');
      }
      var number = Number(token);
      if (!Number.isFinite(number) || Math.abs(number) > MAX_MAGNITUDE) {
        throw new Error(names[index] + '의 절댓값은 1,000,000,000 이하여야 합니다.');
      }
      return number === 0 ? 0 : number;
    });
    for (var index = 1; index < numbers.length; index += 1) {
      if (numbers[index] < numbers[index - 1]) {
        throw new Error(names[index] + '은(는) ' + names[index - 1] + ' 이상이어야 합니다.');
      }
    }
    var units = numbers.map(function (number) { return Math.round(number * DECIMAL_SCALE); });
    return {
      min: numbers[0],
      q1: numbers[1],
      median: numbers[2],
      q3: numbers[3],
      max: numbers[4],
      range: (units[4] - units[0]) / DECIMAL_SCALE,
      iqr: (units[3] - units[1]) / DECIMAL_SCALE,
      n: null,
      sorted: [],
      lower: [],
      upper: []
    };
  }

  function axisDomain(min, max) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max || Math.abs(min) > MAX_MAGNITUDE || Math.abs(max) > MAX_MAGNITUDE) {
      throw new Error('수직선의 최솟값과 최댓값을 확인해 주세요.');
    }
    var span = max - min;
    var padding = span === 0 ? Math.max(1, Math.abs(min) * 0.1) : span * 0.08;
    var desiredMin = min - padding;
    var desiredMax = max + padding;
    var rawStep = Math.max((desiredMax - desiredMin) / 6, Math.max(Math.abs(min), Math.abs(max)) * Number.EPSILON);
    var power = Math.pow(10, Math.max(-323, Math.floor(Math.log10(rawStep || Number.MIN_VALUE))));
    var fraction = rawStep / power;
    var multiple = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
    var step = multiple * power;
    var startIndex = Math.floor(desiredMin / step);
    var endIndex = Math.ceil(desiredMax / step);
    var decimals = Math.min(100, Math.max(0, -Math.floor(Math.log10(step)) + 2));
    function clean(value) {
      // toFixed removes distracting binary tails from ordinary decimal ticks.
      var result = Math.abs(value) >= 1e-100 ? Number(value.toFixed(decimals)) : value;
      return result === 0 ? 0 : result;
    }
    var ticks = [];
    for (var offset = 0; offset <= endIndex - startIndex; offset += 1) {
      var tick = clean((startIndex + offset) * step);
      if (!ticks.length || tick > ticks[ticks.length - 1]) ticks.push(tick);
    }
    return { min: ticks[0], max: ticks[ticks.length - 1], step: step, ticks: ticks };
  }

  root.BoxplotMath = Object.freeze({
    parseData: parseData,
    summarize: summarize,
    parseFiveNumber: parseFiveNumber,
    axisDomain: axisDomain
  });
}(typeof globalThis !== 'undefined' ? globalThis : window));

;
/* 히스토그램: 각 계급은 시작값 이상, 끝값 미만입니다. 외부 의존성 없음. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.HistogramMath = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCALE = 1000000;
  var MAX_MAGNITUDE = 1000000000;
  var MAX_BINS = 60;
  var DECIMAL = /^[+-]?(?:\d+(?:\.\d{0,6})?|\.\d{1,6})$/;

  function parameter(input, name) {
    if (typeof input !== 'string' && typeof input !== 'number') {
      throw new Error(name + '을(를) 숫자로 입력해 주세요.');
    }
    var token = String(input).normalize('NFKC').replace(/\u2212/g, '-').trim();
    if (!DECIMAL.test(token)) {
      throw new Error(name + '은(는) 소수점 아래 6자리까지의 숫자로 입력해 주세요.');
    }
    var value = Number(token);
    if (!Number.isFinite(value) || Math.abs(value) > MAX_MAGNITUDE) {
      throw new Error(name + '의 절댓값은 1,000,000,000 이하여야 합니다.');
    }
    return value === 0 ? 0 : value;
  }

  function build(values, width, start) {
    if (!Array.isArray(values) || values.length < 2 || values.length > 200) {
      throw new Error('자료는 2개 이상 200개 이하로 입력해 주세요.');
    }
    var minUnits = Infinity;
    var maxUnits = -Infinity;
    var units = [];
    for (var i = 0; i < values.length; i += 1) {
      var value = values[i];
      if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > MAX_MAGNITUDE) {
        throw new Error((i + 1) + '번째 자료는 절댓값이 1,000,000,000 이하인 숫자여야 합니다.');
      }
      var unit = Math.round(value * SCALE);
      if (unit / SCALE !== value) {
        throw new Error((i + 1) + '번째 자료는 소수점 아래 6자리까지 입력할 수 있습니다.');
      }
      units.push(unit);
      minUnits = Math.min(minUnits, unit);
      maxUnits = Math.max(maxUnits, unit);
    }
    var widthValue = parameter(width, '계급 크기');
    var startValue = parameter(start, '계급 시작값');
    if (widthValue <= 0) {
      throw new Error('계급 크기는 0보다 커야 합니다.');
    }
    var widthUnits = Math.round(widthValue * SCALE);
    var startUnits = Math.round(startValue * SCALE);
    if (startUnits > minUnits) {
      throw new Error('계급 시작값은 자료의 최솟값 이하여야 합니다.');
    }

    // Six-place values become exact integers (|unit| <= 1e15).
    // Differences and the final upper boundary also stay within safe integer range.
    // Adding one includes a maximum that lies exactly on a class boundary.
    var count = Math.floor((maxUnits - startUnits) / widthUnits) + 1;
    if (count > MAX_BINS) {
      throw new Error('계급은 60개까지 만들 수 있습니다. 계급 크기를 늘리거나 시작값을 조정해 주세요.');
    }
    var bins = [];
    for (var binIndex = 0; binIndex < count; binIndex += 1) {
      bins.push({
        start: (startUnits + binIndex * widthUnits) / SCALE,
        end: (startUnits + (binIndex + 1) * widthUnits) / SCALE,
        count: 0
      });
    }
    units.forEach(function (unit) {
      bins[Math.floor((unit - startUnits) / widthUnits)].count += 1;
    });
    return {
      bins: bins,
      min: minUnits / SCALE,
      max: maxUnits / SCALE,
      width: widthValue,
      start: startValue,
      n: values.length
    };
  }

  return Object.freeze({ build: build });
}));

;
/* Canvas graphs and local lesson controls. Math modules must load first. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const required = ['amt-viewer-wraper', 'hb-form', 'hb-name', 'hb-unit', 'hb-data', 'hb-width', 'hb-start',
    'hb-reset', 'hb-error', 'hb-count', 'hb-summary', 'hb-status', 'hb-chart', 'hb-chart-desc',
    'lesson-example', 'answer-popup-01', 'lesson-reset', 'lesson-complete', 'lesson-answer', 'lesson-status'];
  if (required.some(id => !$(id)) || !window.BoxplotMath || !window.HistogramMath) return;
  const root = $('amt-viewer-wraper'), form = $('hb-form'), canvas = $('hb-chart');
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) {
    $('hb-error').textContent = '이 브라우저에서는 그래프를 그릴 수 없습니다.';
    $('hb-chart-desc').textContent = 'Canvas 기능을 사용할 수 없습니다.';
    return;
  }
  const WIDTH = 1200, HEIGHT = 354;
  const keys = ['min', 'q1', 'median', 'q3', 'max'];
  const labels = ['최솟값', '제1사분위수', '중앙값', '제3사분위수', '최댓값'];
  const format = new Intl.NumberFormat('ko-KR', { useGrouping: false, maximumFractionDigits: 7 });
  const fmt = value => format.format(Object.is(value, -0) ? 0 : value);
  const name = () => $('hb-name').value.trim() || '자료', unit = () => $('hb-unit').value.trim();
  const completeButton = $('lesson-complete'), answer = $('lesson-answer');
  const protectedIds = new Set(['lesson-example', 'lesson-reset', 'lesson-complete']);
  const graphControls = Array.from(form.querySelectorAll('input, textarea, select, button'))
    .filter(control => !protectedIds.has(control.id));
  let summary = null, histogram = null, values = [], errorMessage = '', completed = false, hitBins = [];

  function buttonText(button, value) {
    const label = button.querySelector('.text');
    (label || button).textContent = value;
  }
  function setCompleted(value) {
    completed = value;
    graphControls.forEach(control => { control.disabled = value; });
    answer.disabled = value;
    completeButton.disabled = false;
    completeButton.setAttribute('aria-pressed', String(value));
    root.dataset.complete = String(value);
  }
  function editStarted() {
    if (completed) setCompleted(false);
    $('lesson-status').textContent = '';
  }
  function setExample(open) {
    const popup = $('answer-popup-01');
    popup.classList.toggle('d-none', !open);
    popup.classList.toggle('on', open);
    popup.setAttribute('aria-hidden', String(!open));
    $('lesson-example').setAttribute('aria-expanded', String(open));
    buttonText($('lesson-example'), open ? '닫기' : '예시');
  }
  function prepareCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
    const width = Math.max(1, Math.round((rect.width || WIDTH) * dpr));
    const height = Math.max(1, Math.round((rect.height || HEIGHT) * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0);
    ctx.textBaseline = 'alphabetic';
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.setLineDash([]);
    hitBins = [];
  }
  function font(size, bold) {
    ctx.font = size + 'px ' + (bold ? 'pre-sb' : 'pre-m') + ', "Malgun Gothic", sans-serif';
  }
  function text(x, y, value, options = {}) {
    font(options.size || 18, options.bold);
    ctx.textAlign = options.align || 'left';
    ctx.fillStyle = options.color || '#535764';
    ctx.fillText(String(value), x, y);
  }
  function line(x1, y1, x2, y2, color = '#a6a3af', width = 1) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  }
  function rectangle(x, y, width, height, fill, stroke, lineWidth) {
    ctx.fillStyle = fill; ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.strokeRect(x, y, width, height);
  }
  function table() {
    const row = document.createElement('tr'), heading = document.createElement('th');
    heading.scope = 'row'; heading.textContent = name(); row.append(heading);
    keys.forEach(key => {
      const cell = document.createElement('td'); cell.textContent = summary ? fmt(summary[key]) : '—';
      if (cell.textContent.length > 13) cell.className = 'bp-long-number';
      row.append(cell);
    });
    $('hb-summary').replaceChildren(row);
  }
  function render() {
    table(); prepareCanvas();
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-describedby', 'hb-chart-desc');
    canvas.title = '';
    if (!summary || !histogram) {
      canvas.setAttribute('aria-label', errorMessage ? '입력 오류' : '그래프 그리기 전');
      const message = errorMessage ? '입력값을 확인해 주세요.' : '‘그래프 그리기’를 누르면 히스토그램과 상자그림이 나타납니다.';
      $('hb-chart-desc').textContent = errorMessage || message;
      text(600, 180, message, { align: 'center', size: 23 });
      $('hb-count').textContent = '';
      return;
    }
    const bins = histogram.bins, left = 136, right = 1082, top = 48, base = 190;
    const lower = bins[0].start, upper = bins[bins.length - 1].end;
    // Exact half-micro units preserve equal bin widths near the supported magnitude limit.
    const units = value => Math.round(value * 2000000), lowerUnits = units(lower), spanUnits = units(upper) - lowerUnits;
    const x = value => left + (units(value) - lowerUnits) / spanUnits * (right - left);
    const peak = Math.max(...bins.map(bin => bin.count)), step = Math.max(1, Math.ceil(peak / 5));
    const ceiling = Math.ceil(peak / step) * step, y = value => base - value / ceiling * (base - top);
    canvas.setAttribute('aria-label', name() + ' — 히스토그램과 상자그림');
    $('hb-chart-desc').textContent = name() + (unit() ? ' (단위: ' + unit() + ')' : '') + ', 자료 ' + summary.n + '개. 계급의 크기 ' + fmt(histogram.width)
      + '. 각 계급은 시작값 이상, 끝값 미만. ' + bins.map(bin => fmt(bin.start) + ' 이상 ' + fmt(bin.end) + ' 미만 ' + bin.count + '개').join(', ')
      + '. ' + labels.map((label, i) => label + ' ' + fmt(summary[keys[i]])).join(', ') + '.';
    text(20, 28, '히스토그램', { bold: true, size: 23, color: '#232f5b' });
    text(1178, 27, '각 계급: 이상 ~ 미만', { align: 'right', size: 16, color: '#777484' });
    text(left - 65, 115, '도수', { align: 'center', size: 17 });
    for (let tick = 0; tick <= ceiling; tick += step) {
      line(left, y(tick), right, y(tick), tick ? '#e8edf3' : '#88909b');
      text(left - 12, y(tick) + 6, fmt(tick), { align: 'right', size: 17 });
    }
    bins.forEach(bin => {
      const start = x(bin.start), end = x(bin.end), barTop = y(bin.count);
      rectangle(start, barTop, end - start, base - barTop, '#c9e5ed', '#278eaa', 1.5);
      hitBins.push({ left: start, right: end, top: barTop, bottom: base,
        title: fmt(bin.start) + ' 이상 ' + fmt(bin.end) + ' 미만: ' + bin.count });
      if (bins.length <= 24 && bin.count) text((start + end) / 2, barTop - 7, bin.count, { align: 'center', color: '#237c94', size: 17 });
    });
    line(left, top - 5, left, base, '#88909b');
    const boundaries = bins.map(bin => bin.start).concat(upper), longest = Math.max(...boundaries.map(value => fmt(value).length));
    const labelStep = Math.max(1, Math.ceil(bins.length * Math.max(46, longest * 10 + 14) / (right - left)));
    boundaries.forEach((value, i) => {
      line(x(value), base, x(value), base + 6);
      if ((i % labelStep === 0 && i <= bins.length - labelStep) || i === bins.length) text(x(value), base + 26, fmt(value), { align: 'center', size: longest > 13 ? 14 : 18 });
    });
    if (unit()) text(1182, 234, '(단위: ' + unit() + ')', { align: 'right', size: 16 });
    line(20, 244, 1180, 244, '#e1e5ee');
    text(20, 284, '상자그림', { bold: true, size: 23, color: '#232f5b' });
    const cy = 276, half = 18, axis = 313, color = '#8a71b8';
    line(x(summary.min), cy, x(summary.max), cy, color, 3);
    rectangle(x(summary.q1), cy - half, Math.max(0, x(summary.q3) - x(summary.q1)), half * 2, '#ede6f8', color, 3);
    [summary.min, summary.max].forEach(value => line(x(value), cy - 13, x(value), cy + 13, color, 3));
    line(x(summary.median), cy - half, x(summary.median), cy + half, color, 4);
    line(left, axis, right, axis);
    const actuals = keys.map(key => x(summary[key])), positions = actuals.slice();
    const widths = keys.map(key => { font(fmt(summary[key]).length > 13 ? 16 : 22, true); return Math.max(28, ctx.measureText(fmt(summary[key])).width); });
    for (let i = 1; i < 5; i++) positions[i] = Math.max(positions[i], positions[i - 1] + (widths[i - 1] + widths[i]) / 2 + 10);
    if (positions[4] > right) {
      positions[4] = right;
      for (let i = 3; i >= 0; i--) positions[i] = Math.min(positions[i], positions[i + 1] - (widths[i] + widths[i + 1]) / 2 - 10);
    }
    const ideal = actuals.reduce((sum, actual, i) => sum + actual - positions[i], 0) / 5;
    const shift = Math.max(left - positions[0], Math.min(right - positions[4], ideal));
    keys.forEach((key, i) => {
      const px = positions[i] + shift;
      ctx.beginPath(); ctx.moveTo(actuals[i], cy + (i === 0 || i === 4 ? 15 : 20)); ctx.lineTo(actuals[i], axis); ctx.lineTo(px, 322);
      ctx.strokeStyle = '#aaa3b5'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
      text(px, 343, fmt(summary[key]), { align: 'center', color, bold: true, size: fmt(summary[key]).length > 13 ? 16 : 22 });
    });
    $('hb-count').textContent = '자료 ' + summary.n + '개';
  }
  function draw() {
    $('hb-error').textContent = '';
    root.querySelectorAll('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    let field = $('hb-data');
    try {
      const nextValues = window.BoxplotMath.parseData(field.value), nextSummary = window.BoxplotMath.summarize(nextValues);
      field = $('hb-width');
      const nextHistogram = window.HistogramMath.build(nextValues, $('hb-width').value, $('hb-start').value);
      values = nextValues; summary = nextSummary; histogram = nextHistogram; errorMessage = '';
      root.dataset.dirty = 'false'; render();
      $('hb-status').textContent = '히스토그램과 상자그림을 그렸습니다.';
      return true;
    } catch (error) {
      if (field.id === 'hb-width' && /시작/.test(error.message)) field = $('hb-start');
      field.setAttribute('aria-invalid', 'true'); values = []; summary = null; histogram = null; errorMessage = error.message;
      root.dataset.dirty = 'false'; $('hb-error').textContent = errorMessage; render();
      $('hb-status').textContent = '입력 오류'; field.focus();
      return false;
    }
  }
  function resetGraph() {
    setCompleted(false); form.reset();
    summary = null; histogram = null; values = []; errorMessage = '';
    root.dataset.dirty = 'false';
    root.querySelectorAll('[aria-invalid]').forEach(element => element.removeAttribute('aria-invalid'));
    $('hb-error').textContent = ''; $('lesson-status').textContent = '';
    render(); $('hb-status').textContent = '그래프 그리기 전';
  }
  function fit() {
    const width = document.documentElement.clientWidth, height = document.documentElement.clientHeight;
    const scale = Math.max(.01, Math.min(1, width / 1280, height / 720));
    root.style.transform = 'scale(' + scale + ')'; root.style.left = Math.max(0, (width - 1280 * scale) / 2) + 'px'; root.style.top = '0';
  }
  form.addEventListener('submit', event => { event.preventDefault(); editStarted(); draw(); });
  ['hb-data', 'hb-width', 'hb-start'].forEach(id => $(id).addEventListener('input', () => {
    editStarted(); root.dataset.dirty = 'true'; $('hb-error').textContent = '';
    $('hb-status').textContent = '입력값 변경. 그래프 그리기 버튼을 눌러 반영하세요.';
  }));
  ['hb-name', 'hb-unit'].forEach(id => $(id).addEventListener('input', () => { editStarted(); render(); }));
  answer.addEventListener('input', editStarted);
  $('hb-reset').addEventListener('click', resetGraph);
  $('hb-data').addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); editStarted(); draw(); }
  });
  $('lesson-example').addEventListener('click', () => setExample($('lesson-example').getAttribute('aria-expanded') !== 'true'));
  $('lesson-reset').addEventListener('click', () => {
    resetGraph(); answer.value = ''; answer.removeAttribute('aria-invalid'); setExample(false);
    $('lesson-status').textContent = '초기화했습니다.';
  });
  completeButton.addEventListener('click', () => {
    if (completed) { setCompleted(false); $('lesson-status').textContent = '완료 상태를 해제했습니다.'; return; }
    if (root.dataset.dirty === 'true' || !summary || !histogram) {
      $('lesson-status').textContent = '‘그래프 그리기’를 누른 뒤 완료해 주세요.'; return;
    }
    setCompleted(true); $('lesson-status').textContent = '활동을 완료했습니다.';
    root.dispatchEvent(new CustomEvent('aidt:activity-complete', { bubbles: true, detail: {
      activityId: 'LOCAL_STAT_HISTBOX_LESSON_am', answer: answer.value.trim(), values: values.slice(),
      width: histogram.width, start: histogram.start, summary: JSON.parse(JSON.stringify(summary))
    } }));
  });
  canvas.addEventListener('mousemove', event => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (event.clientX - rect.left) / rect.width * WIDTH, y = (event.clientY - rect.top) / rect.height * HEIGHT;
    const bin = hitBins.find(item => x >= item.left && x < item.right && y >= item.top && y <= item.bottom);
    canvas.title = bin ? bin.title : '';
  });
  canvas.addEventListener('mouseleave', () => { canvas.title = ''; });
  window.addEventListener('resize', () => { fit(); render(); });
  if (typeof window.ResizeObserver === 'function') new window.ResizeObserver(render).observe(canvas);
  if (document.fonts) {
    document.fonts.ready.then(render).catch(() => {});
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', render);
  }
  $('lesson-example').setAttribute('aria-controls', 'answer-popup-01');
  setExample(false); fit(); resetGraph();
}());

;
/* Reveal only after activity initialization and the required stylesheets are ready. */
(function () {
  'use strict';
  var root = document.getElementById('amt-viewer-wraper');
  var styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  function reveal() {
    if (!root || styles.length !== 3 || !styles.every(function (link) { return link.sheet !== null; })) return;
    root.classList.add('visible', 'page-ready');
    root.style.removeProperty('display');
  }
  // This block is last in the bundle: an initialization error prevents it from running.
  if (document.readyState === 'complete') reveal();
  else window.addEventListener('load', reveal, { once: true });
}());
