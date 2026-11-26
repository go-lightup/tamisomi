"use strict";

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function shuffle(values) {
  for (let index = values.length - 1; index > 0; index--) {
    const other = randomInt(0, index);
    [values[index], values[other]] = [values[other], values[index]];
  }
  return values;
}

// 한 자리 뺄셈에는 받아내림이 없으므로 레벨 2에서는 10~18에서 한 자리를 뺀다.
function makeProblem(level) {
  const add = Math.random() < 0.5;
  if (level === 4) {
    const a = randomInt(add ? 1 : 2, 20);
    const x = randomInt(1, add ? 19 : a - 1);
    return { text: `${a} ${add ? "+" : "−"} X = ${add ? a + x : a - x}`, answer: x, equation: true };
  }
  if (level === 5) {
    const a = randomInt(10, 99);
    const b = randomInt(10, add ? 99 : a);
    const subtotal = add ? a + b : a - b;
    const nextAdd = !add;
    const c = randomInt(10, nextAdd ? 99 : Math.min(99, subtotal - 1));
    return { text: `${a} ${add ? "+" : "−"} ${b} ${nextAdd ? "+" : "−"} ${c}`, answer: nextAdd ? subtotal + c : subtotal - c };
  }

  let a;
  let b;
  if (level === 1) {
    a = randomInt(add ? 1 : 2, add ? 8 : 9);
    b = randomInt(1, add ? 9 - a : a - 1);
  } else if (level === 2) {
    a = add ? randomInt(1, 9) : randomInt(10, 18);
    b = add ? randomInt(10 - a, 9) : randomInt(a - 9, 9);
  } else {
    const ones = randomInt(add ? 1 : 0, add ? 9 : 8);
    const tens = randomInt(add ? 1 : 2, 9);
    a = tens * 10 + ones;
    b = randomInt(1, add ? 9 : tens - 1) * 10 + (add ? randomInt(10 - ones, 9) : randomInt(ones + 1, 9));
  }
  return { text: `${a} ${add ? "+" : "−"} ${b}`, answer: add ? a + b : a - b };
}

function makeChoices(answer, count, intermediate) {
  const radius = intermediate ? 4 : 9;
  const nearby = Array.from({ length: radius * 2 + 1 }, (_, index) => answer + index - radius)
    .filter(value => value >= 0 && value !== answer);
  // 일의 자리만 보고 풀지 않도록 같은 일의 자리 오답을 섞는다.
  const sameOnes = shuffle([answer - 10, answer + 10].filter(value => value > 0))[0];
  return shuffle([answer, sameOnes, ...shuffle(nearby).slice(0, count - 2)]);
}

function questionLabel(problem) {
  return problem.equation ? `${problem.text} (X는?)` : `${problem.text} = ?`;
}

function solutionLabel(problem) {
  return problem.equation ? `${problem.text}\nX = ${problem.answer}` : `${problem.text} = ${problem.answer}`;
}

function fallSpeed(file, mode) {
  // 경험치 진행 바의 목표를 기준으로 10% 구간을 계산한다.
  const target = rules.growthTargets[file.growthStage - 1];
  const step = target === undefined ? 9 : Math.min(9, Math.floor(file.hp * 10 / target));
  return rules.fallSpeed[mode] * (1 + step * rules.fallBoostPerStep);
}

function startStage(file, level, admin = false) {
  if (!Number.isInteger(level) || level < 1 || level > rules.growthTargets.length + 1 || file.stage ||
      (!admin && (file.day.flour <= 0 || level !== file.growthStage))) return false;
  if (!admin) file.day.flour--;
  file.result = null;
  file.stage = {
    level, admin, mode: level >= rules.intermediateEvolution ? "intermediate" : "beginner",
    boxes: [], elapsed: 0, nextSpawn: 0, spawned: 0, resolved: 0, answered: 0,
    correct: 0, streak: 0, earned: 0, selected: null, timedEffect: null, lane: -1,
  };
  return true;
}

function resolveBox(file, box, value) {
  const stage = file.stage;
  if (!stage.boxes.includes(box)) return null;
  const answered = value !== null;
  const correct = answered && value === box.answer;
  stage.boxes = stage.boxes.filter(current => current !== box);
  if (stage.selected?.id === box.id) stage.selected = null;
  stage.resolved++;
  if (answered) stage.answered++;
  if (!correct) {
    stage.streak = 0;
    return { correct, item: null };
  }
  stage.correct++;
  stage.streak++;
  const effect = stage.timedEffect;
  const multiplier = effect?.id === "double" && stage.elapsed < effect.until ? rules.items.double.multiplier : 1;
  const cookies = rules.answerCookies * multiplier;
  stage.earned += cookies;
  file.cookies += cookies;
  let item = null;
  if (stage.streak % rules.streak === 0) {
    const keys = Object.keys(rules.items);
    item = keys[randomInt(0, keys.length - 1)];
    file.items[item]++;
  }
  return { correct, item, cookies };
}

function finishStage(file, quit = false) {
  const stage = file.stage;
  const extra = quit ? 0 : rules.hourglassRewards.find(reward =>
    stage.elapsed <= rules.hourglassMs * (1 - reward.remaining))?.cookies ?? 0;
  file.cookies += extra;
  if (!quit) file.clears++;
  if (!stage.admin) {
    file.day.stages++;
    file.day.total += stage.resolved;
    file.day.answered += stage.answered;
    file.day.correct += stage.correct;
    file.day.earned += stage.earned + extra;
  }
  file.result = {
    total: rules.problems, resolved: stage.resolved, answered: stage.answered, correct: stage.correct,
    earned: stage.earned, extra, quit, growth: null, level: stage.level, admin: Boolean(stage.admin),
  };
  file.stage = null;
}

// 화면 이동이나 새로고침에도 스테이지의 기분과 식사를 한 번만 정산한다.
function settlePet(file) {
  const result = file.result;
  if (result.petSettled) return;
  result.petSettled = true;
  result.moodLoss = Math.min(file.mood, rules.mood.stagePenalty);
  file.mood -= result.moodLoss;
  if (result.quit) return;
  if (file.cookies < rules.feedCookies) {
    result.growth = "쿠키가 5개 미만이라 경험치는 그대로예요.";
    return;
  }
  file.cookies -= rules.feedCookies;
  result.mealCookies = rules.feedCookies;
  file.hp++;
  const target = rules.growthTargets[file.growthStage - 1];
  if (target !== undefined && file.hp >= target) {
    file.growthStage++;
    file.hp = rules.initialHp;
    result.growth = `성장 ${file.growthStage}단계 · 레벨 ${file.growthStage} 해금!`;
  }
  return true;
}

function buyCare(file, care) {
  if (file.cookies < care.cost || file.mood >= rules.mood.max) return false;
  file.cookies -= care.cost;
  file.mood = Math.min(rules.mood.max, file.mood + care.mood);
  return true;
}
