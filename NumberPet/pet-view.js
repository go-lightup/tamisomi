"use strict";

const petClips = { correct: 420, wrong: 650, cookie: 500, feed: 870, dance: 760, grow: 1100 };

// 하나의 프레임 아틀라스를 재사용하며 현재 화면의 펫 캔버스에만 그린다.
const petView = (() => {
  const count = 8;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let texture;
  let canvas;
  let pet;
  let queue = [];
  let elapsed = 0;
  let atlasKey = "";
  let lastFrame = -1;

  function portrait(species, form) {
    const view = document.createElement("canvas");
    view.width = view.height = petFrameSize;
    view.setAttribute("aria-hidden", "true");
    drawPetFrame(view.getContext("2d"), species, Math.min(4, form), "idle", 0);
    return view;
  }

  function show(host, species, stage, mood, resting = false) {
    if (!host || !petSpecies[species]) return;
    const form = Math.min(stage, 4);
    const identity = `${species}/${stage}`;
    if (pet?.identity !== identity) {
      queue = [];
      elapsed = 0;
    }
    pet = { identity, species, stage, form, mood, resting };
    canvas ??= portrait(species, form);
    if (canvas.parentElement !== host) {
      host.replaceChildren(canvas);
      lastFrame = -1;
    }
    update(0);
  }

  function play(...actions) {
    queue = actions.filter(action => Object.hasOwn(petClips, action));
    elapsed = 0;
    update(0);
  }

  function connect(currentScene) {
    texture = currentScene.textures.createCanvas("pet-frames", petFrameSize * count, petFrameSize);
    for (let i = 0; i < count; i++) texture.add(String(i), 0, i * petFrameSize, 0, petFrameSize, petFrameSize);
    update(0);
  }

  function update(delta) {
    if (!pet || !canvas?.isConnected || canvas.closest("[hidden]") || document.hidden) return;
    if (!texture) {
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, petFrameSize, petFrameSize);
      drawPetFrame(context, pet.species, pet.form, "idle", 0, pet.mood);
      return;
    }
    elapsed += delta;
    while (queue.length && elapsed >= petClips[queue[0]]) elapsed -= petClips[queue.shift()];
    const pose = reduced.matches ? (pet.resting ? "sleep" : "idle") : queue[0] ?? (pet.resting ? "sleep" : "idle");
    const evolving = !reduced.matches && queue.includes("grow") && pet.stage > 1 && pet.stage <= 4;
    const key = `${pet.identity}/${pet.mood}/${pose}/${evolving}`;
    if (atlasKey !== key) {
      const context = texture.getContext();
      context.clearRect(0, 0, petFrameSize * count, petFrameSize);
      for (let i = 0; i < count; i++) {
        context.save();
        context.translate(i * petFrameSize, 0);
        const form = evolving && (pose !== "grow" || i < count / 2) ? pet.form - 1 : pet.form;
        drawPetFrame(context, pet.species, form, pose, i / count, pet.mood);
        context.restore();
      }
      texture.refresh();
      atlasKey = key;
      lastFrame = -1;
    }
    const duration = petClips[pose] ?? 2600;
    const index = reduced.matches ? 0 : Math.floor((elapsed % duration) * count / duration);
    if (index === lastFrame) return;
    const frame = texture.get(String(index));
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, petFrameSize, petFrameSize);
    context.drawImage(frame.source.image, frame.cutX, frame.cutY, petFrameSize, petFrameSize, 0, 0, petFrameSize, petFrameSize);
    lastFrame = index;
  }

  return { portrait, show, play, connect, update };
})();
