"use strict";

const petSpecies = {
  cat: { name: "고양이", color: "#be69a3", light: "#ffd4e9", dark: "#814577" },
  dog: { name: "강아지", color: "#ce8655", light: "#ffe6b5", dark: "#8b4d3b" },
  dragon: { name: "드래곤", color: "#55ab91", light: "#c4f4aa", dark: "#296876" },
  rabbit: { name: "토끼", color: "#828bc9", light: "#eef2ff", dark: "#54548f", legacy: true },
};

const petFrameSize = 144;

// 같은 시점과 조명을 모든 표정, 종, 성장 외형에 적용한다.
function drawPetFrame(ctx, species, form, pose, t, mood = "neutral") {
  const palette = petSpecies[species];
  const wave = Math.sin(t * Math.PI * 2);
  const pulse = Math.sin(t * Math.PI);
  const sleepy = pose === "sleep";
  const smile = mood === "happy" || ["correct", "cookie", "dance", "grow"].includes(pose);
  const sad = pose === "wrong" || mood === "sad";
  const blink = sleepy || (pose === "idle" && t > .7 && t < .9);
  const jump = pose === "correct" ? -12 * pulse : pose === "dance" ? -7 * Math.abs(wave) : 0;

  function oval(x, y, rx, ry, color, tilt = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, tilt, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  function shade(x, y, rx, ry, light, mid, dark, tilt = 0) {
    const gradient = ctx.createRadialGradient(x - rx * .30, y - ry * .42, 1, x, y, Math.max(rx, ry) * 1.15);
    gradient.addColorStop(0, light);
    gradient.addColorStop(.57, mid);
    gradient.addColorStop(1, dark);
    oval(x, y, rx, ry, gradient, tilt);
  }
  function fur(x, y, rx, ry, tilt = 0) {
    shade(x, y, rx, ry, palette.light, palette.color, palette.dark, tilt);
  }
  function stroke(points, color, width) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    ctx.quadraticCurveTo(...points[1], ...points[2]);
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  ctx.save();
  oval(72, 126, 37, 6, "#34345c27");
  ctx.translate(72, 111 + jump - (sleepy ? -6 : 0));
  ctx.scale(.79 + form * .055, (.79 + form * .055) * (sleepy ? .80 : 1 + .018 * wave));
  ctx.translate(-72, -111);
  if (pose === "dance" || pose === "wrong") {
    ctx.translate(72, 97);
    ctx.rotate((pose === "wrong" ? .16 * pulse : .13 * wave));
    ctx.translate(-72, -97);
  }

  if (species === "dragon") {
    for (const side of [-1, 1]) {
      const x = 72 + 34 * side;
      fur(x + side * 5, 78 + wave * 3, 11 + form, 24, side * (.55 + wave * .13));
      oval(x + side * 5, 80 + wave * 3, 6, 17, "#90d6b7", side * .55);
    }
  }
  stroke([[93, 109], [126, 109 + 5 * wave], [114 + 5 * wave, 81 + 8 * wave]], palette.dark, 11);
  stroke([[93, 108], [126, 106 + 5 * wave], [114 + 5 * wave, 80 + 8 * wave]], palette.color, 7);
  fur(71, 99, 29 + form, 26);
  shade(68, 105, 17, 18, "#fff7df", palette.light, palette.color);
  fur(52, 119, 13, 8, -.16);
  fur(87, 119, 14, 8, .16);

  for (const side of [-1, 1]) {
    const x = 71 + side * 24;
    if (species === "cat") {
      ctx.save();
      ctx.translate(x, 48);
      ctx.rotate(side * (.22 + wave * .10));
      ctx.beginPath();
      ctx.moveTo(-13, 8);
      ctx.quadraticCurveTo(-12, -12, -3, -20 - form);
      ctx.quadraticCurveTo(4, -22, 13, 9);
      ctx.fillStyle = palette.dark;
      ctx.fill();
      oval(-1, -3, 6, 10, "#eda9be", -.12);
      ctx.restore();
    } else {
      const long = species === "rabbit" ? 24 : species === "dog" ? 18 : 14;
      fur(x + side * 3, species === "dog" ? 53 : 39, 9, long, side * (.25 + .16 * wave));
      if (species !== "dog") oval(x + side * 3, 37, 4, long - 6, species === "dragon" ? "#ffe196" : "#efb9dc", side * .25);
    }
  }
  fur(70, 66, 37, 31);
  if (form >= 2) {
    oval(68, 43, 8 + form, 4, palette.light, -.20);
    if (form >= 3) oval(76, 51, 4, 3, palette.light);
  }
  if (form === 4) {
    oval(69, 96, 7, 6, "#bd7e34");
    oval(67, 94, 5, 4, "#fff0a2");
  }
  for (const x of [55, 82]) {
    oval(x + 1, 75, 7, 3, "#ff9caf65", -.12);
    if (blink || smile) {
      const arc = smile && !blink ? 57 : 70;
      stroke([[x - 5, 65], [x, arc], [x + 5, 65]], "#3b284b", 2.6);
    } else {
      oval(x, 65, 4.7, sad ? 4.5 : 7, "#342943", -.1);
      oval(x - 1.3, 62, 1.7, 2, "#fff");
    }
  }
  shade(69, 80, 14, 9, "#fff9ec", palette.light, palette.color);
  oval(69, 76, 4.6, 3.1, "#54324c");
  const open = pose === "feed" ? 2 + 4 * Math.abs(wave) : smile ? 4 : 2;
  oval(69, 83, 5, open, sad ? "#7d4e62" : "#60344c");
  if (open > 3) oval(69, 85, 3, 1.6, "#fb96a3");
  if (pose === "cookie" || pose === "feed") {
    const x = pose === "cookie" ? 118 - t * 40 : 69;
    const y = pose === "cookie" ? 35 + t * 48 : 103 - 9 * Math.abs(wave);
    shade(x, y, 9, 9, "#ffe1a0", "#d4904d", "#8d553d");
    for (const [dx, dy] of [[-3, -2], [3, 0], [-1, 4]]) oval(x + dx, y + dy, 1.3, 1.3, "#88462f");
  }
  if (pose === "grow" || pose === "dance" || sleepy) {
    ctx.fillStyle = sleepy ? "#514581" : "#c18318";
    ctx.font = "bold 17px sans-serif";
    ctx.fillText(sleepy ? "z" : "✦", 110, 44 - pulse * 10);
  }
  ctx.restore();
}
