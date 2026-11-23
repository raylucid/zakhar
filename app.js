'use strict';
const KEY='versepath.v1';
const emptyMistakes = () => Object.create(null);
const initial=[
{id:'sample-1',ref:'고린도전서 6:19–20',text:'너희 몸은 너희가 하나님께로부터 받은 바 너희 가운데 계신 성령의 전인 줄을 알지 못하느냐 너희는 너희 자신의 것이 아니라\n값으로 산 것이 되었으니 그런즉 너희 몸으로 하나님께 영광을 돌리라',progress:0,mistakes:emptyMistakes()},
{id:'sample-2',ref:'디모데후서 2:22',text:'또한 너는 청년의 정욕을 피하고 주를 깨끗한 마음으로 부르는 자들과 함께 의와 믿음과 사랑과 화평을 따르라',progress:0,mistakes:emptyMistakes()}
];
function fresh() { return {learningVersion: 2, verses: structuredClone(initial), selected: 'sample-1'}; }

function normalize(saved) {
  if (!Array.isArray(saved?.verses) || saved.verses.length > 1000) throw Error('invalid verses');
  const seen = new Set();
  const verses = saved.verses.map(item => {
    if (typeof item?.id !== 'string' || !item.id || seen.has(item.id) ||
        typeof item.ref !== 'string' || !item.ref.trim() || item.ref.length > 120 ||
        typeof item.text !== 'string' || !item.text.trim() || item.text.length > 12000) throw Error('invalid verse');
    seen.add(item.id);
    const progress = Math.max(0, Math.min(saved.learningVersion === 2 ? 5 : 3, Math.trunc(Number(item.progress) || 0)));
    const mistakes = Object.assign(Object.create(null), item.mistakes && typeof item.mistakes === 'object' ? item.mistakes : {});
    const reviewOn = progress === 5 && /^\d{4}-\d{2}-\d{2}$/.test(item.reviewOn) ? item.reviewOn : null;
    return {id: item.id, ref: item.ref, text: item.text, progress: progress === 5 && !reviewOn ? 4 : progress, mistakes, reviewOn};
  });
  return {learningVersion: 2, verses, selected: seen.has(saved.selected) ? saved.selected : verses[0]?.id};
}

function load() {
  try { return normalize(JSON.parse(localStorage.getItem(KEY))); }
  catch { return fresh(); }
}

let data = load(), view = 'library', editId = null, quiz = null;
const $=s=>document.querySelector(s),root=$('#root');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){toast('저장 공간이 부족하거나 차단되어 있습니다')}}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600)}
function chosen(){return data.verses.find(v=>v.id===data.selected)||data.verses[0]}
function words(v){return v.text.match(/\S+|\n/g)||[]}
function candidates(v){return words(v).map((w,i)=>({w,i})).filter(x=>x.w!=='\n')}
function go(v){view=v;document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===v));render()}
function render(){if(view==='library')library();else if(view==='study')study();else settings()}
function library(){if(editId!==null){editor();return}const reviews = data.verses.filter(v => due(v));
root.innerHTML=`<h1>내 말씀 목록</h1><p class="muted intro">구절을 추가하고, 익숙해질수록 빈칸을 늘려 암송해 보세요.</p>${reviews.length ? `<section class="panel"><h2>오늘의 복습</h2><div class="row">${reviews.map(v => `<button class="btn primary" data-review="${esc(v.id)}">${esc(v.ref)} 복습</button>`).join('')}</div></section>` : ''}<div class="toolbar"><span class="muted">등록된 구절 <b>${data.verses.length}</b>개</span><button class="btn primary" id="add">+ 말씀 추가</button></div>${data.verses.length?`<section class="verse-grid">${data.verses.map(v=>`<article class="verse-card"><div class="row"><span class="pill">${v.progress === 5 ? '첫 학습 완료' : stageNames[v.progress]}</span></div><div class="ref">${esc(v.ref)}</div><div class="preview">${esc(v.text)}</div><div class="sub">단어 ${candidates(v).length}개</div><div class="actions"><button class="btn primary small" data-study="${esc(v.id)}"> ${v.progress === 0 ? '암송 시작' : v.progress === 5 ? '암송 다시 하기' : '이어서 암송'}</button><button class="btn small" data-edit="${esc(v.id)}">수정</button><button class="btn danger small" data-delete="${esc(v.id)}">말씀 삭제</button></div></article>`).join('')}</section>`:`<div class="empty"><h2>아직 등록된 말씀이 없습니다</h2><p class="muted">첫 번째 암송 구절을 추가해 주세요.</p></div>`}`;root.querySelectorAll('[data-review]').forEach(button => button.onclick = () => {
  data.selected = button.dataset.review;
  reviewing = true;
  resetAttempt();
  save();
  go('study');
});
$('#add').onclick=()=>{editId='new';render()};root.querySelectorAll('[data-study]').forEach(b=>b.onclick=()=>{data.selected=b.dataset.study;save();reviewing=false;resetAttempt();go('study')});root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editId=b.dataset.edit;render()});root.querySelectorAll('[data-delete]').forEach(button => button.onclick = () => {
  deleteVerse(data.verses.find(v => v.id === button.dataset.delete));
});
}

