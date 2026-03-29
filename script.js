import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const myModels = [
    { name: "Crate", file: "Crate.fbx", cat: "Interactable" },
    { name: "Robo Arm", file: "RoboArm.fbx", cat: "Interactable" },
    { name: "Robo Arm 2", file: "RoboArm2.fbx", cat: "Interactable" },

    { name: "Robot Classic", file: "Robot.fbx", cat: "Characters" },
    { name: "Robot V2", file: "RobotV2.fbx", cat: "Characters" },
    { name: "Robot V3", file: "RobotV3.fbx", cat: "Characters" },
    { name: "Robot V4", file: "RobotV4.fbx", cat: "Characters" },

    { name: "Generator", file: "Generator.fbx", cat: "Props" },
    { name: "Industrial Tank", file: "IndustrialTank.fbx", cat: "Props" },
    { name: "Tank Stand", file: "IndustrialTankStand.fbx", cat: "Props" },
    { name: "Tank Tower", file: "IndustrialTankTower.fbx", cat: "Props" },
    { name: "Stand Button", file: "StandButton.fbx", cat: "Props" },
    { name: "Wooden Pallet", file: "WoodenPallet.fbx", cat: "Props" },
    { name: "Metal Barrel", file: "MetalBarrelRed.fbx", cat: "Props" },
    { name: "Metal Barrel", file: "MetalBarrelBlue.fbx", cat: "Props" },
    { name: "Metal Barrel", file: "MetalBarrelBlack.fbx", cat: "Props" },

    { name: "Fire Warning", file: "FireWarningSign.fbx", cat: "Decor" },
    { name: "Electrical Warning", file: "ElectricalWarningSign.fbx", cat: "Decor" },
    { name: "Radioactive Warning", file: "RadioActiveWarningSign.fbx", cat: "Decor" }
];

const grid = document.getElementById('asset-grid');
const modalEl = document.getElementById('modal');
const loader = new FBXLoader();
let mainScene, mainCam, mainRenderer, mainControls, currentModel;

// --- SECVENTIAL SNAPSHOT ENGINE ---
async function getSnapshot(fileName) {
    return new Promise((resolve) => {
        const size = 256;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(size, size);
        const scene = new THREE.Scene();
        
        // Strong lights for dark theme contrast
        scene.add(new THREE.AmbientLight(0xffffff, 1.2)); 
        const d1 = new THREE.DirectionalLight(0xffffff, 1.5);
        d1.position.set(1, 1, 1);
        scene.add(d1);
        const d2 = new THREE.DirectionalLight(0xffffff, 0.8);
        d2.position.set(-1, 0.5, -1);
        scene.add(d2);

        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10000);
        
        loader.load(`models/${fileName}`, (obj) => {
            const box = new THREE.Box3().setFromObject(obj);
            const center = box.getCenter(new THREE.Vector3());
            const bSize = box.getSize(new THREE.Vector3()).length();
            obj.position.sub(center);
            scene.add(obj);
            
            camera.position.set(bSize * 0.8, bSize * 0.8, bSize * 0.8);
            camera.lookAt(0,0,0);
            
            renderer.render(scene, camera);
            const data = renderer.domElement.toDataURL();
            renderer.dispose();
            resolve(data);
        }, undefined, () => resolve(null));
    });
}

async function renderGrid() {
    const searchVal = document.getElementById('search').value.toLowerCase();
    const catVal = document.getElementById('filter').value;
    grid.innerHTML = "";

    const filtered = myModels.filter(m => 
        (catVal === 'all' || m.cat === catVal) && m.name.toLowerCase().includes(searchVal)
    );

    // Creăm cardurile
    for (const m of filtered) {
        const id = m.name.replace(/\s+/g, '');
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="thumb-box" id="thumb-${id}"><span class="gen-text">...</span></div>
            <div class="card-info">
                <span class="card-name">${m.name}</span>
                <span class="tag">${m.cat}</span>
            </div>
        `;
        grid.appendChild(card);
        card.onclick = () => openModal(m);
    }

    // Randăm imaginile una câte una (rezolvă problema primelor 3)
    for (const m of filtered) {
        const id = m.name.replace(/\s+/g, '');
        const imgData = await getSnapshot(m.file);
        const box = document.getElementById(`thumb-${id}`);
        if(imgData && box) box.innerHTML = `<img src="${imgData}" class="thumb-img">`;
    }
}

function openModal(m) {
    modalEl.style.display = 'block';
    document.getElementById('m-title').innerText = m.name;
    window.currentFile = m.file;

    if (!mainRenderer) {
        const container = document.getElementById('viewer');
        mainScene = new THREE.Scene();
        mainScene.background = new THREE.Color(0x111111);
        mainCam = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 20000);
        mainRenderer = new THREE.WebGLRenderer({ antialias: true });
        mainRenderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(mainRenderer.domElement);
        
        mainScene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dLight.position.set(10, 20, 10);
        mainScene.add(dLight);

        mainControls = new OrbitControls(mainCam, mainRenderer.domElement);
        mainControls.enableDamping = true;

        function animate() {
            requestAnimationFrame(animate);
            mainControls.update();
            mainRenderer.render(mainScene, mainCam);
        }
        animate();
    }

    if(currentModel) mainScene.remove(currentModel);
    
    loader.load(`models/${m.file}`, (obj) => {
        currentModel = obj;
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const bSize = box.getSize(new THREE.Vector3()).length();
        obj.position.sub(center);
        mainScene.add(obj);
        mainCam.position.set(bSize, bSize, bSize);
        mainControls.target.set(0,0,0);

        let tris = 0;
        obj.traverse(n => { if(n.isMesh) tris += n.geometry.attributes.position.count / 3; });
        document.getElementById('m-stats').innerText = `Polygons: ${Math.round(tris).toLocaleString()}`;
    });
}

document.getElementById('close-modal').onclick = () => {
    modalEl.style.display = 'none';
    if(currentModel) mainScene.remove(currentModel);
};

document.getElementById('search').oninput = renderGrid;
document.getElementById('filter').onchange = renderGrid;
document.getElementById('download-btn').onclick = () => {
    const a = document.createElement('a');
    a.href = `models/${window.currentFile}`;
    a.download = window.currentFile;
    a.click();
};

renderGrid();