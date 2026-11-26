"use strict";

const el = id => document.getElementById(id);
const pets = petSpecies;
const levels = ["한 자리 더하기·빼기", "올림·내림 첫걸음", "두 자리 올림·내림", "숨은 수 X 찾기", "두 자리 혼합 연산"];
const file = readSave();
const boxButtons = new Map();
let screen = file.stage ? "play" : file.result?.view === "care" ? "care" : file.result ? "result" : "home";
let lastSave = 0;
let playable = Boolean(window.Phaser);
let adminMode = Boolean(file.stage?.admin || file.result?.admin);
let selectedLevel = file.stage?.level ?? file.result?.level ?? file.growthStage;
const flourNotice = "오늘 밀가루가 소진되었습니다. 내일 다시 만나요.";
const cheerfulLines = ["꼬옥 안아 줄래? ♡", "네 옆이 제일 좋아! ♡", "우리 다음에도 꼭 같이 놀자! ♡"];
const quietLines = ["나 혼자 있고 싶어.", "나 심심해. 장난감으로 같이 놀면 좋겠어.", "나 배고파. 간식 줄래?"];

function canStartToday() {
  return adminMode || file.day.flour > 0;
}

function speak(message, tone = "") {
  const feedback = el("feedback");
  feedback.dataset.tone = tone;
  if (feedback.textContent !== message) feedback.textContent = message;
}

function petChatter(message, cheerful, quiet = "") {
  const lines = file.mood >= rules.mood.cheerful ? [cheerful, ...cheerfulLines] :
    file.mood <= rules.mood.quiet ? [quiet, ...quietLines] : [message];
  const current = el("feedback").textContent;
  const fresh = lines.filter(line => line && line !== current);
  speak(fresh.length ? fresh[randomInt(0, fresh.length - 1)] : lines[0]);
}

function error(message) {
  el("error").textContent = message;
  el("error").hidden = false;
}

function persist() {
  if (writeSave(file)) return true;
  error("기록을 저장할 수 없어요. 브라우저의 사이트 저장 설정을 확인해 주세요.");
  return false;
}

function button(label, action, className = "secondary") {
  const control = document.createElement("button");
  control.type = "button";
  control.className = className;
  control.textContent = label;
  control.addEventListener("click", action);
  return control;
}

function petMood() {
  return file.mood >= rules.mood.cheerful ? "happy" : file.mood <= rules.mood.quiet ? "sad" : "neutral";
}

function renderPet() {
  const pet = el("pet");
  const area = el("petArea");
  area.hidden = screen === "result" || !pets[file.pet];
  const growth = file.growthStage;
  const target = rules.growthTargets[growth - 1];
  el("petGrowth").textContent = `성장 ${growth}단계`;
  el("petHp").textContent = target === undefined ? `경험치 ${file.hp} · 최고 단계` : `경험치 ${file.hp} / ${target}`;
  el("petHpBar").max = target ?? file.hp;
  el("petHpBar").value = file.hp;
  el("moodLabel").textContent = `기분 ${file.mood} / ${rules.mood.max}`;
  el("petMood").max = rules.mood.max;
  el("petMood").value = file.mood;
  el("petCookies").textContent = `🍪 쿠키 ${file.cookies}`;
  if (!pets[file.pet]) {
    pet.replaceChildren();
    pet.hidden = true;
    return;
  }
  const { name } = pets[file.pet];
  el("petName").textContent = file.petName || name;
  const resting = screen !== "play" && !canStartToday() && file.day.stages >= rules.dailyFlour;
  const cheerful = file.mood >= rules.mood.cheerful;
  const quiet = file.mood <= rules.mood.quiet;
  pet.hidden = false;
  pet.setAttribute("aria-label", `${file.petName || name} 성장 ${growth}단계${cheerful ? " 웃는 표정" : quiet ? " 토라진 표정" : ""}`);
  if (screen !== "result") petView.show(pet, file.pet, growth, petMood(), resting);
}

function refreshDay() {
  // 진행 중인 스테이지는 시작한 도전일에 계산하고 결과 확인 후 재충전한다.
  if (!playable || screen !== "home" || file.day.key === dayKey()) return;
  file.day = newDay();
  persist();
  render();
}

