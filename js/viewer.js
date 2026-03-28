let scene, camera, renderer, loader, currentModel;

init();
loadModels();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaaaaaa);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.5, 3);

  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5,10,7);
  scene.add(light);

  loader = new THREE.GLTFLoader();

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  if (currentModel) currentModel.rotation.y += 0.01;
  renderer.render(scene, camera);
}

async function loadModels() {
  const response = await fetch('metadata/models.json');
  const models = await response.json();

  const select = document.getElementById('modelSelect');
  models.forEach((m, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.text = `${m.name} (${m.team})`;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    const modelData = models[select.value];
    loadModel(modelData.file);
  });

  // Load first model by default
  if (models.length > 0) loadModel(models[0].file);
}

function loadModel(url) {
  if (currentModel) scene.remove(currentModel);
  loader.load(url, (gltf) => {
    currentModel = gltf.scene;
    scene.add(currentModel);
  });
}