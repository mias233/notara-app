import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { BloomEffect, ChromaticAberrationEffect, EffectComposer, EffectPass, RenderPass } from 'https://unpkg.com/postprocessing@6.34.3/build/postprocessing.esm.js';
import * as faceapi from 'https://unpkg.com/@vladmandic/face-api@1.7.12/dist/face-api.esm.js';

const vert = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const frag = `
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec2 uSkew;
uniform float uTilt;
uniform float uYaw;
uniform float uLineThickness;
uniform vec3 uLinesColor;
uniform vec3 uScanColor;
uniform float uGridScale;
uniform float uLineStyle;
uniform float uLineJitter;
uniform float uScanOpacity;
uniform float uScanDirection;
uniform float uNoise;
uniform float uBloomOpacity;
uniform float uScanGlow;
uniform float uScanSoftness;
uniform float uPhaseTaper;
uniform float uScanDuration;
uniform float uScanDelay;
varying vec2 vUv;

uniform float uScanStarts[8];
uniform float uScanCount;

const int MAX_SCANS = 8;

float smoother01(float a, float b, float x){
  float t = clamp((x - a) / max(1e-5, (b - a)), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

    vec3 ro = vec3(0.0);
    vec3 rd = normalize(vec3(p, 2.0));

    float cR = cos(uTilt), sR = sin(uTilt);
    rd.xy = mat2(cR, -sR, sR, cR) * rd.xy;

    float cY = cos(uYaw), sY = sin(uYaw);
    rd.xz = mat2(cY, -sY, sY, cY) * rd.xz;

    vec2 skew = clamp(uSkew, vec2(-0.7), vec2(0.7));
    rd.xy += skew * rd.z;

    vec3 color = vec3(0.0);
    float minT = 1e20;
    float gridScale = max(1e-5, uGridScale);
    float fadeStrength = 2.0;
    vec2 gridUV = vec2(0.0);

    float hitIsY = 1.0;
    for (int i = 0; i < 4; i++)
    {
        float isY = float(i < 2);
        float pos = mix(-0.2, 0.2, float(i)) * isY + mix(-0.5, 0.5, float(i - 2)) * (1.0 - isY);
        float num = pos - (isY * ro.y + (1.0 - isY) * ro.x);
        float den = isY * rd.y + (1.0 - isY) * rd.x;
        float t = num / den;
        vec3 h = ro + rd * t;

        float depthBoost = smoothstep(0.0, 3.0, h.z);
        h.xy += skew * 0.15 * depthBoost;

        bool use = t > 0.0 && t < minT;
        gridUV = use ? mix(h.zy, h.xz, isY) / gridScale : gridUV;
        minT = use ? t : minT;
        hitIsY = use ? isY : hitIsY;
    }

    vec3 hit = ro + rd * minT;
    float dist = length(hit - ro);

    float jitterAmt = clamp(uLineJitter, 0.0, 1.0);
    if (jitterAmt > 0.0) {
        vec2 j = vec2(
            sin(gridUV.y * 2.7 + iTime * 1.8),
            cos(gridUV.x * 2.3 - iTime * 1.6)
        ) * (0.15 * jitterAmt);
        gridUV += j;
    }
    float fx = fract(gridUV.x);
    float fy = fract(gridUV.y);
    float ax = min(fx, 1.0 - fx);
    float ay = min(fy, 1.0 - fy);
    float wx = fwidth(gridUV.x);
    float wy = fwidth(gridUV.y);
    float halfPx = max(0.0, uLineThickness) * 0.5;

    float tx = halfPx * wx;
    float ty = halfPx * wy;

    float aax = wx;
    float aay = wy;

    float lineX = 1.0 - smoothstep(tx, tx + aax, ax);
    float lineY = 1.0 - smoothstep(ty, ty + aay, ay);
    if (uLineStyle > 0.5) {
        float dashRepeat = 4.0;
        float dashDuty = 0.5;
        float vy = fract(gridUV.y * dashRepeat);
        float vx = fract(gridUV.x * dashRepeat);
        float dashMaskY = step(vy, dashDuty);
        float dashMaskX = step(vx, dashDuty);
        if (uLineStyle < 1.5) {
            lineX *= dashMaskY;
            lineY *= dashMaskX;
        } else {
            float dotRepeat = 6.0;
            float dotWidth = 0.18;
            float cy = abs(fract(gridUV.y * dotRepeat) - 0.5);
            float cx = abs(fract(gridUV.x * dotRepeat) - 0.5);
            float dotMaskY = 1.0 - smoothstep(dotWidth, dotWidth + fwidth(gridUV.y * dotRepeat), cy);
            float dotMaskX = 1.0 - smoothstep(dotWidth, dotWidth + fwidth(gridUV.x * dotRepeat), cx);
            lineX *= dotMaskY;
            lineY *= dotMaskX;
        }
    }
    float primaryMask = max(lineX, lineY);

    vec2 gridUV2 = (hitIsY > 0.5 ? hit.xz : hit.zy) / gridScale;
    if (jitterAmt > 0.0) {
        vec2 j2 = vec2(
            cos(gridUV2.y * 2.1 - iTime * 1.4),
            sin(gridUV2.x * 2.5 + iTime * 1.7)
        ) * (0.15 * jitterAmt);
        gridUV2 += j2;
    }
    float fx2 = fract(gridUV2.x);
    float fy2 = fract(gridUV2.y);
    float ax2 = min(fx2, 1.0 - fx2);
    float ay2 = min(fy2, 1.0 - fy2);
    float wx2 = fwidth(gridUV2.x);
    float wy2 = fwidth(gridUV2.y);
    float tx2 = halfPx * wx2;
    float ty2 = halfPx * wy2;
    float aax2 = wx2;
    float aay2 = wy2;
    float lineX2 = 1.0 - smoothstep(tx2, tx2 + aax2, ax2);
    float lineY2 = 1.0 - smoothstep(ty2, ty2 + aay2, ay2);
    if (uLineStyle > 0.5) {
        float dashRepeat2 = 4.0;
        float dashDuty2 = 0.5;
        float vy2m = fract(gridUV2.y * dashRepeat2);
        float vx2m = fract(gridUV2.x * dashRepeat2);
        float dashMaskY2 = step(vy2m, dashDuty2);
        float dashMaskX2 = step(vx2m, dashDuty2);
        if (uLineStyle < 1.5) {
            lineX2 *= dashMaskY2;
            lineY2 *= dashMaskX2;
        } else {
            float dotRepeat2 = 6.0;
            float dotWidth2 = 0.18;
            float cy2 = abs(fract(gridUV2.y * dotRepeat2) - 0.5);
            float cx2 = abs(fract(gridUV2.x * dotRepeat2) - 0.5);
            float dotMaskY2 = 1.0 - smoothstep(dotWidth2, dotWidth2 + fwidth(gridUV2.y * dotRepeat2), cy2);
            float dotMaskX2 = 1.0 - smoothstep(dotWidth2, dotWidth2 + fwidth(gridUV2.x * dotRepeat2), cx2);
            lineX2 *= dotMaskY2;
            lineY2 *= dotMaskX2;
        }
    }
    float altMask = max(lineX2, lineY2);

    float edgeDistX = min(abs(hit.x - (-0.5)), abs(hit.x - 0.5));
    float edgeDistY = min(abs(hit.y - (-0.2)), abs(hit.y - 0.2));
    float edgeDist = mix(edgeDistY, edgeDistX, hitIsY);
    float edgeGate = 1.0 - smoothstep(gridScale * 0.5, gridScale * 2.0, edgeDist);
    altMask *= edgeGate;

    float lineMask = max(primaryMask, altMask);

    float fade = exp(-dist * fadeStrength);

    float dur = max(0.05, uScanDuration);
    float del = max(0.0, uScanDelay);
    float scanZMax = 2.0;
    float widthScale = max(0.1, uScanGlow);
    float sigma = max(0.001, 0.18 * widthScale * uScanSoftness);
    float sigmaA = sigma * 2.0;

    float combinedPulse = 0.0;
    float combinedAura = 0.0;

    float cycle = dur + del;
    float tCycle = mod(iTime, cycle);
    float scanPhase = clamp((tCycle - del) / dur, 0.0, 1.0);
    float phase = scanPhase;
    if (uScanDirection > 0.5 && uScanDirection < 1.5) {
        phase = 1.0 - phase;
    } else if (uScanDirection > 1.5) {
        float t2 = mod(max(0.0, iTime - del), 2.0 * dur);
        phase = (t2 < dur) ? (t2 / dur) : (1.0 - (t2 - dur) / dur);
    }
    float scanZ = phase * scanZMax;
    float dz = abs(hit.z - scanZ);
    float lineBand = exp(-0.5 * (dz * dz) / (sigma * sigma));
    float taper = clamp(uPhaseTaper, 0.0, 0.49);
    float headW = taper;
    float tailW = taper;
    float headFade = smoother01(0.0, headW, phase);
    float tailFade = 1.0 - smoother01(1.0 - tailW, 1.0, phase);
    float phaseWindow = headFade * tailFade;
    float pulseBase = lineBand * phaseWindow;
    combinedPulse += pulseBase * clamp(uScanOpacity, 0.0, 1.0);
    float auraBand = exp(-0.5 * (dz * dz) / (sigmaA * sigmaA));
    combinedAura += (auraBand * 0.25) * phaseWindow * clamp(uScanOpacity, 0.0, 1.0);

    for (int i = 0; i < MAX_SCANS; i++) {
        if (float(i) >= uScanCount) break;
        float tActiveI = iTime - uScanStarts[i];
        float phaseI = clamp(tActiveI / dur, 0.0, 1.0);
        if (uScanDirection > 0.5 && uScanDirection < 1.5) {
            phaseI = 1.0 - phaseI;
        } else if (uScanDirection > 1.5) {
            phaseI = (phaseI < 0.5) ? (phaseI * 2.0) : (1.0 - (phaseI - 0.5) * 2.0);
        }
        float scanZI = phaseI * scanZMax;
        float dzI = abs(hit.z - scanZI);
        float lineBandI = exp(-0.5 * (dzI * dzI) / (sigma * sigma));
        float headFadeI = smoother01(0.0, headW, phaseI);
        float tailFadeI = 1.0 - smoother01(1.0 - tailW, 1.0, phaseI);
        float phaseWindowI = headFadeI * tailFadeI;
        combinedPulse += lineBandI * phaseWindowI * clamp(uScanOpacity, 0.0, 1.0);
        float auraBandI = exp(-0.5 * (dzI * dzI) / (sigmaA * sigmaA));
        combinedAura += (auraBandI * 0.25) * phaseWindowI * clamp(uScanOpacity, 0.0, 1.0);
    }

    float lineVis = lineMask;
    vec3 gridCol = uLinesColor * lineVis * fade;
    vec3 scanCol = uScanColor * combinedPulse;
    vec3 scanAura = uScanColor * combinedAura;

    color = gridCol + scanCol + scanAura;

    float n = fract(sin(dot(gl_FragCoord.xy + vec2(iTime * 123.4), vec2(12.9898,78.233))) * 43758.5453123);
    color += (n - 0.5) * uNoise;
    color = clamp(color, 0.0, 1.0);
    float alpha = clamp(max(lineVis, combinedPulse), 0.0, 1.0);
    float gx = 1.0 - smoothstep(tx * 2.0, tx * 2.0 + aax * 2.0, ax);
    float gy = 1.0 - smoothstep(ty * 2.0, ty * 2.0 + aay * 2.0, ay);
    float halo = max(gx, gy) * fade;
    alpha = max(alpha, halo * clamp(uBloomOpacity, 0.0, 1.0));
    fragColor = vec4(color, alpha);
}

void main(){
  vec4 c;
  mainImage(c, vUv * iResolution.xy);
  gl_FragColor = c;
}
`;