function deleteVerse(v) {
  if (!v || !confirm(`‘${v.ref}’ 말씀과 이 구절의 학습·복습 기록을 삭제하시겠습니까?`)) return;
  data.verses = data.verses.filter(item => item.id !== v.id);
  if (data.selected === v.id) data.selected = data.verses[0]?.id;
  editId = null;
  resetAttempt();
  save();
  render();
  $('#add').focus();
  toast('말씀을 삭제했습니다');
}

function lookupPassage(result) {
  const verses = Array.isArray(result) ? result : [result];
  if (!verses.length || verses.some(verse =>
    typeof verse?.reference !== 'string' || !verse.reference.trim() ||
    typeof verse.text !== 'string' || !verse.text.trim())) throw Error('invalid response');
  const first = verses[0].reference;
  const last = verses.at(-1).reference;
  const ref = verses.length === 1 ? first : first + '–' + last.split(':').at(-1);
  const text = verses.map(verse => verse.text).join('\n');
  if (ref.length > 120 || text.length > 12000) throw Error('response too long');
  return {ref, text};
}

function attachLookup(form) {
  const button = $('#lookup');
  const status = $('#lookup-status');
  if (!button || !status) return;
  const endpoint = document.querySelector('meta[name="logos-lookup-endpoint"]')?.content;
  if (!endpoint) return;
  button.disabled = false;
  status.textContent = '장절을 입력하고 본문을 불러오세요.';
  const refInput = form.elements.namedItem('ref');
  const textInput = form.elements.namedItem('text');
  button.onclick = async () => {
    const input = refInput.value.trim();
    if (!input) {
      status.textContent = '조회할 장절을 입력해 주세요.';
      refInput.focus();
      return;
    }
    const previousText = textInput.value;
    button.disabled = true;
    status.textContent = '개역개정 본문을 찾는 중입니다.';
    try {
      const url = new URL(endpoint);
      url.searchParams.set('ref', input.replace(/[–—]/gu, '-'));
      const response = await fetch(url, {signal: AbortSignal.timeout(10000)});
      if (!response.ok) {
        status.textContent = ({
          400: '책 이름, 장, 절을 확인해 주세요. 예: 요3:16-18',
          404: '해당 구절을 찾지 못했습니다.',
          429: '요청이 많습니다. 잠시 후 다시 조회해 주세요.'
        })[response.status] || '지금은 본문을 조회할 수 없습니다. 잠시 후 다시 시도해 주세요.';
        return;
      }
      const passage = lookupPassage(await response.json());
      if (!form.isConnected) return;
      if (refInput.value.trim() !== input || textInput.value !== previousText) {
        status.textContent = '입력 내용이 바뀌었습니다. 필요하면 다시 조회해 주세요.';
        return;
      }
      refInput.value = passage.ref;
      textInput.value = passage.text;
      status.textContent = '개역개정 · Logos API에서 불러왔습니다. 본문을 확인하고 저장하세요.';
    } catch {
      status.textContent = '본문을 불러오지 못했습니다. 다시 시도하거나 본문을 붙여넣어 주세요.';
    } finally {
      button.disabled = false;
    }
  };
}