function renderHome() {
  el("pets").replaceChildren();
  const chosen = Boolean(pets[file.pet]);
  if (!chosen) {
    for (const [id, { name, legacy }] of Object.entries(pets)) {
      if (legacy) continue;
      const control = button(name, () => {
        file.pet = id;
        persist();
        render();
        el("petNameInput").focus();
      });
      control.prepend(petView.portrait(id, 1));
      el("pets").append(control);
    }
  }
  const named = chosen && Boolean(file.petName);
  el("petNameForm").hidden = !chosen || named;
  el("levelPicker").hidden = !named;
  el("start").hidden = !named;
  el("start").disabled = !playable || !canStartToday();
  el("homeFlourNotice").hidden = canStartToday();
  el("homeFlourNotice").textContent = flourNotice;
  el("adminForm").hidden = adminMode;
  el("adminOff").hidden = !adminMode;
  el("adminPanel").querySelector("summary").textContent = adminMode ? "관리자 모드 켜짐" : "관리자 모드";
  if (!chosen) return;
  el("homeNote").textContent = named ? `내 펫 · ${file.petName}` : "함께 모험할 펫의 이름을 지어 주세요.";
  if (!named) return;
  if (canStartToday()) petChatter("안녕! 나랑 수학 상자를 풀어 볼래?", "헤헤, 또 만나서 좋아! 나랑 같이 놀자! ♡", "흥…");
  else petChatter("오늘도 수고했어! 우리 내일 또 만나.", "내일도 꼭 만나자! 기다릴게! ♡", "…");
  if (!adminMode) selectedLevel = file.growthStage;
  const picker = el("levels");
  picker.replaceChildren(...levels.map((label, index) => {
    const level = index + 1;
    const locked = !adminMode && level !== file.growthStage;
    const control = button(`레벨 ${level} · ${label}`, () => {
      selectedLevel = level;
      for (const entry of picker.children) entry.setAttribute("aria-pressed", String(entry === control));
    });
    control.disabled = locked || !playable;
    control.setAttribute("aria-pressed", String(level === selectedLevel));
    return control;
  }));
}

function render() {
  el("home").hidden = screen !== "home";
  el("play").hidden = screen !== "play";
  el("result").hidden = screen !== "result";
  const world = document.querySelector(".world");
  world.classList.toggle("has-pet", Boolean(pets[file.pet]));
  world.dataset.screen = screen;
  el("careTitle").hidden = screen !== "care";
  el("careDone").hidden = screen !== "care";
  el("careFlourNotice").hidden = screen !== "care" || canStartToday();
  el("careFlourNotice").textContent = flourNotice;
  el("boxes").hidden = screen !== "play";
  el("items").hidden = screen !== "play";
  if (screen !== "play") el("itemStatus").hidden = true;
  el("cookies").textContent = file.cookies;
  el("flour").textContent = adminMode ? "∞" : `${file.day.flour} / ${rules.dailyFlour}`;
  renderPet();
  renderCare();
  if (screen === "home") renderHome();
  if (screen === "play") renderPlay();
  if (screen === "result") renderResult();
}

function renderCare() {
  const area = el("petCare");
  area.replaceChildren();
  area.hidden = screen !== "care";
  if (area.hidden) return;
  const heading = document.createElement("h3");
  heading.textContent = "아이템 Shop";
  area.append(heading);
  for (const care of Object.values(rules.care)) {
    const purchase = button("", () => {
      if (!playable || !buyCare(file, care)) return;
      persist();
      render();
      petChatter(care.reaction, `${care.reaction} 꼬옥 안아 줄래? ♡`, "…고마워.");
      petView.play(care.animation);
    });
    const icon = document.createElement("span");
    icon.className = "shop-icon";
    icon.textContent = care.icon;
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", care.label);
    const price = document.createElement("span");
    price.textContent = `쿠키 ${care.cost}개 필요`;
    const mood = document.createElement("strong");
    mood.textContent = `기분 +${care.mood}`;
    purchase.append(icon, price, mood);
    purchase.disabled = !playable || file.cookies < care.cost || file.mood >= rules.mood.max;
    area.append(purchase);
  }
}

function renderChoices() {
  const stage = file.stage;
  const selected = stage.selected;
  const box = stage.boxes.find(candidate => candidate.id === selected?.id);
  el("problem").textContent = box ? questionLabel(box) : "상자를 눌러 문제를 풀어요.";
  renderBlockHint(box);
  el("choices").replaceChildren(...(selected?.choices ?? []).map(value =>
    button(String(value), () => {
      if (file.stage?.selected === selected) answer(box, value);
    }, "balloon")));
}

