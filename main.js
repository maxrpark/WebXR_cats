import "./style.css";
import * as THREE from "three";

import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

document.addEventListener("DOMContentLoaded", () => {
    const initialize = async () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera();
        const renderer = new THREE.WebGLRenderer({ alpha: true });

        document.body.appendChild(renderer.domElement);

        // light
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);

        // renderer
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;

        // Reticle
        const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(
            -Math.PI / 2
        );
        const reticleMaterial = new THREE.MeshBasicMaterial();

        const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
        reticle.matrixAutoUpdate = false;
        reticle.visible = false;

        const controller = renderer.xr.getController(0);

        // Add scene
        scene.add(ambientLight, reticle, controller);

        // cat button
        let mixers = [];
        const arButton = ARButton.createButton(renderer, {
            requiredFeatures: ["hit-test"],
            optionalFeatures: ["dom-overlay"],
            domOverlay: { root: document.body },
        });
        document.body.appendChild(arButton);
        const gltfLoader = new GLTFLoader();
        controller.addEventListener("select", () => {
            gltfLoader.load(
                "/assets/animated_bengal_cat/scene.gltf",
                (gltf) => {
                    let mixer = new THREE.AnimationMixer(gltf.scene);
                    const action = mixer.clipAction(gltf.animations[0]);
                    action.play();
                    gltf.scene.position.setFromMatrixPosition(reticle.matrix);
                    gltf.scene.scale.set(0.3, 0.3, 0.3);
                    mixers.push(mixer);
                    scene.add(gltf.scene);
                }
            );
        });

        renderer.xr.addEventListener("sessionstart", async () => {
            const session = renderer.xr.getSession();
            const viewerReferenceSpace = await session.requestReferenceSpace(
                "viewer"
            );
            const hitTestSource = await session.requestHitTestSource({
                space: viewerReferenceSpace,
            });
            const clock = new THREE.Clock();
            renderer.setAnimationLoop((timestamp, frame) => {
                if (!frame) return;
                const hitTestResults = frame.getHitTestResults(hitTestSource);
                if (hitTestResults.length > 0) {
                    const hit = hitTestResults[0];
                    const referenceSpace = renderer.xr.getReferenceSpace();
                    const hitPose = hit.getPose(referenceSpace);

                    reticle.visible = true;
                    reticle.matrix.fromArray(hitPose.transform.matrix);
                } else {
                    reticle.visible = false;
                }

                // animations
                let deltaTime = clock.getDelta();
                if (mixers.length > 0) {
                    mixers.forEach((mixer) => {
                        mixer.update(deltaTime);
                    });
                }
                renderer.render(scene, camera);
            });
        });

        renderer.xr.addEventListener("sessionend", async () => {});
    };

    initialize();
});