function editor(){const v=data.verses.find(v=>v.id===editId);root.innerHTML=`<h1>${v?'말씀 수정':'새 말씀 추가'}</h1><p class="muted intro">성경 본문은 입력한 그대로 사용됩니다. 번역본을 확인하여 붙여 넣어 주세요.</p><form class="panel" id="editor"><label class="field">성경 장절<input name="ref" maxlength="120" required placeholder="예: 요한복음 15:5" value="${esc(v?.ref||'')}"></label>${v ? '' : '<button type="button" class="btn small" id="lookup" disabled>개역개정 본문 불러오기</button><p class="hint" id="lookup-status" role="status">자동 조회는 연결 준비 중입니다. 본문을 붙여넣어 추가할 수 있습니다.</p>'}<label class="field">말씀 본문<textarea name="text" required maxlength="12000" placeholder="성경 본문을 입력하세요">${esc(v?.text||'')}</textarea></label><p class="hint">공백 기준으로 단어가 분리되며, 빈 줄을 포함한 줄바꿈은 보존됩니다. 구절을 수정하면 암송 단계와 오답 및 복습 기록이 초기화됩니다.</p><div class="row end"><button type="button" class="btn" id="cancel">취소</button>${v ? '<button type="button" class="btn danger" id="delete-verse">말씀 삭제</button>' : ''}<button class="btn primary" type="submit">저장하기</button></div></form>`;$('#cancel').onclick=()=>{editId=null;render()};attachLookup($('#editor'));if (v) $('#delete-verse').onclick = () => deleteVerse(v);$('#editor').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target),ref=String(fd.get('ref')).trim(),text=String(fd.get('text')).trim();if(!ref||!text||!candidates({text}).length){toast('장절과 본문을 입력해 주세요');return}if(v){Object.assign(v,{ref,text,progress:0,mistakes:emptyMistakes(),reviewOn:null})}else{const nv={id:crypto.randomUUID?.()||'v'+Date.now(),ref,text,progress:0,mistakes:emptyMistakes()};data.verses.push(nv);data.selected=nv.id}save();editId=null;toast('말씀을 저장했습니다');render()}}
const stageNames = ['본문 읽기', '첫 빈칸', '빈칸 늘리기', '짧게 끊어 암송', '한 절 암송'];
let recall = null;
let reviewing = false;
let blankMode = 'choice';

function dateKey(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map(value => String(value).padStart(2, '0')).join('-');
}

function due(v, today = dateKey()) {
  return Boolean(v.reviewOn && v.reviewOn <= today);
}

function chunks(v) {
  return v.text.trim().split(/\n+|(?<=[.!?。！？])\s+/u).flatMap(line => {
    const tokens = line.trim().split(/\s+/u);
    const groups = [];
    for (let i = 0; i < tokens.length; i += 8) groups.push(tokens.slice(i, i + 8).join(' '));
    return groups;
  }).filter(Boolean);
}

function makeQuiz(v) {
  const pool = candidates(v);
  const count = Math.max(1, Math.round(pool.length * (v.progress === 1 ? .2 : .4)));
  const ranked = pool.map(({i, w}) => ({
    i, score: Math.random() * 2 + Math.min(5, Number(v.mistakes[w]) || 0) * 1.5
  })).sort((a, b) => b.score - a.score);
  return {id: v.id, level: v.progress, masked: ranked.slice(0, count).map(x => x.i).sort((a,b) => a-b), answers: {}, wrong: [], checked: false};
}

function resetAttempt() {
  quiz = null;
  recall = null;
}

function nextStage(v) {
  v.progress++;
  resetAttempt();
  save();
  render();
  $('#study-title').focus();
}