function renderBlockHint(box) {
  const area = el("blockHint");
  area.closest(".answer-tray").classList.toggle("has-hint-space", hintsEnabled(file));
  const hint = box && hintsEnabled(file) ? regroupingHint(box) : null;
  area.hidden = !hint;
  area.replaceChildren();
  if (!hint) return;

  for (const [label, number] of [["", hint.left], [hint.op, hint.right]]) {
    const row = document.createElement("div");
    row.className = "block-row";
    const value = document.createElement("b");
    value.textContent = `${label} ${number}`.trim();
    const pieces = document.createElement("span");
    pieces.className = "block-pieces";
    const tens = Math.floor(number / 10);
    const ones = number % 10;
    pieces.setAttribute("aria-label", `십의 묶음 ${tens}개, 낱개 ${ones}개`);
    pieces.setAttribute("role", "img");
    for (const [kind, count] of [["ten", tens], ["one", ones]]) {
      for (let index = 0; index < count; index++) {
        const piece = document.createElement("span");
        piece.className = kind;
        pieces.append(piece);
      }
    }
    row.append(value, pieces);
    area.append(row);
  }
}

function renderPlay(updateChoices = true) {
  const stage = file.stage;
  el("progress").textContent = `레벨 ${stage.level} · ${stage.resolved} / ${rules.problems} · 🍪 ${stage.earned}`;
  el("items").replaceChildren(...Object.entries(rules.items)
    .filter(([id]) => stage.admin || file.items[id] > 0)
    .map(([id, item]) => {
      const control = button(`${item.label} ${stage.admin ? "∞" : `×${file.items[id]}`}`, () => useItem(id));
      control.disabled = Boolean(stage.timedEffect);
      return control;
    }));
  renderItemStatus(stage);
  if (updateChoices) renderChoices();
}

function renderItemStatus(stage) {
  const status = el("itemStatus");
  const effect = stage.timedEffect;
  status.hidden = !effect;
  if (!effect) return;
  const remaining = effect.id === "slow" ? "적용 중" : `${Math.ceil((effect.until - stage.elapsed) / 1000)}초 남음`;
  const label = `${rules.items[effect.id].label} · ${remaining}`;
  if (status.textContent !== label) status.textContent = label;
}

function selectBox(box) {
  const stage = file.stage;
  if (!playable || !stage || !stage.boxes.includes(box)) return;
  if (stage.selected) {
    if (stage.selected.id !== box.id) return;
    stage.selected = null;
    petChatter("다른 상자를 골라도 돼!", "다른 상자도 같이 풀어 보자! ♡");
    renderChoices();
    persist();
    return;
  }
  const intermediate = stage.mode === "intermediate";
  const count = rules.options[stage.mode];
  stage.selected = { id: box.id, until: stage.elapsed + rules.pauseMs, choices: makeChoices(box.answer, count, intermediate) };
  petChatter("정답 풍선을 골라 봐!", "우리 같이 정답 풍선을 찾아보자! ♡");
  renderChoices();
  persist();
}

function useItem(id) {
  const stage = file.stage;
  if (!playable || !stage || !Object.hasOwn(rules.items, id) || (!stage.admin && !file.items[id]) ||
      stage.timedEffect || (id === "slow" && !stage.boxes.length)) return;
  if (!stage.admin) file.items[id]--;
  stage.timedEffect = id === "slow"
    ? { id, targets: stage.boxes.map(box => box.id) }
    : { id, until: stage.elapsed + rules.items[id].duration };
  speak(rules.items[id].label + " 아이템을 썼어!");
  persist();
  renderPlay();
}

function answer(box, value) {
  if (!playable || !file.stage) return;
  const outcome = resolveBox(file, box, value);
  if (!outcome) return;
  boxButtons.get(box.id)?.remove();
  boxButtons.delete(box.id);

  const correction = value !== null && !outcome.correct ? solutionLabel(box) : "";
  if (value === null) {
    if (!file.stage.selected && !el("feedback").dataset.tone) {
      petChatter("상자가 지나갔어. 다음 상자를 풀어 보자!", "다음 상자도 같이 풀어 보자! ♡");
    }
  } else if (outcome.correct) {
    speak(outcome.item
      ? `✓ ${file.stage.streak}연속 정답 콤보! 🍪 +${outcome.cookies} · ${rules.items[outcome.item].label} 획득!`
      : `✓ 정답! 쿠키 ${outcome.cookies}개 받았어. 🍪`, "correct");
    petView.play("correct", "cookie");
  } else {
    speak(`✕ 오답. 같이 확인해 보자.\n${correction}`, "incorrect");
    petView.play("wrong");
  }

  if (file.stage.resolved === rules.problems) {
    endStage(false, correction, value === null ? [] : outcome.correct ? ["correct", "cookie"] : ["wrong"]);
    return;
  }
  el("cookies").textContent = file.cookies;
  el("petCookies").textContent = `🍪 쿠키 ${file.cookies}`;
  renderPlay(value !== null);
  persist();
}

