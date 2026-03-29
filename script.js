import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const myModels = [
    { name: "Crate", file: "Crate.fbx", cat: "Interactable" },
    { name: "Robo Arm", file: "RoboArm.fbx", cat: "Interactable" },
    { name: "Robo Arm 2", file: "RoboArm2.fbx", cat: "Interactable" },

    { name: "Robot V1", file: "Robot.fbx", cat: "Characters" },
    { name: "Robot V2", file: "RobotV2.fbx", cat: "Characters" },
    { name: "Robot V3", file: "RobotV3.fbx", cat: "Characters" },
    { name: "Robot V4", file: "RobotV4.fbx", cat: "Characters" },

    { name: "Generator", file: "Generator.fbx", cat: "Props" },
    { name: "Industrial Tank", file: "IndustrialTank.fbx", cat: "Props" },
    { name: "Industrial Tank Stand", file: "IndustrialTankStand.fbx", cat: "Props" },
    { name: "Industrial Tank Tower", file: "IndustrialTankTower.fbx", cat: "Props" },
    { name: "Stand Button", file: "StandButton.fbx", cat: "Props" },
    { name: "Wooden Pallet", file: "WoodenPallet.fbx", cat: "Props" },
    { name: "Metal Barrel Red", file: "MetalBarrelRed.fbx", cat: "Props" },
    { name: "Metal Barrel Blue", file: "MetalBarrelBlue.fbx", cat: "Props" },
    { name: "Metal Barrel Black", file: "MetalBarrelBlack.fbx", cat: "Props" },

    { name: "Fire Warning", file: "FireWarningSign.fbx", cat: "Decor" },
    { name: "Electrical Warning", file: "ElectricalWarningSign.fbx", cat: "Decor" },
    { name: "Radioactive Warning", file: "RadioActiveWarningSign.fbx", cat: "Decor" }
];

const grid = document.getElementById('asset-grid');
const modalEl = document.getElementById('modal');
const loader = new FBXLoader();
let mainScene, mainCam, mainRenderer, mainControls, currentModel;

// --- SECVENTIAL SNAPSHOT ENGINE (Lumină Maximă în Grid) ---
async function getSnapshot(fileName) {
    return new Promise((resolve) => {
        const size = 256;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(size, size);
        
        // Optimizare culori pentru snapshot
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        const scene = new THREE.Scene();
        
        // ILUMINARE GLOBALĂ (Snapshot)
        scene.add(new THREE.AmbientLight(0xffffff, 2.5)); // Am crescut de la 1.2 la 2.5
        
        const d1 = new THREE.DirectionalLight(0xffffff, 2.0);
        d1.position.set(5, 5, 5);
        scene.add(d1);

        const d2 = new THREE.DirectionalLight(0xffffff, 1.5);
        d2.position.set(-5, 5, -5); // Lumină din spate-stânga pentru a elimina umbrele
        scene.add(d2);

        const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 10000);
        
        loader.load(`models/${fileName}`, (obj) => {
            const box = new THREE.Box3().setFromObject(obj);
            const center = box.getCenter(new THREE.Vector3());
            const bSize = box.getSize(new THREE.Vector3()).length();
            obj.position.sub(center);
            scene.add(obj);
            
            camera.position.set(bSize * 0.9, bSize * 0.9, bSize * 0.9);
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

    for (const m of filtered) {
        const id = m.name.replace(/\s+/g, '');
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="thumb-box" id="thumb-${id}">
                <span class="gen-text">LOADING...</span>
            </div>
            <div class="card-info">
                <span class="card-name">${m.name}</span>
                <span class="tag">${m.cat}</span>
            </div>
        `;
        grid.appendChild(card);
        card.onclick = () => openModal(m);
    }

    for (const m of filtered) {
        const id = m.name.replace(/\s+/g, '');
        const imgData = await getSnapshot(m.file);
        const box = document.getElementById(`thumb-${id}`);
        if(imgData && box) {
            box.innerHTML = `<img src="${imgData}" class="thumb-img">`;
        } else if(box) {
            box.innerHTML = `<span class="gen-text" style="color:red">ERROR</span>`;
        }
    }
}

// --- OPEN MODAL (Lumină Maximă în Viewer) ---
function openModal(m) {
    modalEl.style.display = 'block';
    document.getElementById('m-title').innerText = m.name;
    window.currentFile = m.file;

    if (!mainRenderer) {
        const container = document.getElementById('viewer');
        mainScene = new THREE.Scene();
        mainScene.background = new THREE.Color(0x252321); 
        
        mainCam = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 20000);
        mainRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        mainRenderer.setSize(container.clientWidth, container.clientHeight);
        
        // --- SETĂRI REINHARD (Cele mai bune pentru realism) ---
        mainRenderer.outputColorSpace = THREE.SRGBColorSpace;
        mainRenderer.toneMapping = THREE.ReinhardToneMapping; 
        mainRenderer.toneMappingExposure = 1.5; // Valoare medie, sigură

        container.appendChild(mainRenderer.domElement);
        
        // --- ILUMINARE BALANSATĂ ---
        // 1. Ambient slab (doar cât să nu fie negru în umbre)
        mainScene.add(new THREE.AmbientLight(0xffffff, 0.5));

        // 2. Hemisphere (pentru o tentă naturală sus/jos)
        const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        mainScene.add(hemi);

        // 3. KEY LIGHT (Lumina principală care dă formă)
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
        keyLight.position.set(5, 10, 5);
        mainScene.add(keyLight);

        // 4. FILL LIGHT (Lumină mai slabă din lateral să umple umbrele grele)
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
        fillLight.position.set(-5, 2, 2);
        mainScene.add(fillLight);

        // 5. RIM LIGHT (Lumină din spate care „taie” conturul obiectului)
        const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
        rimLight.position.set(0, 5, -10);
        mainScene.add(rimLight);

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

        obj.traverse(n => {
            if(n.isMesh) {
                if(n.material) {
                    n.material.needsUpdate = true;
                    // Resetăm emisia dacă am pus-o anterior, ca să nu „ardă”
                    if(n.material.emissive) n.material.emissive.setHex(0x000000);
                }
            }
        });

        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const bSize = box.getSize(new THREE.Vector3()).length();
        
        obj.position.sub(center);
        mainScene.add(obj);

        mainCam.position.set(bSize * 0.9, bSize * 0.9, bSize * 0.9);
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