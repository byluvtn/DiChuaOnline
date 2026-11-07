/**
 * Quầng sáng (glow / fake bloom) dùng chung cho Chùa Online.
 *
 * Bundle `three.module.js` cục bộ là bản core, KHÔNG kèm EffectComposer /
 * UnrealBloomPass (đã kiểm tra: không có RenderPass / ShaderPass / CopyShader).
 * Vì vậy hiệu ứng "lung linh" được dựng bằng Sprite cộng sáng (AdditiveBlending)
 * phủ một texture radial gradient. Rẻ hơn post-processing rất nhiều, chạy tốt
 * trên mobile và vẫn cho cảm giác đèn lồng, hoa sen, hào quang phát sáng.
 */

import * as THREE from './three.module.js';

let glowTextureCache = null;

/** Texture quầng sáng tròn (trắng ở tâm → cam → trong suốt ở rìa). */
export function getGlowTexture() {
    if (glowTextureCache) return glowTextureCache;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 248, 222, 1)');
    grad.addColorStop(0.20, 'rgba(255, 206, 130, 0.86)');
    grad.addColorStop(0.46, 'rgba(255, 152, 74, 0.34)');
    grad.addColorStop(0.72, 'rgba(255, 124, 82, 0.11)');
    grad.addColorStop(1, 'rgba(255, 110, 70, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    glowTextureCache = new THREE.CanvasTexture(canvas);
    if ('colorSpace' in glowTextureCache) glowTextureCache.colorSpace = THREE.SRGBColorSpace;
    else if ('encoding' in glowTextureCache) glowTextureCache.encoding = THREE.sRGBEncoding;
    return glowTextureCache;
}

/** Danh sách sprite cần nhấp nháy, được cập nhật trong vòng lặp game. */
export const glowPulses = [];

/**
 * Tạo một quầng sáng Sprite (billboard luôn hướng về camera).
 * @param {number} size đường kính quầng sáng theo world unit
 * @param {number} color màu nhuộm
 * @param {number} opacity độ đậm
 * @param {boolean} pulsing có nhấp nháy nhẹ theo thời gian hay không
 */
export function createGlowSprite(size = 2, color = 0xffc978, opacity = 0.9, pulsing = true) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false
    }));
    sprite.scale.setScalar(size);
    if (pulsing) {
        glowPulses.push({
            sprite,
            base: size,
            baseOpacity: opacity,
            phase: Math.random() * Math.PI * 2,
            speed: 1.1 + Math.random() * 0.9
        });
    }
    return sprite;
}

/** Bật/tắt toàn bộ quầng sáng pulse (dùng cho cơ chế hạ chất lượng 8.5). */
let glowPulsesEnabled = true;

export function setGlowPulsesEnabled(on) {
    glowPulsesEnabled = on;
    for (let i = 0; i < glowPulses.length; i++) {
        glowPulses[i].sprite.visible = on;
    }
}

/** Cập nhật nhịp thở của toàn bộ quầng sáng. Gọi mỗi frame. */
export function updateGlowPulses(time) {
    if (!glowPulsesEnabled) return;
    for (let i = 0; i < glowPulses.length; i++) {
        const item = glowPulses[i];
        const wave = 0.5 + 0.5 * Math.sin(time * item.speed + item.phase);
        item.sprite.scale.setScalar(item.base * (0.92 + wave * 0.16));
        item.sprite.material.opacity = item.baseOpacity * (0.72 + wave * 0.28);
    }
}
