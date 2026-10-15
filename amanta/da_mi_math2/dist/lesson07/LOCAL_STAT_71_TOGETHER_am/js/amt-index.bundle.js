/* Activity bundle. This is not the original vendor SDK runtime. */
/* boxplot-math.js */
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
/* boxplot.js */
/* 업체 콘텐츠 구조 위에서 동작하는 한 화면 상자그림 모듈. 외부 통신 없음. */
(function () {
  'use strict';
  const $=id=>document.getElementById(id);
  const root=$('amt-viewer-wraper'), math=window.BoxplotMath;
  const labels=['최솟값','제1사분위수','중앙값','제3사분위수','최댓값'];
  const keys=['min','q1','median','q3','max'];
  const colors=['#8a71b8','#278eaa'], fills=['#ede6f8','#e3f2f6'];
  const defaults=['a','b'].map(group=>$(`bp-data-${group}`).defaultValue);
  const nameDefaults=['a','b'].map(group=>$(`bp-name-${group}`).defaultValue);
  const fiveDefaults=['a','b'].map(group=>keys.map(key=>$(`bp-five-${group}-${key}`).defaultValue));
  const formatter=new Intl.NumberFormat('ko-KR',{useGrouping:false,maximumFractionDigits:7});
  const fmt=n=>formatter.format(Object.is(n,-0)?0:n);
  let mode=root.dataset.defaultMode==='five'?'five':'data', summaries=[], dirty=false, inputError=null;
  function datasetName(index){return $(`bp-name-${index?'b':'a'}`).value.trim()||`자료 ${index?'B':'A'}`;}
  function syncNames(){
    ['a','b'].forEach((group,index)=>{
      const name=datasetName(index);
      $(`bp-data-${group}`).setAttribute('aria-label',`${name} 자료 입력`);
      keys.forEach((key,i)=>$(`bp-five-${group}-${key}`).setAttribute('aria-label',`${name} ${labels[i]}`));
    });
    if(inputError)$('bp-error').textContent=`${datasetName(inputError.index)}: ${inputError.message}`;
  }
  function putName(group,value){
    const text=Array.from(String(value??'')).slice(0,12).join('');
    [`bp-name-${group}`,`bp-five-name-${group}`].forEach(id=>{if($(id).value!==text)$(id).value=text;});
  }
  function element(tag,attributes,text) {
    const el=document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.entries(attributes||{}).forEach(([k,v])=>el.setAttribute(k,String(v)));
    if(text!==undefined)el.textContent=text;
    return el;
  }
  function clearChart(message) {
    renderSummary();
    const height=mode==='five'?336:218;
    $('bp-chart').setAttribute('viewBox',`0 0 1150 ${height}`);
    $('bp-chart').replaceChildren(element('title',{id:'bp-chart-title'},'상자그림'),element('desc',{id:'bp-chart-desc'},message));
    $('bp-chart').append(element('text',{x:575,y:height/2+8,'text-anchor':'middle',fill:'#777484','font-family':'pre-m, sans-serif','font-size':23},message));
  }
  function renderSummary() {
    const body=$('bp-summary-body');
    body.replaceChildren();body.style.opacity=dirty&&summaries.length?'.4':'1';
    ['a','b'].forEach((group,index)=>{
      const row=document.createElement('tr');row.dataset.series=group;
      const name=document.createElement('th');name.scope='row';name.textContent=datasetName(index);row.append(name);
      keys.forEach(key=>{
        const cell=document.createElement('td');cell.textContent=summaries[index]?fmt(summaries[index][key]):'—';
        if(cell.textContent.length>13)cell.className='bp-long-number';
        row.append(cell);
      });
      body.append(row);
    });
  }
  function renderChart() {
    renderSummary();
    if(!summaries.length)return;
    const chart=$('bp-chart'),spacious=mode==='five';
    const domain=math.axisDomain(Math.min(...summaries.map(s=>s.min)),Math.max(...summaries.map(s=>s.max)));
    const left=176,right=1058;
    const x=value=>left+(value-domain.min)/(domain.max-domain.min)*(right-left);
    chart.setAttribute('viewBox',`0 0 1150 ${spacious?336:218}`);
    const description=summaries.map((s,i)=>`${datasetName(i)}: ${labels.map((l,j)=>l+' '+fmt(s[keys[j]])).join(', ')}.`).join(' ');
    chart.replaceChildren(element('title',{id:'bp-chart-title'},'상자그림'),element('desc',{id:'bp-chart-desc'},description));
    summaries.forEach((s,index)=>{
      const base=index*(spacious?166:110),cy=base+(spacious?40:29),half=spacious?22:16,axisY=base+(spacious?82:57),cap=spacious?16:13;
      const top=cy-half,bottom=cy+half,color=colors[index];
      const group=element('g',{'aria-hidden':'true'});
      const nameCharacters=Array.from(datasetName(index));
      const nameLines=nameCharacters.length>6?[nameCharacters.slice(0,6).join(''),nameCharacters.slice(6).join('')]:[nameCharacters.join('')];
      const nameText=element('text',{'data-series-name':index?'b':'a',x:20,fill:color,'font-family':'pre-sb, sans-serif','font-size':21});
      nameLines.forEach((line,i)=>nameText.append(element('tspan',{x:20,y:cy+7-(nameLines.length-1)*12+i*24},line)));
      group.append(nameText);
      group.append(element('line',{x1:x(s.min),x2:x(s.max),y1:cy,y2:cy,stroke:color,'stroke-width':3}));
      group.append(element('rect',{x:x(s.q1),y:top,width:Math.max(0,x(s.q3)-x(s.q1)),height:half*2,fill:fills[index],stroke:color,'stroke-width':3}));
      [s.min,s.max].forEach(value=>group.append(element('line',{x1:x(value),x2:x(value),y1:cy-cap,y2:cy+cap,stroke:color,'stroke-width':3})));
      group.append(element('line',{x1:x(s.median),x2:x(s.median),y1:top,y2:bottom,stroke:color,'stroke-width':4.5}));
      {
        const actuals=keys.map(k=>x(s[k])),positions=actuals.slice();
        const widths=keys.map(k=>Math.max(28,fmt(s[k]).length*(fmt(s[k]).length>13?10:13)));
        // Move only labels when necessary; the plot and vertical guides keep the common scale.
        for(let i=1;i<5;i++)positions[i]=Math.max(positions[i],positions[i-1]+(widths[i-1]+widths[i])/2+10);
        if(positions[4]>right){
          positions[4]=right;
          for(let i=3;i>=0;i--)positions[i]=Math.min(positions[i],positions[i+1]-(widths[i]+widths[i+1])/2-10);
        }
        const idealShift=actuals.reduce((sum,actual,i)=>sum+actual-positions[i],0)/5;
        const shift=Math.max(left-positions[0],Math.min(right-positions[4],idealShift));
        positions.forEach((value,i)=>positions[i]=value+shift);
        group.append(element('line',{'data-axis':'baseline',x1:left-18,x2:right+33,y1:axisY,y2:axisY,stroke:'#a6a3af','stroke-width':1.2}));
        keys.forEach((key,i)=>{
          const px=positions[i],actual=actuals[i],startY=(i===0||i===4)?cy+cap:bottom;
          const valueY=base+(spacious?123:92);
          group.append(element('path',{'data-guide':key,d:`M ${actual} ${startY+2} V ${axisY+5} L ${px} ${valueY-23}`,stroke:'#aaa3b5','stroke-width':1.2,'stroke-dasharray':'3 3',fill:'none'}));
          group.append(element('text',{'data-value':key,x:px,y:valueY,'text-anchor':'middle',fill:color,'font-family':'pre-sb, sans-serif','font-size':fmt(s[key]).length>13?17:23},fmt(s[key])));
        });
      }
      chart.append(group);
    });
  }
  function fiveInput(group){return keys.map(key=>$(`bp-five-${group}-${key}`).value);}
  function state(){return {version:3,mode,nameA:datasetName(0),nameB:datasetName(1),dataA:$('bp-data-a').value,dataB:$('bp-data-b').value,fiveA:fiveInput('a'),fiveB:fiveInput('b'),compare:true,showValues:true,dirty,summaries:JSON.parse(JSON.stringify(summaries))};}
  function notify(){root.dispatchEvent(new CustomEvent('aidt:boxplot-change',{bubbles:true,detail:state()}));}
  function draw(){
    $('bp-error').textContent='';inputError=null;
    root.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
    const next=[],groups=['a','b'];
    for(const group of groups){
      try{next.push(mode==='data'?math.summarize(math.parseData($(`bp-data-${group}`).value)):math.parseFiveNumber(fiveInput(group)));}
      catch(error){
        const fields=mode==='data'?[$(`bp-data-${group}`)]:keys.map(key=>$(`bp-five-${group}-${key}`));
        fields.forEach(field=>field.setAttribute('aria-invalid','true'));
        inputError={index:group==='a'?0:1,message:error.message};syncNames();
        summaries=[];dirty=true;$('bp-chart').style.opacity='1';clearChart('입력값을 확인해 주세요.');
        $('bp-status').textContent='입력 오류';fields.find(field=>!field.value.trim())?.focus();notify();return false;
      }
    }
    summaries=next;dirty=false;$('bp-chart').style.opacity='1';renderChart();
    $('bp-status').textContent='상자그림을 그렸습니다.';notify();return true;
  }
  function markDirty(){dirty=true;inputError=null;$('bp-error').textContent='';$('bp-chart').style.opacity='.4';$('bp-summary-body').style.opacity='.4';$('bp-status').textContent='입력값 변경. 그리기 버튼을 눌러 반영하세요.';notify();}
  function clearResult(){
    summaries=[];dirty=false;inputError=null;$('bp-error').textContent='';
    root.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
    $('bp-chart').style.opacity='1';
    clearChart('‘상자그림 그리기’를 누르면 그래프가 나타납니다.');
    $('bp-status').textContent='그래프 그리기 전';notify();
  }
  function setMode(nextMode){
    mode=nextMode==='five'?'five':'data';
    const isData=mode==='data';
    root.dataset.mode=mode;$('table-cont-01').hidden=!isData;
    $('bp-raw-panel').hidden=!isData;$('bp-five-panel').hidden=isData;
    $('bp-input-heading').textContent=isData?'자료 입력':'다섯 수 입력';
    ['data','five'].forEach(value=>{const button=$(`bp-mode-${value}`);button.setAttribute('aria-selected',String(value===mode));button.tabIndex=value===mode?0:-1;});
    clearResult();
  }
  function reset(){
    ['a','b'].forEach((group,i)=>putName(group,nameDefaults[i]));syncNames();
    if(mode==='data'){$('bp-data-a').value=defaults[0];$('bp-data-b').value=defaults[1];}
    else ['a','b'].forEach((group,i)=>keys.forEach((key,j)=>$(`bp-five-${group}-${key}`).value=fiveDefaults[i][j]));
    clearResult();
  }
  function fit(){
    const width=document.documentElement.clientWidth,height=document.documentElement.clientHeight;
    const scale=Math.max(.01,Math.min(1,width/1280,height/720));
    root.style.transform=`scale(${scale})`;root.style.left=`${Math.max(0,(width-1280*scale)/2)}px`;root.style.top='0';
  }
  $('bp-form').addEventListener('submit',event=>{event.preventDefault();draw();});
  root.querySelectorAll('.bp-input-panel input:not(.bp-name-input)').forEach(input=>input.addEventListener('input',markDirty));
  ['a','b'].forEach(group=>[ `bp-name-${group}`,`bp-five-name-${group}`].forEach(id=>{
    $(id).addEventListener('input',()=>{putName(group,$(id).value);syncNames();renderChart();notify();});
  }));
  ['data','five'].forEach(value=>{
    const tab=$(`bp-mode-${value}`);
    tab.addEventListener('click',()=>setMode(value));
    tab.addEventListener('keydown',event=>{
      if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
        event.preventDefault();const next=event.key==='Home'?'data':event.key==='End'?'five':mode==='data'?'five':'data';
        setMode(next);$(`bp-mode-${next}`).focus();
      }
    });
  });
  $('bp-reset').addEventListener('click',reset);
  window.addEventListener('resize',fit);
  window.AIDTBoxplot=Object.freeze({getState:state,draw,reset,setMode,setNames(nameA,nameB){
    if(nameA!==undefined)putName('a',nameA);if(nameB!==undefined)putName('b',nameB);
    syncNames();renderChart();notify();
  },setData(dataA,dataB){
    $('bp-data-a').value=Array.isArray(dataA)?dataA.join(', '):String(dataA??'');
    if(dataB!==undefined&&dataB!==null)$('bp-data-b').value=Array.isArray(dataB)?dataB.join(', '):String(dataB);
    setMode('data');return !dirty;
  },setFiveNumbers(valuesA,valuesB){
    const put=(values,group)=>keys.forEach((key,i)=>$(`bp-five-${group}-${key}`).value=Array.isArray(values)?String(values[i]??''):'');
    put(valuesA,'a');if(valuesB!==undefined&&valuesB!==null)put(valuesB,'b');setMode('five');return !dirty;
  }});
  syncNames();fit();setMode(mode);
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
