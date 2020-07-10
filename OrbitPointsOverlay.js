import {FractalViewport} from "./MandelbrotCanvasElement.js";
import MandelMaths, {OrbitPoint} from "./MandelMaths.js";

export default class OrbitPointsOverlay extends HTMLElement {
	constructor(){
		super();
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					position: absolute;
					left: 0;
					top: 0;
					width: 100%;
					height: 100%;
					background: #00000040;
				}
				:host(.hidden){
					display: none;
				}
				#svg {
					width: 100%;
					height: 100%;
				}
				#div {
					position: absolute;
					left: 0;
					top: 0;
					width: 100%;
					height: 100%;
				}
				.point {
					position: absolute;
					transform: translate(-50%,-50%);
					border: 2px solid #afafaf;
					background: #505050;
					border-radius: 50%;
					width: 6px;
					height: 6px;
				}
				.point-label {
					position: absolute;
					left: 50%;
					top: 50%;
					transform: translate(8px,-50%);
				}
			</style>
			<svg id="svg" preserveAspectRatio="none"></svg>
			<div id="div"></div>
		`;
		/** @type {SVGSVGElement} */
		this._svg = this.shadowRoot.getElementById("svg");
		this._div = this.shadowRoot.getElementById("div");
		this.hide();
		this.addEventListener("click",(e)=>{
			e.stopPropagation();
			this.hide();
		});
		this.addEventListener("mousemove",(e)=>{
			let fractalX = this._viewport.toFractalX(e.offsetX/this.offsetWidth);
			let fractalY = this._viewport.toFractalY(e.offsetY/this.offsetHeight);
			this.showPoints(fractalX,fractalY);
		});
	}
	
	/**
	 * @param {number} cx
	 * @param {number} cy
	 */
	showPoints(cx,cy){
		let points = MandelMaths.approxNearbyOrbitPoints(cx,cy,2000);
		let html = "";
		for (let i=0;i<points.length;i++){
			let point = points[i];
			let x = this._viewport.toRelativeX(point.x);
			let y = this._viewport.toRelativeY(point.y);
			html += `<div class="point" style="left:${100*x}%;top:${100*y}%"><span class="point-label">${point.orbitLength}</span></div>`;
		}
		this._div.innerHTML = html;
	}

	set viewport(viewport){
		this._viewport = viewport;
		let viewboxString = `${viewport.x1} ${viewport.y1} ${viewport.width} ${viewport.height}`;
		this._svg.setAttribute("viewBox",viewboxString);
	}

	/** @type {FractalViewport} */
	get viewport(){
		return this._viewport;
	}

	show(){
		this.hidden = false;
	}

	hide(){
		this.hidden = true;
	}

	set hidden(hidden){
		this.classList.toggle("hidden",hidden);
	}

	get hidden(){
		return this.classList.contains("hidden");
	}
}
customElements.define("orbit-points-overlay",OrbitPointsOverlay);