function srgbColor(hex) {
    const c = new THREE.Color(hex);
    return c.convertSRGBToLinear();
}

function smoothDampVec2(current, target, currentVelocity, smoothTime, maxSpeed, deltaTime) {
    const out = current.clone();
    smoothTime = Math.max(0.0001, smoothTime);
    const omega = 2 / smoothTime;
    const x = omega * deltaTime;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  
    let change = current.clone().sub(target);
    const originalTo = target.clone();
  
    const maxChange = maxSpeed * smoothTime;
    if (change.length() > maxChange) change.setLength(maxChange);
  
    target = current.clone().sub(change);
    const temp = currentVelocity.clone().addScaledVector(change, omega).multiplyScalar(deltaTime);
    currentVelocity.sub(temp.clone().multiplyScalar(omega));
    currentVelocity.multiplyScalar(exp);
  
    out.copy(target.clone().add(change.add(temp).multiplyScalar(exp)));
  
    const origMinusCurrent = originalTo.clone().sub(current);
    const outMinusOrig = out.clone().sub(originalTo);
    if (origMinusCurrent.dot(outMinusOrig) > 0) {
      out.copy(originalTo);
      currentVelocity.set(0, 0);
    }
    return out;
  }
  
  function smoothDampFloat(current, target, velRef, smoothTime, maxSpeed, deltaTime) {
    smoothTime = Math.max(0.0001, smoothTime);
    const omega = 2 / smoothTime;
    const x = omega * deltaTime;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  
    let change = current - target;
    const originalTo = target;
  
    const maxChange = maxSpeed * smoothTime;
    change = Math.sign(change) * Math.min(Math.abs(change), maxChange);
  
    target = current - change;
    const temp = (velRef.v + omega * change) * deltaTime;
    velRef.v = (velRef.v - omega * temp) * exp;
  
    let out = target + (change + temp) * exp;
  
    const origMinusCurrent = originalTo - current;
    const outMinusOrig = out - originalTo;
    if (origMinusCurrent * outMinusOrig > 0) {
      out = originalTo;
      velRef.v = 0;
    }
    return { value: out, v: velRef.v };
  }
  
  function medianPush(buf, v, maxLen) {
    buf.push(v);
    if (buf.length > maxLen) buf.shift();
  }
  
  function median(buf) {
    if (buf.length === 0) return 0;
    const a = [...buf].sort((x, y) => x - y);
    const mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) * 0.5;
  }
  
  function centroid(points) {
    let x = 0,
      y = 0;
    const n = points.length || 1;
    for (const p of points) {
      x += p.x;
      y += p.y;
    }
    return { x: x / n, y: y / n };
  }
  
  function dist2(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

export class GridScan {
    constructor(container, options = {}) {
        this.container = container;
        this.config = Object.assign({
            enableWebcam: false,
            showPreview: false,
            modelsPath: 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights',
            sensitivity: 0.55,
            lineThickness: 1,
            linesColor: '#392e4e',
            scanColor: '#FF9FFC',
            scanOpacity: 0.4,
            gridScale: 0.1,
            lineStyle: 'solid',
            lineJitter: 0.1,
            scanDirection: 'pingpong',
            enablePost: true,
            bloomIntensity: 0.6,
            bloomThreshold: 0,
            bloomSmoothing: 0,
            chromaticAberration: 0.002,
            noiseIntensity: 0.01,
            scanGlow: 0.5,
            scanSoftness: 2,
            scanPhaseTaper: 0.9,
            scanDuration: 2.0,
            scanDelay: 2.0,
            enableGyro: false,
            scanOnClick: false,
            snapBackDelay: 250
        }, options);

        this.modelsReady = false;
        this.uiFaceActive = false;
        
        this.lookTarget = new THREE.Vector2(0, 0);
        this.tiltTarget = 0;
        this.yawTarget = 0;
        
        this.lookCurrent = new THREE.Vector2(0, 0);
        this.lookVel = new THREE.Vector2(0, 0);
        this.tiltCurrent = 0;
        this.tiltVel = { v: 0 };
        this.yawCurrent = 0;
        this.yawVel = { v: 0 };

        this.MAX_SCANS = 8;
        this.scanStarts = [];
        
        this.bufX = [];
        this.bufY = [];
        this.bufT = [];
        this.bufYaw = [];

        const s = THREE.MathUtils.clamp(this.config.sensitivity, 0, 1);
        this.skewScale = THREE.MathUtils.lerp(0.06, 0.2, s);
        this.tiltScale = THREE.MathUtils.lerp(0.12, 0.3, s);
        this.yawScale = THREE.MathUtils.lerp(0.1, 0.28, s);
        this.depthResponse = THREE.MathUtils.lerp(0.25, 0.45, s);
        this.smoothTime = THREE.MathUtils.lerp(0.45, 0.12, s);
        this.maxSpeed = Infinity;
        this.yBoost = THREE.MathUtils.lerp(1.2, 1.6, s);

        this.stopFaceTracking = false;
        this.raf = null;
        this.leaveTimer = null;
        
        this.initDOM();
        this.initThree();
        this.addEventListeners();
        this.loadModels();
        if (this.config.enableWebcam || this.config.showPreview) {
            this.startWebcam();
        }
    }

    pushScan(t) {
        if (this.scanStarts.length >= this.MAX_SCANS) this.scanStarts.shift();
        this.scanStarts.push(t);
        if (this.material) {
            const u = this.material.uniforms;
            const buf = new Array(this.MAX_SCANS).fill(0);
            for (let i = 0; i < this.scanStarts.length && i < this.MAX_SCANS; i++) buf[i] = this.scanStarts[i];
            u.uScanStarts.value = buf;
            u.uScanCount.value = this.scanStarts.length;
        }
    }

    initDOM() {
        this.container.classList.add('gridscan');
        if (this.config.showPreview) {
            this.previewContainer = document.createElement('div');
            this.previewContainer.className = 'gridscan__preview';
            this.video = document.createElement('video');
            this.video.className = 'gridscan__video';
            this.video.muted = true;
            this.video.playsInline = true;
            this.video.autoplay = true;
            this.badge = document.createElement('div');
            this.badge.className = 'gridscan__badge';
            this.previewContainer.appendChild(this.video);
            this.previewContainer.appendChild(this.badge);
            this.container.appendChild(this.previewContainer);
            this.updateBadge();
        }
    }

    updateBadge() {
        if (!this.badge) return;
        if (this.config.enableWebcam) {
            if (this.modelsReady) {
                if (this.uiFaceActive) this.badge.textContent = 'Face: tracking';
                else this.badge.textContent = 'Face: searching';
            } else {
                this.badge.textContent = 'Loading models';
            }
        } else {
            this.badge.textContent = 'Webcam disabled';
        }
    }

    initThree() {
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer = renderer;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.autoClear = false;
        renderer.setClearColor(0x000000, 0);
        this.container.appendChild(renderer.domElement);
    
        const uniforms = {
            iResolution: {
                value: new THREE.Vector3(this.container.clientWidth, this.container.clientHeight, renderer.getPixelRatio())
            },
            iTime: { value: 0 },
            uSkew: { value: new THREE.Vector2(0, 0) },
            uTilt: { value: 0 },
            uYaw: { value: 0 },
            uLineThickness: { value: this.config.lineThickness },
            uLinesColor: { value: srgbColor(this.config.linesColor) },
            uScanColor: { value: srgbColor(this.config.scanColor) },
            uGridScale: { value: this.config.gridScale },
            uLineStyle: { value: this.config.lineStyle === 'dashed' ? 1 : this.config.lineStyle === 'dotted' ? 2 : 0 },
            uLineJitter: { value: Math.max(0, Math.min(1, this.config.lineJitter || 0)) },
            uScanOpacity: { value: this.config.scanOpacity },
            uNoise: { value: this.config.noiseIntensity },
            uBloomOpacity: { value: this.config.bloomIntensity },
            uScanGlow: { value: this.config.scanGlow },
            uScanSoftness: { value: this.config.scanSoftness },
            uPhaseTaper: { value: this.config.scanPhaseTaper },
            uScanDuration: { value: this.config.scanDuration },
            uScanDelay: { value: this.config.scanDelay },
            uScanDirection: { value: this.config.scanDirection === 'backward' ? 1 : this.config.scanDirection === 'pingpong' ? 2 : 0 },
            uScanStarts: { value: new Array(this.MAX_SCANS).fill(0) },
            uScanCount: { value: 0 }
        };
    
        const material = new THREE.ShaderMaterial({
            uniforms,
            vertexShader: vert,
            fragmentShader: frag,
            transparent: true,
            depthWrite: false,
            depthTest: false
        });
        this.material = material;
    
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        this.scene.add(this.quad);
    
        if (this.config.enablePost) {
            this.composer = new EffectComposer(renderer);
            const renderPass = new RenderPass(this.scene, this.camera);
            this.composer.addPass(renderPass);
    
            this.bloom = new BloomEffect({
                intensity: 1.0,
                luminanceThreshold: this.config.bloomThreshold,
                luminanceSmoothing: this.config.bloomSmoothing
            });
            this.bloom.blendMode.opacity.value = Math.max(0, this.config.bloomIntensity);
    
            this.chroma = new ChromaticAberrationEffect({
                offset: new THREE.Vector2(this.config.chromaticAberration, this.config.chromaticAberration),
                radialModulation: true,
                modulationOffset: 0.0
            });
    
            const effectPass = new EffectPass(this.camera, this.bloom, this.chroma);
            effectPass.renderToScreen = true;
            this.composer.addPass(effectPass);
        }
    
        let last = performance.now();
        const tick = () => {
            const now = performance.now();
            const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
            last = now;
    
            this.lookCurrent.copy(
                smoothDampVec2(this.lookCurrent, this.lookTarget, this.lookVel, this.smoothTime, this.maxSpeed, dt)
            );
    
            const tiltSm = smoothDampFloat(
                this.tiltCurrent,
                this.tiltTarget,
                this.tiltVel,
                this.smoothTime,
                this.maxSpeed,
                dt
            );
            this.tiltCurrent = tiltSm.value;
    
            const yawSm = smoothDampFloat(
                this.yawCurrent,
                this.yawTarget,
                this.yawVel,
                this.smoothTime,
                this.maxSpeed,
                dt
            );
            this.yawCurrent = yawSm.value;
    
            const skew = new THREE.Vector2(this.lookCurrent.x * this.skewScale, -this.lookCurrent.y * this.yBoost * this.skewScale);
            material.uniforms.uSkew.value.set(skew.x, skew.y);
            material.uniforms.uTilt.value = this.tiltCurrent * this.tiltScale;
            material.uniforms.uYaw.value = THREE.MathUtils.clamp(this.yawCurrent * this.yawScale, -0.6, 0.6);
    
            material.uniforms.iTime.value = now / 1000;
            renderer.clear(true, true, true);
            if (this.composer) {
                this.composer.render(dt);
            } else {
                renderer.render(this.scene, this.camera);
            }
            this.raf = requestAnimationFrame(tick);
        };
        this.raf = requestAnimationFrame(tick);
    }

    addEventListeners() {
        this.onMove = (e) => {
            if (this.uiFaceActive) return;
            if (this.leaveTimer) {
                clearTimeout(this.leaveTimer);
                this.leaveTimer = null;
            }
            const rect = this.container.getBoundingClientRect();
            const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
            this.lookTarget.set(nx, ny);
        };

        this.onEnter = () => {
            if (this.leaveTimer) {
                clearTimeout(this.leaveTimer);
                this.leaveTimer = null;
            }
        };

        this.onClick = async () => {
            const nowSec = performance.now() / 1000;
            if (this.config.scanOnClick) this.pushScan(nowSec);
            if (
                this.config.enableGyro &&
                typeof window !== 'undefined' &&
                window.DeviceOrientationEvent &&
                DeviceOrientationEvent.requestPermission
            ) {
                try {
                    await DeviceOrientationEvent.requestPermission();
                } catch {
                    // noop
                }
            }
        };

        this.onLeave = () => {
            if (this.uiFaceActive) return;
            if (this.leaveTimer) clearTimeout(this.leaveTimer);
            this.leaveTimer = window.setTimeout(
                () => {
                    this.lookTarget.set(0, 0);
                    this.tiltTarget = 0;
                    this.yawTarget = 0;
                },
                Math.max(0, this.config.snapBackDelay || 0)
            );
        };

        this.onResize = () => {
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.material.uniforms.iResolution.value.set(this.container.clientWidth, this.container.clientHeight, this.renderer.getPixelRatio());
            if (this.composer) this.composer.setSize(this.container.clientWidth, this.container.clientHeight);
        };

        this.onDeviceOrientation = (e) => {
            if (this.uiFaceActive || !this.config.enableGyro) return;
            const gamma = e.gamma ?? 0;
            const beta = e.beta ?? 0;
            const nx = THREE.MathUtils.clamp(gamma / 45, -1, 1);
            const ny = THREE.MathUtils.clamp(-beta / 30, -1, 1);
            this.lookTarget.set(nx, ny);
            this.tiltTarget = THREE.MathUtils.degToRad(gamma) * 0.4;
        };

        this.container.addEventListener('mousemove', this.onMove);
        this.container.addEventListener('mouseenter', this.onEnter);
        if (this.config.scanOnClick) this.container.addEventListener('click', this.onClick);
        this.container.addEventListener('mouseleave', this.onLeave);
        window.addEventListener('resize', this.onResize);
        if (this.config.enableGyro) window.addEventListener('deviceorientation', this.onDeviceOrientation);
    }

    async loadModels() {
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(this.config.modelsPath),
                faceapi.nets.faceLandmark68TinyNet.loadFromUri(this.config.modelsPath)
            ]);
            this.modelsReady = true;
            this.updateBadge();
        } catch(e) {
            console.error("FaceAPI load failed", e);
            this.modelsReady = false;
            this.updateBadge();
        }
    }

    async startWebcam() {
        if (!this.config.enableWebcam || !this.video) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            this.video.srcObject = stream;
            // Wait until the video says it has loaded metadata or is playing
            this.video.onloadedmetadata = async () => {
               await this.video.play();
               this.detectFace();
            };
        } catch(e) {
            console.error("Webcam error:", e);
            return;
        }
    }

    detectFace() {
        if (this.stopFaceTracking) return;
        const video = this.video;
        if (!video || !this.modelsReady) {
            requestAnimationFrame(() => this.detectFace());
            return;
        }

        const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
        let lastDetect = 0;

        const loop = async (ts) => {
            if (this.stopFaceTracking) return;

            if (ts - lastDetect >= 33) {
                lastDetect = ts;
                try {
                    const res = await faceapi.detectSingleFace(video, opts).withFaceLandmarks(true);
                    if (res && res.detection) {
                        const det = res.detection;
                        const box = det.box;
                        const vw = video.videoWidth || 1;
                        const vh = video.videoHeight || 1;

                        const cx = box.x + box.width * 0.5;
                        const cy = box.y + box.height * 0.5;
                        const nx = (cx / vw) * 2 - 1;
                        const ny = (cy / vh) * 2 - 1;
                        medianPush(this.bufX, nx, 5);
                        medianPush(this.bufY, ny, 5);
                        const nxm = median(this.bufX);
                        const nym = median(this.bufY);

                        const look = new THREE.Vector2(Math.tanh(nxm), Math.tanh(nym));

                        const faceSize = Math.min(1, Math.hypot(box.width / vw, box.height / vh));
                        const depthScale = 1 + this.depthResponse * (faceSize - 0.25);
                        this.lookTarget.copy(look.multiplyScalar(depthScale));

                        const leftEye = res.landmarks.getLeftEye();
                        const rightEye = res.landmarks.getRightEye();
                        const lc = centroid(leftEye);
                        const rc = centroid(rightEye);
                        const tilt = Math.atan2(rc.y - lc.y, rc.x - lc.x);
                        medianPush(this.bufT, tilt, 5);
                        this.tiltTarget = median(this.bufT);

                        const nose = res.landmarks.getNose();
                        const tip = nose[nose.length - 1] || nose[Math.floor(nose.length / 2)];
                        const jaw = res.landmarks.getJawOutline();
                        const leftCheek = jaw[3] || jaw[2];
                        const rightCheek = jaw[13] || jaw[14];
                        const dL = dist2(tip, leftCheek);
                        const dR = dist2(tip, rightCheek);
                        const eyeDist = Math.hypot(rc.x - lc.x, rc.y - lc.y) + 1e-6;
                        let yawSignal = THREE.MathUtils.clamp((dR - dL) / (eyeDist * 1.6), -1, 1);
                        yawSignal = Math.tanh(yawSignal);
                        medianPush(this.bufYaw, yawSignal, 5);
                        this.yawTarget = median(this.bufYaw);

                        this.uiFaceActive = true;
                        this.updateBadge();
                    } else {
                        this.uiFaceActive = false;
                        this.updateBadge();
                    }
                } catch {
                    this.uiFaceActive = false;
                    this.updateBadge();
                }
            }

            if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
                video.requestVideoFrameCallback(() => loop(performance.now()));
            } else {
                requestAnimationFrame(loop);
            }
        };

        requestAnimationFrame(loop);
    }

    destroy() {
        if (this.raf) cancelAnimationFrame(this.raf);
        this.stopFaceTracking = true;

        this.container.removeEventListener('mousemove', this.onMove);
        this.container.removeEventListener('mouseenter', this.onEnter);
        if (this.config.scanOnClick) this.container.removeEventListener('click', this.onClick);
        this.container.removeEventListener('mouseleave', this.onLeave);
        window.removeEventListener('resize', this.onResize);
        if (this.config.enableGyro) window.removeEventListener('deviceorientation', this.onDeviceOrientation);

        this.material.dispose();
        this.quad.geometry.dispose();

        if (this.composer) {
            this.composer.dispose();
        }
        this.renderer.dispose();
        this.renderer.forceContextLoss();
        this.container.removeChild(this.renderer.domElement);

        if (this.video) {
            const stream = this.video.srcObject;
            if (stream) stream.getTracks().forEach(t => t.stop());
            this.video.pause();
            this.video.srcObject = null;
        }
        if (this.previewContainer) {
            this.container.removeChild(this.previewContainer);
        }
    }
}
