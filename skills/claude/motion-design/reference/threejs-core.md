# Three.js Core

For visuals that need the GPU: 3D product showcases, scroll-driven camera journeys, shader image reveals, particle systems. Renderer choice, scene setup, DOM sync, materials, lighting, and disposal are here. Shaders and post-processing are in [threejs-shaders-particles.md](threejs-shaders-particles.md).

## Status

As of November 2026, three.js is r187 (`three` 0.187.0):

- `WebGLRenderer` is maintained, and the three.js manual calls it "the recommended choice for pure WebGL 2 applications". No larger new features are planned for it.
- `WebGPURenderer` is where new work lands, and the manual still calls it "in an experimental state". It falls back to WebGL 2 when WebGPU is unavailable.
- Deprecated: `THREE.Clock` (r183, use `Timer`), `RGBELoader` (r180, use `HDRLoader`), the `PostProcessing` class (r183, renamed `RenderPipeline`).

Three.js ships every one to two months and deprecates on a short cycle. Read the [migration guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide) for every release between the pinned version and the one you're moving to.

## Contents

- [Choosing a Renderer](#choosing-a-renderer)
- [Scene Setup](#scene-setup)
- [DOM-Canvas Sync](#dom-canvas-sync)
- [Scroll-Driven Camera with GSAP](#scroll-driven-camera-with-gsap)
- [Materials](#materials)
- [Lighting](#lighting)
- [Memory Management](#memory-management)
- [Reduced Motion](#reduced-motion)

## Choosing a Renderer

The two renderers aren't interchangeable at the material and post-processing level. Decide before writing shaders. A project is on one, and porting means rewriting every custom material and the whole post chain.

| | `WebGLRenderer` | `WebGPURenderer` |
| --- | --- | --- |
| Import | `three` | `three/webgpu` (plus `three/tsl`) |
| Custom materials | `ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile()` with GLSL | Node materials and TSL only. None of the GLSL routes are supported. |
| Post-processing | `EffectComposer` and passes | `RenderPipeline` and TSL effect nodes. `EffectComposer` is not supported. |
| Initialization | Synchronous | Asynchronous: use `setAnimationLoop()`, or `await renderer.init()` first |
| Maturity | Stable, feature-frozen | Experimental, actively developed |

Use `WebGLRenderer` when the work is GLSL-based (existing or ported shaders, `EffectComposer` chains) or needs the most predictable behavior across devices. Every GLSL example in this skill assumes it.

Use `WebGPURenderer` for a new project that wants TSL materials, compute shaders, or effects that exist only on the node stack, and can absorb an occasional missing feature. The WebGL 2 fallback means it doesn't drop browsers. It does mean every custom shader is TSL.

## Scene Setup

```javascript
import * as THREE from "three";

// Fixed canvas behind DOM content: canvas.scene { position: fixed; inset: 0; }
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("canvas.scene"),
    antialias: true,
    alpha: true   // transparent clear so the page shows through
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));   // above 2 costs fill rate for no visible gain

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

const timer = new THREE.Timer();
timer.connect(document);   // pauses time while the tab is hidden: no huge first delta

function render(timestamp) {
    timer.update(timestamp);
    // update uniforms, camera, synced meshes here; timer.getElapsed() is seconds
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(render);   // start once assets are loaded

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
```

On WebGPU only the import and constructor change. Scene graph, camera, lights, and built-in materials are the same.

```javascript
import * as THREE from "three/webgpu";

const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setAnimationLoop(render);   // waits for async initialization before the first frame

// Only if the renderer is used before the loop starts:  await renderer.init();
// To test the fallback path:  new THREE.WebGPURenderer({ forceWebGL: true });
```

Stop the loop when the canvas is off screen (`renderer.setAnimationLoop(null)` from an `IntersectionObserver`) and restart it on re-entry. A hero scene that keeps rendering below the fold drains battery for nothing.

## DOM-Canvas Sync

To put meshes exactly over DOM elements, set the camera so one world unit equals one CSS pixel at z = 0. DOM rects then map straight to mesh position and scale.

```javascript
const CAMERA_DISTANCE = 600;

function fitCameraToViewport() {
    camera.position.z = CAMERA_DISTANCE;
    camera.fov = 2 * THREE.MathUtils.radToDeg(Math.atan(window.innerHeight / 2 / CAMERA_DISTANCE));
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.far = CAMERA_DISTANCE * 2;
    camera.updateProjectionMatrix();
}

// The mesh uses a unit plane: new THREE.PlaneGeometry(1, 1)
function syncMeshToElement(mesh, element) {
    const rect = element.getBoundingClientRect();

    mesh.scale.set(rect.width, rect.height, 1);
    mesh.position.x = rect.left + rect.width / 2 - window.innerWidth / 2;
    mesh.position.y = -(rect.top + rect.height / 2 - window.innerHeight / 2);
}
```

Call `syncMeshToElement` inside the render loop, not in a scroll handler, so the mesh and the DOM are measured in the frame they're drawn. With smooth scrolling, drive Lenis from the same loop (or both from `gsap.ticker`) so DOM and canvas never disagree by a frame.

## Scroll-Driven Camera with GSAP

```javascript
const cameraPath = { x: 0, y: 2, z: 8 };

gsap.timeline({
    defaults: { ease: "none" },   // scrubbed: scroll position is the clock
    scrollTrigger: {
        trigger: ".scene-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 1
    }
})
.to(cameraPath, { z: 4, duration: 1 })
.to(cameraPath, { x: 1.5, y: 0, z: 2, duration: 1.5 })
.to(cameraPath, { x: 0, y: -1, z: 6, duration: 1 });

// In the render loop
camera.position.set(cameraPath.x, cameraPath.y, cameraPath.z);
camera.lookAt(0, 0, 0);
```

## Materials

`MeshStandardMaterial` is right for most surfaces and works on both renderers. It's PBR: `roughness` runs 0 mirror to 1 diffuse, `metalness` 0 dielectric to 1 metal.

Custom shading on `WebGLRenderer` is a `ShaderMaterial` with GLSL:

```javascript
const shaderMaterial = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;

        void main() {
            vec3 color = vec3(vUv, 0.5 + 0.5 * sin(uTime));
            gl_FragColor = vec4(color, 1.0);
            #include <colorspace_fragment>
        }
    `,
    uniforms: {
        uTime: { value: 0 }
    }
});

// In the render loop
shaderMaterial.uniforms.uTime.value = timer.getElapsed();
```

Without `#include <colorspace_fragment>` a `ShaderMaterial` writes linear values straight to an sRGB canvas and renders too dark next to built-in materials.

The same material on `WebGPURenderer` is a node material with TSL. No shader strings, and time is a built-in node.

```javascript
import * as THREE from "three/webgpu";
import { uniform, uv, time, vec3, sin } from "three/tsl";

const progress = uniform(0);   // animate progress.value from GSAP

const nodeMaterial = new THREE.MeshBasicNodeMaterial();
nodeMaterial.colorNode = vec3(uv(), sin(time).mul(0.5).add(0.5));
nodeMaterial.opacityNode = progress;
nodeMaterial.transparent = true;
```

TSL's surface is large and still moving. Look the node up in the [TSL reference](https://threejs.org/docs/pages/TSL.html). Don't guess its name.

## Lighting

Key, fill, and rim directional lights plus a low ambient cover most product scenes. `castShadow` does nothing until `renderer.shadowMap.enabled = true`. An environment map gives metallic and glossy materials something to reflect, and it's usually worth more than extra lights:

```javascript
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";

const pmremGenerator = new THREE.PMREMGenerator(renderer);

new HDRLoader().load("/studio.hdr", (texture) => {
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    scene.environment = envMap;     // lights all PBR materials
    scene.background = envMap;      // optional: show it as the backdrop
    texture.dispose();
    pmremGenerator.dispose();
});
```

## Memory Management

Three.js doesn't free GPU resources when an object leaves the scene or is garbage collected. In an SPA, every route change that builds a scene without disposing the last one leaks geometry, textures, and render targets until the tab crashes.

```javascript
function disposeScene(scene) {
    scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();

        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
            if (!material) continue;
            for (const value of Object.values(material)) {
                if (value?.isTexture) value.dispose();
            }
            material.dispose();
        }
    });

    scene.environment?.dispose();
}

function teardown() {
    renderer.setAnimationLoop(null);
    disposeScene(scene);
    composer?.dispose();     // EffectComposer render targets, if used
    timer.dispose();
    renderer.dispose();
}
```

`renderer.info.memory` reports live geometry and texture counts. They should be back at zero after teardown.

## Reduced Motion

A WebGL scene is motion. Under `prefers-reduced-motion: reduce`, render a single still frame instead of running the loop, drop scroll-driven camera moves, and freeze shader time. If the scene carries no information, show a static image and don't load Three.js at all.
