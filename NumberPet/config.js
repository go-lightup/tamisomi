"use strict";

// 명세에 수치가 없는 항목은 플레이 테스트용 기본값이다.
const rules = {
  problems: 10,
  dailyFlour: 3,
  refillHour: 7,
  fallSpeed: { beginner: 20, intermediate: 23 },
  fallBoostPerStep: 0.015,
  spawnMs: 3700,
  pauseMs: 5000,
  options: { beginner: 3, intermediate: 5 },
  answerCookies: 1,
  hourglassMs: 75000,
  hourglassRewards: [{ remaining: .75, cookies: 2 }, { remaining: .25, cookies: 1 }],
  feedCookies: 5,
  initialHp: 1,
  growthTargets: [10, 20, 30, 40],
  intermediateEvolution: 2,
  streak: 7,
  mood: { initial: 50, max: 100, stagePenalty: 2, cheerful: 80, quiet: 20 },
  petNameLength: 16,
  care: {
    treat: { label: "간식", icon: "🍎", cost: 2, mood: 2, reaction: "간식 고마워! 맛있다.", animation: "feed" },
    toy: { label: "장난감", icon: "🧸", cost: 4, mood: 5, reaction: "같이 놀아서 신나!", animation: "dance" },
  },
  items: {
    freeze: { label: "상자 멈춤", duration: 5000 },
    slow: { label: "천천히 낙하", speed: 0.4 },
    double: { label: "더블 쿠키", duration: 5000, multiplier: 2 },
  },
};
