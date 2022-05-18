import {FractalFormula,FractalViewport} from "../MandelMaths.js";

export default class SpecialPointsOverlay extends HTMLElement {
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
					overflow: hidden;
				}
				:host(.hidden){
					display: none;
				}
				#div {
					position: absolute;
					left: 0;
					top: 0;
					width: 100%;
					height: 100%;
				}
				.point-container {
					position: absolute;
					width: 100%;
					height: 100%;
					left: 0;
					top: 0;
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
					background-color: #00000060;
				}
				.circle {
					position: absolute;
					transform: translate(-50%,-50%);
					border: 2px solid #ffffff80;
					border-radius: 50%;
				}
				.circle.approximationRadius {
					border-color: #ffffff40;
				}
				.svg-ellipse, .svg-ellipse > * {
					fill: transparent;
					stroke: #ffffff80;
					stroke-width: 2px;
					vector-effect: non-scaling-stroke;
				}
				.svg-ellipse.approximationRadius, .svg-ellipse.approximationRadius > * {
					stroke: #ffffff40;
				}
			</style>
			<div id="div"></div>
		`;
		this._formula = new FractalFormula();
		this._iterations = 200;
		this._div = this.shadowRoot.getElementById("div");
		this.hide();
		this.addEventListener("mousedown",e=>{
			e.stopPropagation();
			e.preventDefault();
		});
		this.addEventListener("mouseup",(e)=>{
			if (e.button==1){
				let fractalX = this._viewport.toFractalX(e.offsetX/this.offsetWidth);
				let fractalY = this._viewport.toFractalY(e.offsetY/this.offsetHeight);
				console.group("Periodic points data");
				console.log("x:",fractalX);
				console.log("y:",fractalY);
				console.log("data:",this._formula.approxNearbyPeriodicPoints(fractalX,fractalY,this._iterations));
				console.groupEnd();
			}else{
				this.hide();
			}
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
		let points = this._formula.approxNearbyPeriodicPoints(cx,cy,this._iterations);
		this._div.innerHTML = "";
		for (let i=0;i<points.length;i++){
			this._div.appendChild(points[i].toElement(this._viewport));
		}
	}

	set viewport(viewport){
		this._viewport = viewport;
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

	set formula(formula){
		this._formula = formula;
	}

	/** @type {FractalFormula} */
	get formula(){
		return this._formula;
	}

	set iterations(iterations){
		this._iterations = iterations;
	}

	/** @type {number} */
	get iterations(){
		return this._iterations;
	}
}
customElements.define("special-points-overlay",SpecialPointsOverlay);