function study() {
  const v = chosen();
  if (!v) {
    root.innerHTML = '<div class="empty"><h2>암송할 말씀이 없습니다</h2><button class="btn primary" id="back">말씀 추가하기</button></div>';
    $('#back').onclick = () => { editId = 'new'; go('library'); };
    return;
  }

  const level = reviewing ? 4 : v.progress;
  const label = reviewing ? '복습 · 한 절 암송' : level === 5
    ? '첫 학습 완료' : `${level + 1} / 5단계 · ${stageNames[level]}`;
  root.innerHTML = `<div class="study-heading"><h1 id="study-title" tabindex="-1">구절 암송</h1>
    <select id="verse-select" aria-label="암송할 구절">${data.verses.map(item =>
      `<option value="${esc(item.id)}" ${item.id === v.id ? 'selected' : ''}>${esc(item.ref)}</option>`).join('')}</select>
    <p class="muted">${label}</p></div><div id="exercise"></div>
    ${!reviewing && level > 0 && level < 5 ? '<button class="btn small" id="prev">← 이전 단계</button>' : ''}
    ${reviewing ? '<button class="btn small" id="exit-review">← 말씀 목록</button>' : ''}`;
  $('#verse-select').onchange = e => {
    data.selected = e.target.value;
    reviewing = false;
    resetAttempt();
    save();
    render();
    $('#verse-select').focus();
  };
  if ($('#prev')) $('#prev').onclick = () => { v.progress--; resetAttempt(); save(); render(); $('#study-title').focus(); };
  if ($('#exit-review')) $('#exit-review').onclick = () => { reviewing = false; resetAttempt(); go('library'); };

  const exercise = $('#exercise');
  if (level === 0) {
    exercise.innerHTML = `<section class="study-area passage">${chunks(v).map(part => `<div>${esc(part)}</div>`).join('')}</section>
      <p>본문을 한 번 읽어 보세요.</p><button class="btn primary" id="advance">첫 빈칸 풀기 →</button>`;
    $('#advance').onclick = () => nextStage(v);
  } else if (level <= 2) {
    fillBlanks(v, exercise);
  } else if (level <= 4) {
    recite(v, exercise, level === 3);
  } else {
    exercise.innerHTML = `<section class="panel"><h2>${esc(v.ref)}</h2><p>${due(v) ? '오늘 복습할 말씀입니다.' : `다음 복습일 ${esc(v.reviewOn || dateKey(1))}`}</p>
      <button class="btn primary" id="practice">${due(v) ? '복습 시작' : '지금 다시 암송'}</button></section>`;
    $('#practice').onclick = () => { reviewing = true; resetAttempt(); render(); $('#study-title').focus(); };
  }
}

