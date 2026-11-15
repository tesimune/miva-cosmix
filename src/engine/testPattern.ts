const WIDTH = 640;
const HEIGHT = 360;
const HUES = [205, 28, 150, 320, 48];
const BLOB_COUNT = 9;

function createBlobs() {
  return Array.from({ length: BLOB_COUNT }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    radius: 40 + Math.random() * 70,
    hue: HUES[index % HUES.length],
    speed: 0.3 + Math.random() * 0.7,
    phase: Math.random() * 6,
  }));
}

export function startTestPattern() {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d')!;
  const blobs = createBlobs();
  let animation = 0;

  const draw = (milliseconds: number) => {
    const seconds = milliseconds / 1000;

    context.globalCompositeOperation = 'source-over';
    context.fillStyle = '#081226';
    context.fillRect(0, 0, WIDTH, HEIGHT);

    context.globalCompositeOperation = 'lighter';
    for (const blob of blobs) {
      const x = (blob.x + 0.12 * Math.sin(seconds * blob.speed * 0.5 + blob.phase)) * WIDTH;
      const y = (blob.y + 0.14 * Math.cos(seconds * blob.speed * 0.4 + blob.phase)) * HEIGHT;
      const glow = context.createRadialGradient(x, y, 0, x, y, blob.radius);
      glow.addColorStop(0, `hsla(${blob.hue}, 90%, 62%, 0.9)`);
      glow.addColorStop(1, `hsla(${blob.hue}, 90%, 50%, 0)`);
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, y, blob.radius, 0, Math.PI * 2);
      context.fill();
    }

    const isFlashing = Math.sin(seconds * 2.3) > 0.985;
    if (isFlashing) {
      context.fillStyle = '#fff';
      context.beginPath();
      context.arc(Math.random() * WIDTH, Math.random() * HEIGHT, 9, 0, Math.PI * 2);
      context.fill();
    }

    context.globalCompositeOperation = 'source-over';
    context.fillStyle = 'rgba(255, 255, 255, 0.75)';
    context.font = '600 13px Inter, sans-serif';
    context.fillText('TEST PATTERN · not NASA data', 14, HEIGHT - 14);

    animation = requestAnimationFrame(draw);
  };
  draw(0);

  return { canvas, stop: () => cancelAnimationFrame(animation) };
}