function endStage(quit = false, correction = "", answerClips = []) {
  const previousGrowth = file.growthStage;
  finishStage(file, quit);
  if (correction) file.result.correction = correction;
  boxButtons.clear();
  el("boxes").replaceChildren();
  screen = "result";
  settlePet(file);
  persist();
  render();
  if (!quit) petView.play(...answerClips, "dance", ...(file.result.mealCookies ? ["feed"] : []),
    ...(file.growthStage > previousGrowth ? ["grow"] : []));
  el("resultTitle").focus();
}

function renderResultPet(result) {
  const { name: species } = pets[file.pet];
  const card = document.createElement("div");
  card.className = "result-pet";
  const voice = document.createElement("p");
  voice.className = "speech";
  const requests = ["간식 하나 사 줄래? 🍎", "장난감 사서 같이 놀자! 🧸"];
  const moodLine = file.mood <= 50 ? requests[(file.day.stages + result.correct) % requests.length] :
    file.mood >= rules.mood.cheerful ? "너랑 같이 풀어서 정말 신나! ♡" : "함께 풀어서 기분이 좋아!";
  voice.textContent = result.mealCookies ? `냠냠, 맛있게 먹을게.\n${moodLine}` : moodLine;
  const face = document.createElement("span");
  face.className = "result-pet-face";
  face.id = "resultPetFace";
  face.setAttribute("aria-hidden", "true");
  const caption = document.createElement("b");
  caption.textContent = `${file.petName || species} · 기분 ${file.mood} / ${rules.mood.max}`;
  card.append(voice, face, caption);
  return card;
}

function renderResult() {
  const result = file.result;
  const area = el("result");
  const accuracy = result.total ? Math.round(100 * result.correct / result.total) : 0;
  const totals = file.totals;
  const totalAccuracy = totals.answered ? Math.round(100 * totals.correct / totals.answered) : 0;
  area.innerHTML = `
    <p class="country">레벨 ${result.level}</p>
    <h2 id="resultTitle" tabindex="-1">${result.quit ? "스테이지를 나왔어요" : !result.admin && !file.day.flour ? "오늘의 모험을 마쳤어요!" : "스테이지 완료!"}</h2>
    <div class="score-chart">
      <div><b>정답 ${result.correct} / ${result.total}</b><span>${accuracy}%</span></div>
      <progress max="100" value="${accuracy}" aria-label="스테이지 정답률"></progress>
    </div>
    <div class="score"><div>획득 쿠키<strong>+${result.earned + result.extra}</strong></div>
    ${result.quit ? `<div>진행 문제<strong>${result.resolved} / ${result.total}</strong></div>`
      : `<div>모래시계 보너스<strong>+${result.extra}</strong></div>`}</div>`;
  if (pets[file.pet]) {
    el("resultTitle").after(renderResultPet(result));
    petView.show(el("resultPetFace"), file.pet, file.growthStage, petMood(),
      !result.admin && !file.day.flour);
  }
  if (result.correction) {
    const correction = document.createElement("p");
    correction.className = "speech result-note";
    correction.dataset.tone = "incorrect";
    correction.textContent = `✕ 오답. 같이 확인해 보자.\n${result.correction}`;
    area.append(correction);
  }
  if (result.mealCookies) {
    const meal = document.createElement("p");
    meal.className = "result-meal";
    meal.textContent = `쿠키 ${result.mealCookies}개를 먹고 경험치 1이 올라갔습니다.`;
    area.append(meal);
  }
  if (result.growth && result.growth !== "경험치 +1") {
    const growth = document.createElement("p");
    growth.className = "growth-result";
    growth.textContent = result.growth.includes("쿠키") && result.growth.includes("HP")
      ? "경험치 +1" : result.growth;
    area.append(growth);
  }
  if (result.moodLoss) {
    const mood = document.createElement("p");
    mood.className = "mood-result";
    mood.textContent = `기분 −${result.moodLoss}`;
    area.append(mood);
  }
  const cumulative = document.createElement("section");
  cumulative.className = "cumulative-result";
  cumulative.innerHTML = `<h3>누적 기록</h3>
    <div class="score"><div>푼 문제<strong>${totals.answered.toLocaleString("ko-KR")}개</strong></div>
    <div>정답률<strong>${totalAccuracy}%</strong></div>
    <div>획득 쿠키<strong>${totals.earned.toLocaleString("ko-KR")}개</strong></div></div>`;
  area.append(cumulative);
  if (!result.admin && !file.day.flour) {
    const notice = document.createElement("p");
    notice.className = "flour-notice";
    notice.textContent = flourNotice;
    area.append(notice);
    const dailyAccuracy = file.day.total ? Math.round(100 * file.day.correct / file.day.total) : 0;
    const summary = document.createElement("details");
    summary.className = "daily-result";
    summary.innerHTML = `<summary>오늘의 기록</summary>
      <div class="score"><div>정답 / 전체<strong>${file.day.correct} / ${file.day.total}</strong></div>
      <div>정답률<strong>${dailyAccuracy}%</strong></div><div>획득 쿠키<strong>${file.day.earned}</strong></div></div>`;
    area.append(summary);
  }
  area.append(button("다음", () => {
    file.result.view = "care";
    screen = "care";
    petChatter("내 기분을 확인해 볼래?", "오늘 같이 놀아서 정말 좋았어! ♡");
    persist();
    render();
    petView.play();
    el("careTitle").focus();
  }, "primary"));
}

