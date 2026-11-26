"use strict";

function createWorld(onFrame) {
  const holder = document.querySelector("#canvas");
  let art;

  function paint(width, height) {
    art.clear();
    art.fillStyle(0xbdeefa).fillRect(0, 0, width, height);
    art.fillStyle(0xfff4b9).fillCircle(width * .83, height * .21, 47);
    art.fillStyle(0xffffff, .84);
    for (const [x, y] of [[.12, .22], [.40, .13], [.69, .33], [.92, .44], [.2, .49]]) {
      art.fillEllipse(width * x, height * y, 104, 29);
      art.fillCircle(width * x - 10, height * y - 13, 22);
    }
    art.fillStyle(0xa1dcca).fillEllipse(width * .18, height, width * 1.3, height * .46);
    art.fillStyle(0x7fc6ac).fillEllipse(width * .85, height * 1.02, width * 1.34, height * .42);
    art.fillStyle(0xfff2b0, .9);
    for (const [x, y] of [[.07, .93], [.23, .88], [.38, .96], [.71, .94], [.87, .88], [.95, .96]]) {
      art.fillCircle(width * x, height * y, 4);
    }
  }

  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: holder,
    width: holder.clientWidth,
    height: holder.clientHeight,
    audio: { noAudio: true },
    scene: {
      create() {
        art = this.add.graphics();
        this.scale.on("resize", size => paint(size.width, size.height));
        paint(this.scale.width, this.scale.height);
        petView.connect(this);
      },
      update(_time, delta) {
        onFrame(Math.min(delta, 50));
        petView.update(Math.min(delta, 50));
      },
    },
  });

  new ResizeObserver(() => game.scale.resize(holder.clientWidth, holder.clientHeight)).observe(holder);
}