function fillBlanks(v, exercise) {
  if (!quiz || quiz.id !== v.id || quiz.level !== v.progress) quiz = makeQuiz(v);
  const all = words(v);
  const {masked, answers, wrong, checked} = quiz;
  const slots = new Map(masked.map((index, slot) => [index, slot]));
  const wrongSlots = new Set(wrong);
  const next = masked.find(i => answers[i] === undefined);
  const remaining = new Map();
  for (const i of masked) remaining.set(all[i], (remaining.get(all[i]) || 0) + 1);
  for (const value of Object.values(answers)) remaining.set(value, (remaining.get(value) || 0) - 1);
  const choices = [...remaining.keys()].filter(word => remaining.get(word) > 0)
    .sort((a,b) => a.localeCompare(b,'ko'));
  exercise.innerHTML = `<section class="study-area passage">${all.map((word,i) => {
    if (word === '\n') return '<br>';
    const slot = slots.get(i);
    if (slot === undefined) return esc(word);
    return `<button class="blank ${wrongSlots.has(i) ? 'wrong' : ''} ${i === next ? 'current-blank' : ''}" data-clear="${i}"
      aria-label="${slot + 1}번 빈칸${answers[i] === undefined ? '' : `, ${esc(answers[i])} 지우기`}"
      ${answers[i] === undefined ? 'disabled' : ''}>${esc(answers[i] ?? '······')}</button>`;
  }).join(' ')}</section><section class="panel">
    ${checked ? (wrong.length ? `<p role="status">틀린 빈칸 ${wrong.length}개를 다시 채워 보세요.</p>
      <details><summary>틀린 부분의 앞뒤 문맥 보기</summary>${wrong.map(i => `<p>${esc(all.slice(Math.max(0,i-2),i+3).join(' '))}</p>`).join('')}</details>` : '<p role="status">모두 맞혔습니다.</p>') : ''}
    ${checked && !wrong.length ? '<button class="btn primary" id="advance">다음 단계 →</button>' :
      `<h2>빈칸 순서대로 채우기</h2><div class="row">
        <button class="btn small" id="choice-mode" aria-pressed="${blankMode === 'choice'}">단어 선택</button>
        <button class="btn small" id="write-mode" aria-pressed="${blankMode === 'write'}">직접 입력</button></div>
      ${blankMode === 'choice' ? `<div class="choices">${choices.map(word => `<button class="choice" data-word="${esc(word)}">${esc(word)}</button>`).join('')}</div>` :
        `<form class="row recall-input" id="blank-input"><label for="answer-word">다음 빈칸의 단어</label>
          <input id="answer-word" autocomplete="off" ${next === undefined ? 'disabled' : 'required'}>
          <button class="btn" ${next === undefined ? 'disabled' : ''}>입력</button></form>`}
      <div class="row"><button class="btn" id="clear-all">답 지우기</button><button class="btn primary" id="check" ${next === undefined ? '' : 'disabled'}>정답 확인</button></div>`}
    </section>`;

  if ($('#advance')) $('#advance').onclick = () => nextStage(v);
  const focusEntry = () => (exercise.querySelector('#answer-word:enabled, [data-word]') || $('#check'))?.focus();
  const enter = word => {
    if (next === undefined || !word || /\s/u.test(word)) return;
    answers[next] = word;
    quiz.wrong = [];
    quiz.checked = false;
    fillBlanks(v, exercise);
    focusEntry();
  };
  if ($('#choice-mode')) $('#choice-mode').onclick = () => { blankMode = 'choice'; fillBlanks(v, exercise); focusEntry(); };
  if ($('#write-mode')) $('#write-mode').onclick = () => { blankMode = 'write'; fillBlanks(v, exercise); focusEntry(); };
  if ($('#blank-input')) {
    $('#blank-input').onsubmit = event => { event.preventDefault(); enter($('#answer-word').value.trim()); };
    $('#answer-word').onkeydown = event => {
      if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229)) event.preventDefault();
    };
  }
  exercise.querySelectorAll('[data-word]').forEach(button => button.onclick = () => enter(button.dataset.word));
  exercise.querySelectorAll('[data-clear]:enabled').forEach(button => button.onclick = () => {
    delete answers[button.dataset.clear];
    quiz.checked = false;
    quiz.wrong = [];
    fillBlanks(v, exercise);
    focusEntry();
  });
  if ($('#clear-all')) $('#clear-all').onclick = () => {
    quiz.answers = {};
    quiz.wrong = [];
    quiz.checked = false;
    fillBlanks(v, exercise);
    focusEntry();
  };
  if ($('#check')) $('#check').onclick = () => {
    quiz.wrong = masked.filter(i => answers[i]?.normalize('NFC') !== all[i].normalize('NFC'));
    for (const i of quiz.wrong) {
      v.mistakes[all[i]] = Math.min(10, (Number(v.mistakes[all[i]]) || 0) + 1);
      delete answers[i];
    }
    quiz.checked = true;
    save();
    fillBlanks(v, exercise);
    if ($('#advance')) $('#advance').focus();
    else focusEntry();
  };
}

function comparableRecall(text) {
  return text.normalize('NFC').replace(/[\p{P}\s]/gu, '');
}

function gradeRecall(answer, parts, index, partial) {
  const actual = comparableRecall(answer);
  const expected = comparableRecall(parts[index]);
  if (actual === expected) return 'exact';
  if (!partial || !expected) return 'different';

  // Match through an input word boundary, so 마음으로만 is not 마음으로.
  const words = answer.normalize('NFC').match(/[^\p{P}\s]+/gu) || [];
  const preceding = comparableRecall(parts.slice(0, index).join(' '));
  let prefix = '';
  for (const word of words) {
    prefix += word;
    if (prefix === expected || (preceding && prefix === preceding + expected)) return 'range';
    if (prefix.length > preceding.length + expected.length) break;
  }
  return 'different';
}

let recallMode = 'speak';
try {
  if (localStorage.getItem('versepath.recallMode') === 'type') recallMode = 'type';
} catch {}

