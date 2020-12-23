import FractalExplorer from "../explorer/FractalExplorer.js";
import Overlay from "./Overlay.js";

export default class OrbitPointsOverlay extends HTMLElement {
	/**
	 * Constructs a new OrbitPointOverlay that shows the orbit of the fractal currently shown by the given FractalExplorer and immediately injects it into that element.
	 * 
	 * @param {FractalExplorer} explorer
	 */
	constructor(explorer){
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
					overflow: hidden;
				}
				::slotted(.point) {
					position: absolute;
					transform: translate(-50%,-50%);
					border: 2px solid #afafaf;
					background: #505050;
					border-radius: 50%;
					width: 6px;
					height: 6px;
					pointer-events: none;
				}
				::slotted(.point.color-0) {
					border: 2px solid hsla(0,0%,84%,50%);
					background: hsla(0,0%,58%,40%);
				}
				::slotted(.point.color-1) {
					border: 2px solid hsla(30,60%,60%,50%);
					background: hsla(30,35%,35%,40%);
				}
				::slotted(.point.color-2) {
					border: 2px solid hsla(-30,60%,60%,50%);
					background: hsla(-30,35%,35%,40%);
				}
				::slotted(.point.color-3) {
					border: 2px solid hsla(90,60%,60%,50%);
					background: hsla(90,35%,35%,40%);
				}
			</style>
			<slot></slot>
		`;
		this.slot = "overlay";
		explorer.appendChild(this);
		this._explorer = explorer;
		this._viewport = explorer.fractalCanvas.viewport;
		this.addEventListener("mousedown",e=>{
			e.stopPropagation();
			e.preventDefault();
		});
		this.addEventListener("mouseup",(e)=>{
			e.preventDefault();
			e.stopPropagation();
			let fractalX = this._viewport.toFractalX(e.offsetX/this.offsetWidth);
			let fractalY = this._viewport.toFractalY(e.offsetY/this.offsetHeight);
			if (e.button==0){
				this.remove();
				console.log("Removed overlay!")
			}else if(e.button==1){
				console.group("Orbit data");
				console.log("cx:",fractalX);
				console.log("cy:",fractalY);
				console.log("orbit:",this._explorer.formula.getOrbitPoints(fractalX,fractalY,this._explorer.iterations));
				console.groupEnd();
				debugger;
			}else if(e.button==2){
				document.body.appendChild(new FullOrbitPointsOverlay(explorer,fractalX,fractalY))
			}
		});
		this.addEventListener("mousemove",(e)=>{
			let fractalX = this._viewport.toFractalX(e.offsetX/this.offsetWidth);
			let fractalY = this._viewport.toFractalY(e.offsetY/this.offsetHeight);
			this.showPoints(fractalX,fractalY);
		});
		this.addEventListener("mouseleave",e=>{
			this.innerHTML = "";
		});
		explorer.fractalCanvas.onViewportChange(viewport=>{
			this._viewport = viewport;
			this.innerHTML = "";
		});
	}

	showPoints(fractalX,fractalY){

		const orbits = this._explorer.formula.getOrbitPoints(fractalX,fractalY,this._explorer.iterations);
		this.innerHTML = orbits.map((orbit,index)=>{
			let orbitColorIndex = index%4;
			let html = "";
			for (let i=0;i<orbit.length;i++){
				let relativeX = this._viewport.toRelativeX(orbit[i].x);
				let relativeY = this._viewport.toRelativeY(orbit[i].y);
				let pixelX = relativeX*this._explorer.width;
				let pixelY = relativeY*this._explorer.height;
				if (pixelX>-4&&pixelX<this._explorer.width+4&&pixelY>-4&&pixelY<this._explorer.height+4){
					html += `<div class="point color-${orbitColorIndex}" style="left:${100*relativeX}%;top:${100*relativeY}%"></div>`;
				}
			}
			return html;
		}).join("");
	}
}
/**
 * Costum element that displays the orbit of a given point in a zoomable way, using an own `<fractal-explorer>`-element.
 */
export class FullOrbitPointsOverlay extends Overlay {
	/**
	 * Constructs a new FullOrbitPointOverlay that shows the orbit of the fractal currently shown by the given FractalExplorer.
	 * 
	 * @param {FractalExplorer} explorer
	 * @param {number} fractalX
	 * @param {number} fractalY
	 */
	constructor(explorer,fractalX,fractalY){
		super();
		const copy = explorer.copy();
		this.ratio = copy.width/copy.height;
		copy.style.width = "100%";
		copy.style.height = "100%";
		this.appendChild(copy);
		let overlay = new OrbitPointsOverlay(copy);
		overlay.style.pointerEvents = "none";
		overlay.showPoints(fractalX,fractalY);
		copy.fractalCanvas.onViewportChange(viewport=>{
			copy.fractalCanvas.onNextCanvasUpdate(canvas=>{
				overlay.showPoints(fractalX,fractalY);
			});
		});
	}
}
customElements.define("orbit-points-overlay",OrbitPointsOverlay);
customElements.define("full-orbit-points-overlay",FullOrbitPointsOverlay);