// Renders the current R3F scene to a square JPEG data URL for cart/order thumbnails.
export function captureSnapshot(state, size = 512) {
  const { gl, scene, camera } = state;
  gl.render(scene, camera);
  const src = gl.domElement;
  const side = Math.min(src.width, src.height);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(src, (src.width - side) / 2, (src.height - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.85);
}
