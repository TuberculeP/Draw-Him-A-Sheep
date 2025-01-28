import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import gsap from 'gsap'

const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
let isDrawing = false;

// Initialize canvas
ctx.fillStyle = "black";
ctx.lineWidth = 10;
ctx.lineCap = "round";
ctx.strokeStyle = "white";
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Drawing event handlers
canvas.addEventListener("mousedown", () => {
  isDrawing = true;
});
canvas.addEventListener("mouseup", () => {
  isDrawing = false;
  ctx.beginPath();
});
canvas.addEventListener("mousemove", draw);

// Draw function
function draw(event) {
  if (!isDrawing) return;
  ctx.lineTo(
    event.clientX - canvas.offsetLeft,
    event.clientY - canvas.offsetTop
  );
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(
    event.clientX - canvas.offsetLeft,
    event.clientY - canvas.offsetTop
  );
}

// Clear button
document.getElementById("clearButton").addEventListener("click", () => {
  ctx.fillRect(0, 0, canvas.width, canvas.height);
});

// Predict button
document.getElementById("predictButton").addEventListener("click", async () => {
  // Resize the canvas drawing to 28x28 and normalize
  const resizedImage = getResizedImage(canvas, 28, 28);
  const normalizedImage = normalizeImage(resizedImage);

  // Load the ONNX model and make a prediction
  try {
    const modelUrl = "./dl-model/model.onnx"; // Path to your ONNX model
    console.log(await fetch(modelUrl))
    const session = await ort.InferenceSession.create(modelUrl);

    console.log(normalizedImage);
    const inputTensor = new ort.Tensor(
      "float32",
      normalizedImage,
      [1, 1, 28, 28]
    );
    console.log(inputTensor);
    const feeds = { input: inputTensor }; // Replace "input" with the actual input name
    const results = await session.run(feeds);

    const output = results[Object.keys(results)[0]].data;
    const predictedDigit = output.indexOf(Math.max(...output));
    bigOrSmall(predictedDigit)
  } catch (error) {
    console.error("Error during inference:", error);
  }
});

// Helper functions
function getResizedImage(canvas, width, height) {
  const offScreenCanvas = document.createElement("canvas");
  offScreenCanvas.width = width;
  offScreenCanvas.height = height;
  const offScreenCtx = offScreenCanvas.getContext("2d");

  offScreenCtx.drawImage(canvas, 0, 0, width, height);
  return offScreenCtx.getImageData(0, 0, width, height);
}

function normalizeImage(imageData) {
  const { data, width, height } = imageData;
  const normalized = new Float32Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    var grayscale = data[i] / 255.0; // Normalize pixel to [0, 1]
    grayscale = grayscale - 0.1309;
    grayscale = grayscale / 0.3018;
    normalized[i / 4] = grayscale;
  }
  console.log(normalized);
  return normalized;
}


// THREE _________________________________________________________________________________________

/**
 * Loaders
 */
const gltfLoader = new GLTFLoader()
const rgbeLoader = new RGBELoader()

/**
 * Base
 */
// canvasThree
const canvasThree = document.querySelector('canvas.webgl')
console.log('\x1b[44m%s\x1b[0m', 'src/script.js:121 canvasThree', canvasThree);

// Scene
const scene = new THREE.Scene()

/**
 * Update all materials
 */
const updateAllMaterials = () =>
{
    scene.traverse((child) =>
    {
        if(child.isMesh)
        {
            // Activate shadow here
            child.castShadow = true
            child.receiveShadow = true
        }
    })
}

/**
 * Environment map
 */
// Intensity
scene.environmentIntensity = 1

// HDR (RGBE) equirectangular
rgbeLoader.load('./environmentMaps/sky.hdr', (environmentMap) =>
{
    environmentMap.mapping = THREE.EquirectangularReflectionMapping

    scene.environment = environmentMap
    scene.background = environmentMap
})

/**
* Directional light
*/

const directionalLight = new THREE.DirectionalLight('#ffffff', 6)
directionalLight.position.set(-4, 6.5, 2.5)
directionalLight.shadow.bias = -0.004
directionalLight.shadow.normalBias = 0.028
scene.add(directionalLight)



// shadows
directionalLight.castShadow = true
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.scale.set(2, 2, 2)
directionalLight.shadow.mapSize.set(512, 512)

// helper

// const directionalLightHelper = new THREE.CameraHelper(directionalLight.shadow.camera)
// scene.add(directionalLightHelper)

directionalLight.target.position.set(0, 4, 0)
directionalLight.target.updateWorldMatrix()


/**
 * Models
 */
// Helmet

let petitPrince 

gltfLoader.load(
    './models/le_petit_prince/scene.gltf',
    (gltf) =>
    {
        petitPrince = gltf.scene;
        petitPrince.scale.set(3, 3, 3)
        petitPrince.rotation.set(0, Math.PI, 0)
        petitPrince.position.set(3, 1, 0)
        scene.add(petitPrince)

        updateAllMaterials()
    }
)

function bigOrSmall(digit) {
    const ratio = !!digit ? 1.2 : 0.8
    gsap.to(petitPrince.scale, {
        x: petitPrince.scale.x * ratio,
        y: petitPrince.scale.y * ratio,
        z: petitPrince.scale.z * ratio,
        duration: 1, // Durée de l'animation en secondes
        ease: "power2.out", // Éasing pour adoucir l'animation
    })
}

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, resolution.ratio))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(4, 5, 4)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvasThree)
controls.target.y = 3.5
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvasThree,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
const resolution = {ratio: 2}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, resolution.ratio))


// Tone mapping
renderer.toneMapping = THREE.ReinhardToneMapping
renderer.toneMappingExposure = 3

renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

/**
 * Animate
 */
const tick = () =>
{


    // Update controls
    controls.update()


    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()