function spawnBox(stage) {
  // 연속 상자는 서로 다른 줄을 사용해 동시에 선택할 수 있다.
  stage.lane = (stage.lane + randomInt(1, 2)) % 3;
  stage.boxes.push({ ...makeProblem(stage.level), id: stage.spawned++, lane: stage.lane, y: 0 });
  stage.nextSpawn = stage.elapsed + rules.spawnMs;
}

function frame(delta) {
  const stage = file.stage;
  if (!playable || !stage || document.hidden) return;
  const fieldHeight = document.querySelector(".answer-tray").offsetTop - 108;
  stage.elapsed += delta;
  el("sand").value = Math.max(0, 1 - stage.elapsed / rules.hourglassMs);
  if (stage.selected && stage.selected.until <= stage.elapsed) {
    stage.selected = null;
    renderChoices();
    petChatter("시간이 다 됐어. 상자를 다시 눌러도 돼!", "괜찮아! 상자를 다시 눌러서 같이 풀자! ♡");
    persist();
  }
  let effect = stage.timedEffect;
  if (effect && (effect.id === "slow"
    ? !stage.boxes.some(box => effect.targets.includes(box.id))
    : effect.until <= stage.elapsed)) {
    stage.timedEffect = null;
    effect = null;
    renderPlay(false);
  }
  renderItemStatus(stage);
  const speed = fallSpeed(file, stage.mode);
  if (stage.spawned < rules.problems && stage.elapsed >= stage.nextSpawn && effect?.id !== "freeze") spawnBox(stage);
  for (const box of stage.boxes) {
    if (file.stage !== stage) break;
    const selected = stage.selected?.id === box.id;
    const speedFactor = effect?.id === "freeze" ? 0 :
      effect?.id === "slow" && effect.targets.includes(box.id) ? rules.items.slow.speed : 1;
    const movement = delta / 1000 * speed * speedFactor;
    // 선택한 상자만 풀이 시간 동안 멈춘다.
    if (!selected) box.y += movement;
    if (!selected && box.y > fieldHeight) {
      answer(box, null);
      continue;
    }
    let control = boxButtons.get(box.id);
    if (!control) {
      control = button(box.text, () => selectBox(box), "box");
      boxButtons.set(box.id, control);
      el("boxes").append(control);
    }
    const minX = control.offsetWidth / 2;
    const laneX = el("boxes").clientWidth * [0.17, 0.5, 0.83][box.lane];
    control.style.left = `${Math.max(minX, Math.min(laneX, el("boxes").clientWidth - minX))}px`;
    control.style.top = `${87 + box.y}px`;
    control.classList.toggle("active", selected);
    control.setAttribute("aria-pressed", String(selected));
  }
  if (file.stage && stage.elapsed - lastSave >= 750) {
    lastSave = stage.elapsed;
    persist();
  }
}

