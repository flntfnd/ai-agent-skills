# Three.js: Shaders, Post-Processing & Particles

GLSL for scroll-driven image reveals, the post-processing pipeline, style-specific shader looks, and GPU particle systems. Read [threejs-core.md](threejs-core.md) first for renderer choice, scene setup, and memory management.

## Status

As of November 2026 (three.js r187):

Every GLSL example here targets `WebGLRenderer`, `ShaderMaterial`, and `EffectComposer`. None of it runs on `WebGPURenderer`. Its equivalents are TSL node materials and `RenderPipeline` ([below](#post-processing-on-webgpurenderer)). Addon signatures change between releases: `FilmPass` lost its scanline parameters, `FXAAPass` is new. When a constructor doesn't behave as shown, read the addon's source for the pinned version.

## Contents

- [Image Reveal Shaders](#image-reveal-shaders)
- [Post-Processing with EffectComposer](#post-processing-with-effectcomposer)
- [Post-Processing on WebGPURenderer](#post-processing-on-webgpurenderer)
- [Style-Specific Shaders](#style-specific-shaders)
- [Particle Systems](#particle-systems)

## Image Reveal Shaders

```glsl
// Fragment shader: scroll-triggered image reveal with distortion
uniform sampler2D uTexture;
uniform float uProgress;    // 0 = hidden, 1 = revealed
uniform float uTime;

varying vec2 vUv;

void main() {
    vec2 uv = vUv;

    // Distortion wave that fades out as the reveal completes
    float wave = sin(uv.y * 12.0 + uTime * 2.0) * 0.05 * (1.0 - uProgress);
    uv.x += wave;

    // Wipe from left to right with a soft edge; fully visible at uProgress = 1
    float edge = uProgress * 1.2 - 0.1;
    float reveal = 1.0 - smoothstep(edge - 0.1, edge + 0.1, vUv.x);

    vec4 color = texture2D(uTexture, uv);
    gl_FragColor = vec4(color.rgb, color.a * reveal);
    #include <colorspace_fragment>
}
```

```javascript
// The material needs transparent: true. DURATION and the ease names
// are the tokens registered in gsap.md.
gsap.to(material.uniforms.uProgress, {
    value: 1,
    duration: DURATION.cinematic,
    ease: "expo-out",
    scrollTrigger: {
        trigger: imageElement,
        start: "top 70%",
        once: true
    }
});
```

## Post-Processing with EffectComposer

`EffectComposer` is the `WebGLRenderer` post-processing pipeline: an ordered list of passes, each drawing a full-screen quad. Each pass costs a full-resolution draw, so three or four is a practical ceiling on mobile.

Order matters. Effects that work on scene-referred color (bloom, depth of field) come before `OutputPass`, which applies tone mapping and the sRGB conversion. FXAA comes after it because it needs sRGB input. Screen-surface looks like grain and CRT go on the final image too.

```javascript
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FilmPass } from "three/addons/postprocessing/FilmPass.js";
import { FXAAPass } from "three/addons/postprocessing/FXAAPass.js";

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Bloom (Futuristic/Sci-Fi: makes emissive elements actually glow)
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.8,    // strength
    0.4,    // radius
    0.85    // threshold: only pixels above this luminance bloom
);
composer.addPass(bloomPass);

// Tone mapping + color space conversion
composer.addPass(new OutputPass());

// Film grain (Retro Computing, Texture/Tactile)
composer.addPass(new FilmPass(0.35, false));   // intensity 0-1, grayscale

// FXAA last: it needs sRGB input. The renderer's antialias option does not
// carry through the composer's render targets, so this is the AA step.
composer.addPass(new FXAAPass());

// Use composer.render() in place of renderer.render()
function render(timestamp) {
    timer.update(timestamp);
    composer.render(timer.getDelta());
}
renderer.setAnimationLoop(render);

// On resize, after renderer.setSize()
composer.setSize(window.innerWidth, window.innerHeight);
```

## Post-Processing on WebGPURenderer

`RenderPipeline` replaces `EffectComposer`. It was called `PostProcessing` before r183. Effects are TSL nodes composed into one output node. The system merges passes where it can and supports multiple render targets natively, so stacked effects cost less than the same composer chain.

```javascript
import * as THREE from "three/webgpu";
import { pass } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

const renderPipeline = new THREE.RenderPipeline(renderer);

const scenePass = pass(scene, camera);
const sceneColor = scenePass.getTextureNode("output");

const bloomPass = bloom(sceneColor);
bloomPass.strength.value = 0.8;
bloomPass.radius.value = 0.4;
bloomPass.threshold.value = 0.85;

renderPipeline.outputNode = sceneColor.add(bloomPass);

// In the loop, in place of renderer.render(scene, camera)
renderPipeline.render();
```

Tone mapping and color space conversion happen automatically at the end of the chain. For an effect that needs sRGB input, like FXAA, turn that off and place the conversion yourself:

```javascript
import { pass, renderOutput } from "three/tsl";
import { fxaa } from "three/addons/tsl/display/FXAANode.js";

renderPipeline.outputColorTransform = false;

const scenePass = pass(scene, camera);
const outputPass = renderOutput(scenePass);   // tone mapping + color space here
renderPipeline.outputNode = fxaa(outputPass);
```

Film grain (`film`), depth of field (`dof`), and the other common effects live in `three/addons/tsl/display/`. Read the node's source header for its parameters before using it.

## Style-Specific Shaders

Each visual style has its own shader or post-processing approach. These are the GPU layer for the style. All GLSL, for `ShaderMaterial` or `ShaderPass`.

**Futuristic / Sci-Fi -- grid + neon glow:**
```glsl
/* Fragment shader for a glowing grid plane */
uniform float uTime;
uniform vec3 uAccentColor;
varying vec2 vUv;

void main() {
    // Anti-aliased grid lines
    vec2 grid = abs(fract(vUv * 20.0 - 0.5) - 0.5) / fwidth(vUv * 20.0);
    float gridLine = 1.0 - min(min(grid.x, grid.y), 1.0);

    // Slow glow pulse
    float pulse = 0.5 + 0.5 * sin(uTime * 0.5);
    float glow = gridLine * (0.6 + pulse * 0.4);

    // Fade toward the edges
    float dist = length(vUv - 0.5) * 2.0;
    float fade = 1.0 - smoothstep(0.6, 1.0, dist);

    gl_FragColor = vec4(uAccentColor * glow * fade, glow * fade);
    #include <colorspace_fragment>
}
```

**Organic / Biomorphic -- noise displacement:**
```glsl
/* Vertex shader: noise-displaced geometry */
uniform float uTime;
varying vec2 vUv;

// Requires a 3D simplex noise function in scope:
// float snoise(vec3 v) { ... }

void main() {
    vUv = uv;
    vec3 pos = position;

    // Displace vertices along their normals
    float noiseVal = snoise(pos * 1.5 + uTime * 0.2) * 0.3;
    pos += normal * noiseVal;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

**Retro Computing -- CRT post-processing:**
```glsl
/* Full-screen CRT effect for a ShaderPass placed after OutputPass */
uniform sampler2D tDiffuse;
uniform float uTime;
varying vec2 vUv;

void main() {
    // Slight barrel distortion
    vec2 uv = vUv - 0.5;
    float dist = length(uv);
    uv *= 1.0 + dist * dist * 0.1;
    uv += 0.5;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // Chromatic aberration
    float aberration = 0.002;
    vec4 color;
    color.r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
    color.g = texture2D(tDiffuse, uv).g;
    color.b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;
    color.a = 1.0;

    // Scanlines
    color.rgb -= sin(uv.y * 800.0) * 0.04;

    // Phosphor green tint
    color.g *= 1.1;

    // Flicker. Keep the amplitude this shallow: full-screen flicker with a
    // large luminance swing is a photosensitivity hazard (WCAG 2.3.1).
    // Freeze uTime under reduced motion.
    float flicker = 0.97 + 0.03 * sin(uTime * 60.0);
    color.rgb *= flicker;

    // Vignette
    color.rgb *= clamp((0.5 - dist * 0.8) * 2.0, 0.0, 1.0);

    gl_FragColor = color;
}
```

**Glassmorphism -- depth-of-field blur:**
```javascript
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";

// Add before OutputPass. focus is a distance in world units; aperture and
// maxblur are tuned by eye for the scene's scale.
const bokehPass = new BokehPass(scene, camera, {
    focus: 5.0,
    aperture: 0.002,
    maxblur: 0.01
});
composer.addPass(bokehPass);

// Focus pull on scroll
gsap.to(bokehPass.uniforms.focus, {
    value: 2.0,
    duration: DURATION.cinematic,
    ease: "sine-in-out",
    scrollTrigger: { trigger: ".glass-section", start: "top center" }
});
```

## Particle Systems

```javascript
// Points with per-particle attributes, animated in the vertex shader
const count = 3000;
const positions = new Float32Array(count * 3);
const scales = new Float32Array(count);

for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    scales[i] = Math.random();
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

const particleMaterial = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
        attribute float aScale;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vScale;

        void main() {
            vScale = aScale;
            vec4 modelPosition = modelMatrix * vec4(position, 1.0);

            // Gentle float
            modelPosition.y += sin(uTime + position.x * 0.5) * 0.1;

            vec4 viewPosition = viewMatrix * modelPosition;
            gl_Position = projectionMatrix * viewPosition;

            // Size attenuates with distance from the camera
            gl_PointSize = aScale * 40.0 * uPixelRatio / -viewPosition.z;
        }
    `,
    fragmentShader: /* glsl */ `
        varying float vScale;

        void main() {
            // Soft-edged disc
            float dist = distance(gl_PointCoord, vec2(0.5));
            float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
            gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * vScale * 0.6);
        }
    `,
    uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending   // overlapping particles brighten
});

const particles = new THREE.Points(geometry, particleMaterial);
scene.add(particles);
```

Do the motion in the vertex shader. It keeps tens of thousands of particles off the main thread, where updating positions from JavaScript re-uploads the whole buffer every frame. For particles that need simulated state (velocity, collisions, flocking), use `WebGPURenderer` compute shaders, not ping-ponged render targets on WebGL.
