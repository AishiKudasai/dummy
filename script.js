let scene, camera, renderer;
let floatingObjects = [];
const video = document.getElementById("cameraFeed");
const canvas = document.getElementById("arCanvas");
const infoCard = document.getElementById("infoCard");
const startButton = document.getElementById("startButton");

// Load saved notes or initialize empty array
let savedNotes = JSON.parse(localStorage.getItem("arNotes") || "[]");

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

    window.addEventListener("resize", onWindowResize);
    canvas.addEventListener("click", onCanvasClick);

    // Load saved notes
    savedNotes.forEach(note => {
        addFloatingText(note.text, note.x, note.y, note.z, note.date);
    });
}

function addFloatingText(text, x, y, z, date=null) {
    const loader = new THREE.FontLoader();
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', font => {
        const geometry = new THREE.TextGeometry(text, { font, size:0.12, height:0.02, bevelEnabled:true, bevelThickness:0.01, bevelSize:0.01 });
        const material = new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive:0x222200 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.scale.set(0.1,0.1,0.1); // entrance effect
        scene.add(mesh);

        floatingObjects.push({ mesh, text, date: date || new Date().toLocaleString() });

        // Entrance animation
        gsap.to(mesh.scale, {x:1, y:1, z:1, duration:1, ease:"back.out(1.7)"});
        gsap.to(mesh.position, {y: mesh.position.y + 0.05, duration:2, yoyo:true, repeat:-1, ease:"sine.inOut"});
        gsap.to(mesh.rotation, {y:"+=0.5", duration:6, repeat:-1, ease:"linear"});
    });
}

function onCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const xNorm = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const yNorm = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const mouse = new THREE.Vector2(xNorm, yNorm);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(floatingObjects.map(o => o.mesh));
    if(intersects.length > 0) {
        // Tap on existing note
        const selected = floatingObjects.find(o => o.mesh === intersects[0].object);
        infoCard.innerText = `Note: ${selected.text}\nCreated: ${selected.date}`;
        infoCard.style.display = "block";
        setTimeout(()=> infoCard.style.display="none", 3500);
    } else {
        // Tap empty space → add new note
        const zPos = -1; 
        const xPos = xNorm * 0.8; 
        const yPos = yNorm * 0.8;
        const noteText = prompt("Enter note text:");
        if(noteText){
            const noteDate = new Date().toLocaleString();
            addFloatingText(noteText, xPos, yPos, zPos, noteDate);

            savedNotes.push({ text: noteText, x: xPos, y: yPos, z: zPos, date: noteDate });
            localStorage.setItem("arNotes", JSON.stringify(savedNotes));
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
    floatingObjects.forEach(o => o.mesh.lookAt(camera.position));
    renderer.render(scene, camera);
}
