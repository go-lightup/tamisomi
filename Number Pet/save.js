"use strict";

const storageKey = "number-pet-v1";

// 오전 7시 이전은 전날의 도전 기록에 속한다. 기준은 기기 현지 시간이다.
function dayKey(now = new Date()) {
  const day = new Date(now);
  if (day.getHours() < rules.refillHour) day.setDate(day.getDate() - 1);
  return [day.getFullYear(), day.getMonth() + 1, day.getDate()].join("-");
}

function newDay(key = dayKey()) {
  return { key, flour: rules.dailyFlour, stages: 0, total: 0, answered: 0, correct: 0, earned: 0 };
}

function validCounts(object, keys) {
  return keys.every(key => Number.isInteger(object?.[key]) && object[key] >= 0);
}

function migrateLegacySave(file) {
  if (file?.version !== 1 || !validCounts(file, ["meals"]) ||
      !validCounts(file.day, ["flour"]) || !validCounts(file.items, ["freeze", "slow", "fewer"])) return file;
  file.version = 2;
  file.hp = file.meals;
  file.peakHp = file.meals;
  file.day.flour = Math.min(rules.dailyFlour, file.day.flour + Math.max(0, rules.dailyFlour - 2));
  file.items.double = file.items.fewer;
  delete file.items.fewer;
  delete file.meals;
  for (const record of [file, file.stage, file.result]) {
    if (record?.level === 4) record.level = 5;
  }
  if (file.stage?.timedEffect?.id === "slow") {
    file.stage.timedEffect = { id: "slow", targets: file.stage.boxes.map(box => box.id) };
  }
  if (file.result?.bonus === "closed") file.result.petSettled = true;
  return file;
}

function migrateGrowthSave(file) {
  file = migrateLegacySave(file);
  if (file?.version !== 2 || !validCounts(file, ["hp", "peakHp"]) || !file.day) return file;
  // 이전 성장 단계를 유지하고 그 단계에서 얻었던 HP를 새 진행 바로 옮긴다.
  const legacyThresholds = [0, 2, 5, 10];
  file.growthStage = legacyThresholds.filter(threshold => file.peakHp >= threshold).length;
  const target = rules.growthTargets[file.growthStage - 1];
  file.hp = Math.min(target - 1, rules.initialHp + Math.max(0, file.hp - legacyThresholds[file.growthStage - 1]));
  file.mood = rules.mood.initial;
  file.version = 3;
  delete file.health;
  delete file.peakHp;
  delete file.level;
  delete file.day.fed;
  if (file.result) {
    delete file.result.healthChange;
    if (file.result.bonus === "closed") {
      file.result.petSettled = true;
      file.result.growth = null;
    }
  }
  return file;
}

function migrateSave(file) {
  file = migrateGrowthSave(file);
  if (file?.version !== 3) return file;
  file.version = 4;
  file.petName = "";
  if (file.result) {
    const result = file.result;
    // 삭제된 키패드 미션에 이미 지불한 쿠키는 돌려준다.
    if (result.bonus === "active") file.cookies += 2;
    result.earned += result.bonusEarned ?? 0;
    delete result.bonus;
    delete result.bonusEarned;
    delete result.challenge;
  }
  return file;
}

function readSave() {
  try {
    const file = migrateSave(JSON.parse(localStorage.getItem(storageKey)));
    if (file?.version === 4 &&
        validCounts(file, ["cookies", "hp", "growthStage", "mood", "clears"]) &&
        file.hp >= rules.initialHp && file.growthStage >= 1 &&
        file.growthStage <= rules.growthTargets.length + 1 && file.mood <= rules.mood.max &&
        (rules.growthTargets[file.growthStage - 1] === undefined || file.hp < rules.growthTargets[file.growthStage - 1]) &&
        ["dog", "cat", "rabbit", null].includes(file.pet) &&
        typeof file.petName === "string" && file.petName.length <= rules.petNameLength &&
        validCounts(file.day, ["flour", "stages", "total", "answered", "correct", "earned"]) &&
        typeof file.day.key === "string" &&
        file.day.flour <= rules.dailyFlour && !(file.stage && file.result) &&
        validCounts(file.items, Object.keys(rules.items)) &&
        (file.stage === null || (
          validCounts(file.stage, ["level", "spawned", "resolved", "answered", "correct", "streak", "earned"]) &&
          Object.hasOwn(rules.options, file.stage.mode) && Number.isFinite(file.stage.elapsed) &&
          Number.isFinite(file.stage.nextSpawn) && Array.isArray(file.stage.boxes) &&
          (!file.stage.timedEffect || (
            Object.hasOwn(rules.items, file.stage.timedEffect.id) &&
            (file.stage.timedEffect.id === "slow" ? Array.isArray(file.stage.timedEffect.targets) :
              Number.isFinite(file.stage.timedEffect.until))
          )) &&
          file.stage.boxes.every(box => validCounts(box, ["id", "answer", "lane"]) &&
            box.lane < 3 && typeof box.text === "string" && Number.isFinite(box.y)) &&
          (!file.stage.selected || (
            file.stage.boxes.some(box => box.id === file.stage.selected.id) &&
            Number.isFinite(file.stage.selected.until) && Array.isArray(file.stage.selected.choices)
          ))
        )) &&
        (file.result === null ||
          validCounts(file.result, ["total", "answered", "correct", "earned", "extra", "level"]))) return file;
  } catch {
    // 읽을 수 없는 데이터는 새 게임으로 복구한다.
  }
  return {
    version: 4, pet: null, petName: "", cookies: 0, hp: rules.initialHp, growthStage: 1, mood: rules.mood.initial, clears: 0,
    items: { freeze: 0, slow: 0, double: 0 }, day: newDay(), stage: null, result: null,
  };
}

function writeSave(file) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}
