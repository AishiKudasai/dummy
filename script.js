let scene, camera, renderer;
let floatingObjects = [];
const video = document.getElementById("cameraFeed");
const canvas = document.getElementById("arCanvas");
const infoCard = document.getElementById("infoCard");
const startButton = document.getElementById("startButton");

startButton.addEventListener("click", async () => {
    startButton.style.display = "none";
    await startCamera();
    initAR();
    animate();
});

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        video.srcObject = stream;
    } catch(err) {
        alert("Camera access denied or not supported.");
        console.error(err);
    }
}

function initAR() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.01, 20);
    camera.position.z = 1;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha:true, antialias:true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Add floating text in “world space”
    addFloatingText("Hello AR!", 0, 0, -1);
    addFloatingText("Tap me!", 0.3, 0.2, -1.2);
    addFloatingText("Look here!", -0.3, -0.1, -1.5);

    window.addEventListener("resize", onWindowResize);
    canvas.addEventListener("click", onCanvasClick);
}

function addFloatingText(text, x, y, z) {
    const loader = new THREE.FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', font => {
        const geometry = new THREE.TextGeometry(text, { font, size:0.1, height:0.02 });
        const material = new THREE.MeshStandardMaterial({ color: 0xffdd00 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);

        scene.add(mesh);
        floatingObjects.push({ mesh, info: `Info about "${text}"` });

        // Smooth floating animation
        gsap.to(mesh.position, {y: mesh.position.y + 0.05, duration:1.5, yoyo:true, repeat:-1, ease:"sine.inOut"});
        gsap.to(mesh.rotation, {y:"+=0.5", duration:4, repeat:-1, ease:"linear"});
    });
}

function onCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const mouse = new THREE.Vector2(x, y);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(floatingObjects.map(o => o.mesh));
    if(intersects.length > 0) {
        const selected = floatingObjects.find(o => o.mesh === intersects[0].object);
        if(selected){
            infoCard.innerText = selected.info;
            infoCard.style.display = "block";
            setTimeout(()=> infoCard.style.display="none", 2500);
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Make objects always face camera (billboarding)
    floatingObjects.forEach(o => o.mesh.lookAt(camera.position));

    renderer.render(scene, camera);
}
