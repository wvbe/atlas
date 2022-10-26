import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { Event } from './Event.ts';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
type ThreeControllerOptions = {
	fieldOfView: number;
	pixelRatio: number;
	enableAutoRotate: boolean;
	enablePan: boolean;
	enableZoom: boolean;
	restrictCameraAngle: boolean;
};

const DRACO_LOADER = new DRACOLoader(new THREE.LoadingManager()).setDecoderPath(
	`https://unpkg.com/three@0.${THREE.REVISION}.x/examples/js/libs/draco/gltf/`
);
export class Controller {
	public animating = false;

	public scene: THREE.Scene;
	public renderer: THREE.WebGLRenderer;
	public camera: THREE.Camera;
	public controls: OrbitControls;

	/**
	 * The element into which the ThreeJS canvas as well as any overlay elements are placed
	 */
	public root: HTMLElement;

	/**
	 * The event that the viewport is resized
	 */
	public readonly $resize = new Event();

	public constructor(root: HTMLElement, options: ThreeControllerOptions) {
		// @TODO remove these event listeners from the place where they are set.

		this.root = root;

		// https://threejs.org/docs/#api/en/scenes/Scene
		this.scene = new THREE.Scene();

		// https://threejs.org/docs/#api/en/renderers/WebGLRenderer
		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true
		});

		// Set the camera;
		//   https://threejs.org/docs/#api/en/cameras/OrthographicCamera
		//   https://threejs.org/docs/#api/en/cameras/PerspectiveCamera
		const { aspect } = this.getViewportSize();
		this.camera = new THREE.PerspectiveCamera(options.fieldOfView, aspect, 0.1, 1000);

		this.$resize.on(() => {
			const { aspect, width, height } = this.getViewportSize();
			const camera = this.camera as THREE.PerspectiveCamera;
			camera.aspect = aspect;
			camera.updateProjectionMatrix();
			this.renderer.setSize(width * options.pixelRatio, height * options.pixelRatio, false);
		});
		this.$resize.emit();
		this.renderer.domElement.style.width = '100%';
		this.renderer.domElement.style.height = '100%';

		// https://threejs.org/docs/#examples/en/controls/OrbitControls
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		if (options.restrictCameraAngle) {
			this.controls.maxPolarAngle = 0.45 * Math.PI;
		}
		this.controls.screenSpacePanning = false;
		this.controls.enableZoom = false;
		this.controls.enableDamping = true;
		this.controls.enablePan = options.enablePan;
		this.controls.dampingFactor = 0.1;
		this.controls.autoRotate = options.enableAutoRotate;
		this.controls.autoRotateSpeed = 0.3;

		// Mount the goddamn thing
		root.appendChild(this.renderer.domElement);

		const handleResize = this.$resize.emit.bind(this.$resize);
		globalThis.addEventListener('resize', handleResize);
	}

	/**
	 * Show a 3D cross-hair in red, blue and green, correlating to X, Y and Z
	 */
	public addAxisHelper(v: THREE.Vector3 = new THREE.Vector3(0, 0, 0), size = 1) {
		const axesHelper = new THREE.AxesHelper(size);
		axesHelper.position.set(v.x, v.y, v.z);
		this.scene.add(axesHelper);
	}
	/**
	 * Position the camera at a game coordinate
	 */
	public setCameraPosition(position: THREE.Vector3) {
		this.camera.position.copy(position);
	}

	/**
	 * Point the camera right at a ThreeJS coordinate
	 */
	protected setCameraFocusOnVector3(vector: THREE.Vector3) {
		this.camera.lookAt(vector);
		this.controls.target = vector;
	}

	/**
	 * Point the camera right at a ThreeJS mesh
	 */
	public setCameraFocusMesh(mesh: THREE.Mesh) {
		const geometry = mesh.geometry;
		const center = new THREE.Vector3();
		geometry.computeBoundingBox();
		geometry.boundingBox?.getCenter(center);
		mesh.localToWorld(center);

		this.setCameraFocusOnVector3(center);
	}

	private getViewportSize() {
		const boundingClientRect = this.root.getBoundingClientRect();
		return {
			width: boundingClientRect.width,
			height: boundingClientRect.height,
			aspect: boundingClientRect.width / boundingClientRect.height
		};
	}
	/**
	 * Start the animation loop
	 */
	public startAnimationLoop() {
		if (this.animating) {
			throw new Error('Animation already started');
		}

		const animate = () => {
			if (!this.animating) {
				return;
			}
			globalThis.requestAnimationFrame(animate);
			this.renderAnimationFrame();
		};

		this.animating = true;

		animate();
	}

	addGltf(path: string): Promise<GLTF> {
		// Instantiate a loader
		const loader = new GLTFLoader().setDRACOLoader(DRACO_LOADER);
		// loader.setPath(path);
		// Load a glTF resource
		return new Promise((resolve, reject) =>
			loader.load(
				// resource URL
				path,
				// called when the resource is loaded
				gltf => {
					this.scene.add(gltf.scene);

					gltf.scene.scale.set(2, 2, 2);
					gltf.scene.position.x = 0; //Position (x = right+ left-)
					gltf.scene.position.y = 0; //Position (y = up+, down-)
					gltf.scene.position.z = 0; //Position (z = front +, back-)

					// gltf.animations; // Array<THREE.AnimationClip>
					// gltf.scene; // THREE.Group
					// gltf.scenes; // Array<THREE.Group>
					// gltf.cameras; // Array<THREE.Camera>
					// gltf.asset; // Object
					resolve(gltf);
				},
				xhr => {
					console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
				},
				reject
			)
		);
	}

	/**
	 * Call for all objects etc. to be updated, and render once.
	 */
	private renderAnimationFrame() {
		this.controls.update();
		this.renderer.render(this.scene, this.camera);
	}

	/**
	 * Stop the animation loop, the opposite of startAnimationLoop(). Will also fire the opposite event.
	 */
	public stopAnimationLoop() {
		if (!this.animating) {
			// @TODO maybe just return early.
			throw new Error('Animation not started');
		}
		this.animating = false;
	}
}
