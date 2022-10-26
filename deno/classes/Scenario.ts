import * as THREE from 'three';
import { SrcAlphaFactor } from 'https://esm.sh/v77/@types/three@0.137.0/index.d.ts';
import { Controller } from './Controller.ts';
import { Event } from './Event.ts';

import STAR_DATA from './star-data.ts';

const PREFER_DARK_MODE =
	window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

export class Scenario extends Controller {
	start() {
		this.setCameraPosition(new THREE.Vector3(0, 0, -6));
		this.setCameraFocusOnVector3(new THREE.Vector3(0, 0, 0));
		this.setLightMode(this.darkMode);

		this.createMeshes();
		this.startAnimationLoop();
	}

	darkMode = PREFER_DARK_MODE;

	$light = new Event();

	setLightMode(nightlight: boolean) {
		this.darkMode = nightlight;
		globalThis.document.body.setAttribute('class', this.darkMode ? 'nightlight' : 'daylight');
		this.$light.emit();
	}

	toggleLightMode() {
		this.setLightMode(!this.darkMode);
	}

	private foregroundColor = 0x000000;
	private backgroundColor = 0xffffff;
	private radius = 1;
	// private nucleus = new THREE.Mesh(
	// 	new THREE.SphereGeometry(this.radius * 0.9, 30, 30),
	// 	new THREE.MeshBasicMaterial({ color: this.backgroundColor, wireframe: false }),
	// );

	private getXyzForLatLon(lat: number, long: number) {
		const radius = this.radius * 1.02;
		const phi = (90 - lat) * (Math.PI / 180);
		const theta = (long + 180) * (Math.PI / 180);
		return {
			x: -(radius * Math.sin(phi) * Math.cos(theta)),
			z: radius * Math.sin(phi) * Math.sin(theta),
			y: radius * Math.cos(phi),
		};
	}
	private setMeshPositionForLatLonOnSphere(mesh: THREE.Mesh, lat = 0, long = 0, altitude = 0) {
		Object.assign(mesh.position, this.getXyzForLatLon(lat, long));
	}

	createFog(color = this.backgroundColor, near = 5, far = 7) {
		// Front of globe = 5,
		// Back of globe = 7
		this.scene.fog = new THREE.Fog(color, near, far);
	}

	createBand(inclination = 0.5 * Math.PI, period = 0) {
		const curve = new THREE.EllipseCurve(
			0, // ax, aY
			0,
			this.radius * 1.02, // xRadius, yRadius
			this.radius * 1.02,
			0,
			2 * Math.PI, // aStartAngle, aEndAngle
			false, // aClockwise
			0.3 * Math.PI, // aRotation
		);
		// Create the final object to add to the scene
		const ellipse = new THREE.Line(
			new THREE.BufferGeometry().setFromPoints(curve.getPoints(50)),
			new THREE.LineBasicMaterial({ color: this.foregroundColor }),
		);
		ellipse.rotation.set(inclination, period, 0, 'ZYX');
		return ellipse;
	}

	createStar(lat: number, lon: number, color = this.foregroundColor) {
		const sphere = new THREE.Mesh(
			new THREE.SphereGeometry(0.01, 6, 6),
			new THREE.MeshBasicMaterial({ color, wireframe: false }),
		);
		this.setMeshPositionForLatLonOnSphere(sphere, lat, lon);
		return sphere;
	}

	createLine(raDecs: Array<[number, number]>) {
		const material = new THREE.LineBasicMaterial({ color: this.foregroundColor });
		const geometry = new THREE.BufferGeometry().setFromPoints(
			raDecs.map(([dec, ra]) => {
				const { x, y, z } = this.getXyzForLatLon(...this.getLatLongForRaDec(ra, dec));
				return new THREE.Vector3(x, y, z);
			}),
		);
		const line = new THREE.Line(geometry, material);
		return line;
	}

	getLatLongForRaDec(raInRad: number, decInRad: number): [number, number] {
		return [(raInRad * 180) / Math.PI, 90 - (decInRad * 180) / Math.PI];
	}

	createMeshes() {
		// All of the backface is shown as #DDDDDD:
		this.createFog(0xdddddd, 5.99, 6.01);

		// this.scene.add(this.nucleus);

		for (let i = 0; i < 5; i++) {
			this.scene.add(this.createBand(Math.random() * Math.PI, Math.random() * Math.PI));
		}

		STAR_DATA.stars.forEach(([dec, ra]) => {
			this.scene.add(this.createStar(...this.getLatLongForRaDec(ra, dec)));
		});

		STAR_DATA.lines.forEach((points) => {
			this.scene.add(this.createLine(points.map((index) => STAR_DATA.stars[index])));
		});
	}
}