el("start").addEventListener("click", () => {
  if (!playable || !file.petName || !persist()) return;
  refreshDay();
  if (!startStage(file, selectedLevel, adminMode)) return;
  lastSave = 0;
  screen = "play";
  petChatter("상자를 눌러 문제를 풀어 보자!", "우리 팀 출발! 나랑 같이 풀어 줘! ♡", "…");
  persist();
  render();
});

el("petNameInput").maxLength = rules.petNameLength;
el("petNameInput").addEventListener("input", event => event.target.setCustomValidity(""));
el("petNameForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!playable || !file.pet || file.petName) return;
  const input = el("petNameInput");
  const name = input.value.trim();
  if (!name || name.length > rules.petNameLength) {
    input.setCustomValidity(`펫 이름을 ${rules.petNameLength}자 이내로 입력해 주세요.`);
    input.reportValidity();
    return;
  }
  file.petName = name;
  persist();
  render();
  el("start").focus();
});

el("quit").addEventListener("click", () => {
  if (playable && file.stage) endStage(true);
});

el("careDone").addEventListener("click", () => {
  file.result = null;
  screen = "home";
  refreshDay();
  persist();
  render();
  (el("homeFlourNotice").hidden ? el("homeTitle") : el("homeFlourNotice")).focus();
});
el("adminForm").addEventListener("submit", event => {
  event.preventDefault();
  if (!playable) return;
  const pin = el("adminPin");
  if (pin.value !== "0000") {
    el("adminMessage").textContent = "비밀번호를 다시 확인해 주세요.";
    return;
  }
  pin.value = "";
  el("adminMessage").textContent = "모든 레벨과 스테이지 아이템을 자유롭게 이용할 수 있어요.";
  adminMode = true;
  render();
});
el("adminOff").addEventListener("click", () => {
  adminMode = false;
  el("adminMessage").textContent = "";
  render();
});

document.addEventListener("visibilitychange", () => {
  if (!playable) return;
  if (document.hidden && file.stage) persist();
  if (!document.hidden) refreshDay();
});
window.addEventListener("pagehide", () => {
  if (playable && file.stage) persist();
});
window.addEventListener("storage", event => {
  if (event.key !== storageKey) return;
  playable = false;
  error("다른 탭에서 기록이 바뀌었어요. 이 탭을 새로고침하면 최신 기록에서 이어갈 수 있어요.");
  el("start").disabled = true;
  document.querySelectorAll("#boxes button, #play button, #result button, #pets button, #petCare button, #levels button, #petNameForm button").forEach(control => { control.disabled = true; });
});

if (file.stage) {
  lastSave = file.stage.elapsed;
  // 이전 버전의 상자에도 새 문제 규칙을 적용한다.
  for (const box of file.stage.boxes) {
    if (box.answer === 0 || (file.stage.level === 1 && box.text.split(" ").includes("0"))) {
      Object.assign(box, makeProblem(file.stage.level));
      if (file.stage.selected?.id === box.id) file.stage.selected = null;
    }
  }
  if (file.stage.selected) {
    const selected = file.stage.selected;
    selected.until = Math.min(selected.until, file.stage.elapsed + rules.pauseMs);
    const { answer } = file.stage.boxes.find(box => box.id === selected.id);
    if (!selected.choices.some(value => value !== answer && value % 10 === answer % 10)) {
      selected.choices = makeChoices(answer, rules.options[file.stage.mode], file.stage.mode === "intermediate");
    }
  }
  if (file.stage.timedEffect?.id === "freeze") {
    file.stage.timedEffect.until = Math.min(file.stage.timedEffect.until, file.stage.elapsed + rules.items.freeze.duration);
  }
  petChatter(file.stage.selected ? "정답 풍선을 골라 봐!" : "이어서 상자를 풀어 보자!", "다시 왔구나! 같이 풀자! ♡");
} else if (file.result) {
  if (!file.result.petSettled) {
    settlePet(file);
    persist();
  }
  petChatter("스테이지를 끝냈어. 수고했어!", "같이 풀어서 정말 좋았어! ♡", "…");
}
if (playable) createWorld(frame);
else error("게임 엔진을 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.");
refreshDay();
render();
setInterval(refreshDay, 15000);