function recite(v, exercise, partial) {
  const parts = chunks(v);
  recall ??= {index: 0, phase: partial ? 'read' : 'recall', hint: false, assisted: false, focus: false};
  const part = partial ? parts[recall.index] : v.text;
  const heading = partial ? `짧은 구절 ${recall.index + 1} / ${parts.length}` : v.ref;
  const typing = recallMode === 'type';
  const result = gradeRecall(recall.draft || '', partial ? parts : [part], partial ? recall.index : 0, partial);
  const typedCorrectly = typing && result !== 'different';
  const tokens = part.trim().split(/\s+/u);
  const boundary = partial ? `<p class="range-note">이번 범위 · ${tokens.length}어절${tokens.length > 1 ? `, <strong>‘${esc(tokens.at(-1))}’</strong>까지` : ''}</p>` : '';
  const feedback = {exact: '원문과 일치합니다.', range: '이번 범위는 맞았습니다. 범위 밖에 입력한 내용은 채점에서 제외했습니다.',
    different: partial ? '이번 범위의 원문과 다른 부분이 있습니다.' : '원문과 다른 부분이 있습니다.'};
  const modeControls = recall.phase === 'compare' ? '' : `<div class="row recall-mode" role="group" aria-label="암송 방식">
    <button class="btn small" id="speak-recall" aria-pressed="${!typing}">소리 내어 암송</button>
    <button class="btn small" id="type-recall" aria-pressed="${typing}">직접 입력</button></div>`;
  let controls;
  if (recall.phase === 'read') {
    controls = `<p class="recall-text">${esc(part)}</p><button class="btn primary" id="hide-text">${typing ? '가리고 입력하기' : '가리고 말하기'}</button>`;
  } else if (recall.phase === 'recall') {
    controls = `<p>${typing ? '기억나는 대로 본문을 입력해 보세요.' : '기억나는 대로 소리 내어 말해 보세요.'}</p>
      ${recall.hint ? `<p role="status">첫 단어 · ${esc(part.trim().split(/\s+/u)[0])}</p>` : '<button class="btn" id="hint">첫 단어 힌트</button>'}
      ${typing ? `<form id="recall-form" class="field"><label for="recall-answer">암송 답안</label>
        <textarea id="recall-answer" required autocomplete="off" spellcheck="false">${esc(recall.draft || '')}</textarea>
        <p class="hint">채점할 때 띄어쓰기와 문장 부호는 제외합니다.</p>
        <button class="btn primary" type="submit">답안 확인</button></form>` :
        '<button class="btn primary" id="reveal">원문과 대조하기</button>'}`;
  } else {
    controls = `<p class="recall-text">${esc(part)}</p>${typing ? `<p role="status">${feedback[result]}</p>
      <h3>내 답안</h3><p class="recall-text">${esc(recall.draft)}</p>` : '<p>방금 말한 내용과 원문을 비교해 보세요.</p>'}
      <div class="row"><button class="btn" id="again">${typing ? '가리고 다시 입력하기' : '가리고 다시 말하기'}</button>
      ${!partial && !recall.assisted ? '<button class="btn" id="practice-parts">짧은 구절 다시 연습</button>' : ''}
      ${!typing || typedCorrectly ? `<button class="btn primary" id="recalled">${recall.assisted ? '힌트 없이 다시 시도' : typing ? '계속' : '스스로 정확히 말했어요'}</button>` : ''}</div>`;
  }
  exercise.innerHTML = `<section class="panel"><h2 id="recall-title" tabindex="-1">${esc(heading)}</h2>${boundary}${modeControls}${controls}</section>`;
  if (recall.focus) $('#recall-title').focus();
  recall.focus = true;
  const redraw = phase => { recall.phase = phase; recite(v, exercise, partial); };
  const again = () => {
    recall.hint = false;
    recall.assisted = false;
    recall.draft = '';
    redraw('recall');
    $('#recall-answer')?.focus();
  };
  const setMode = mode => {
    recallMode = mode;
    try { localStorage.setItem('versepath.recallMode', mode); } catch {}
    redraw(recall.phase);
    $(mode === 'type' ? '#type-recall' : '#speak-recall').focus();
  };
  if ($('#type-recall')) $('#type-recall').onclick = () => setMode('type');
  if ($('#speak-recall')) $('#speak-recall').onclick = () => setMode('speak');
  if ($('#recall-answer')) $('#recall-answer').oninput = e => { recall.draft = e.target.value; };
  if ($('#recall-form')) $('#recall-form').onsubmit = e => {
    e.preventDefault();
    recall.draft = $('#recall-answer').value.trim();
    if (recall.draft) redraw('compare');
  };
  if ($('#hide-text')) $('#hide-text').onclick = again;
  if ($('#again')) $('#again').onclick = again;
  if ($('#hint')) $('#hint').onclick = () => { recall.hint = true; recall.assisted = true; redraw('recall'); };
  if ($('#reveal')) $('#reveal').onclick = () => redraw('compare');
  if ($('#practice-parts')) $('#practice-parts').onclick = () => {
    resetAttempt();
    if (reviewing) {
      recite(v, exercise, true);
    } else {
      v.progress = 3;
      save();
      render();
      $('#study-title').focus();
    }
  };
  if ($('#recalled')) $('#recalled').onclick = () => {
    if (recall.assisted) { again(); return; }
    if (partial && recall.index + 1 < parts.length) {
      recall.index++;
      redraw('read');
    } else if (partial) {
      if (reviewing) { recall = null; recite(v, exercise, false); }
      else nextStage(v);
    } else {
      v.progress = 5;
      // A same-day practice keeps the review that was already scheduled.
      if (!v.reviewOn || due(v)) v.reviewOn = dateKey(1);
      reviewing = false;
      resetAttempt();
      save();
      render();
      $('#study-title').focus();
    }
  };
}
function settings(){root.innerHTML=`<h1>설정 및 백업</h1><p class="muted intro">학습 데이터는 현재 브라우저에만 저장됩니다. 기기를 바꾸기 전에 백업 파일을 보관해 주세요.</p><section class="panel"><h2>데이터 보관</h2><p class="muted">말씀 ${data.verses.length}개와 단계별 기록을 JSON 파일로 내보내고 다시 가져올 수 있습니다.</p><div class="setting-actions"><button class="btn primary" id="export">백업 내려받기</button><label class="btn" for="import" style="cursor:pointer">백업 불러오기</label><input id="import" type="file" accept=".json,application/json" hidden></div><div class="divider"></div><button class="btn danger" id="reset">모든 데이터 초기화</button></section><section class="panel"><h2>사용 안내</h2><p class="muted">말씀 목록에서 구절을 추가하고 암송 학습 탭에서 학습합니다. 빈칸 연습 후 말하거나 직접 입력해 암송하고, 다음 날 말씀 목록에서 복습합니다. 학습은 브라우저에서 실행되고 별도의 계정이나 서버가 필요하지 않습니다.</p><p class="hint">브라우저의 사이트 데이터 삭제, 시크릿 모드 또는 다른 기기에서는 기록이 유지되지 않을 수 있습니다. 저작권이 있는 번역본은 공개 저장소에 대량 수록하지 마세요.</p></section>`;$('#export').onclick=()=>{const blob=new Blob([JSON.stringify({format:'versepath',version:1,exportedAt:new Date().toISOString(),data},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='versepath-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};$('#import').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;e.target.value='';if(file.size>2_000_000){toast('백업 파일이 너무 큽니다');return}try{const p=JSON.parse(await file.text());if(p.format!=='versepath'||!Array.isArray(p.data?.verses))throw Error('invalid');const restored = normalize(p.data);if(!confirm('현재 데이터를 백업 파일로 교체하시겠습니까?'))return;data=restored;resetAttempt();reviewing=false;save();toast('백업을 가져왔습니다');render()}catch(err){toast('올바른 백업 파일이 아닙니다')}};$('#reset').onclick=()=>{if(confirm('모든 말씀과 학습 기록을 초기화하시겠습니까?')){data=fresh();resetAttempt();reviewing=false;save();render()}}}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{editId=null;resetAttempt();reviewing=false;go(b.dataset.view)});if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));render();
