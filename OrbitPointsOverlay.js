import {FractalViewport} from "./MandelbrotCanvasElement.js";
import {FractalFormula,Minibrot,Disk} from "./MandelMaths.js";

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
				.circle {
					position: absolute;
					transform: translate(-50%,-50%);
					border: 2px solid #ffffff80;
					border-radius: 50%;
				}
				.circle.approximationRadius {
					border-color: #ffffff40;
				}
			</style>
			<svg id="svg" preserveAspectRatio="none"></svg>
			<div id="div"></div>
		`;
		this._formula = new FractalFormula();
		/** @type {SVGSVGElement} */
		this._svg = this.shadowRoot.getElementById("svg");
		this._div = this.shadowRoot.getElementById("div");
		this.hide();
		this.addEventListener("mousedown",(e)=>{
			e.stopPropagation();
			e.preventDefault();
		});
		this.addEventListener("mouseup",(e)=>{
			e.stopPropagation();
			if (e.button==1){
				let fractalX = this._viewport.toFractalX(e.offsetX/this.offsetWidth);
				let fractalY = this._viewport.toFractalY(e.offsetY/this.offsetHeight);
				console.log(this._formula.approxNearbyCyclicPoints(fractalX,fractalY,2000));
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
	 * @param {FractalFormula} formula
	 */
	showPoints(cx,cy){
		let points = this._formula.approxNearbyCyclicPoints(cx,cy,2000);
		let html = "";
		for (let i=0;i<points.length;i++){
			let point = points[i];
			let x = this._viewport.toRelativeX(point.x);
			let y = this._viewport.toRelativeY(point.y);
			let rx = this._viewport.toRelativeWidth(point.radius);
			let ry = this._viewport.toRelativeHeight(point.radius);
			let rx2 = this._viewport.toRelativeWidth(point.approximationRadius);
			let ry2 = this._viewport.toRelativeHeight(point.approximationRadius);
			let circleHtml = (rx<2&&ry<2)?`<div class="circle" style="left:${100*x}%;top:${100*y}%;width:${200*rx}%;height:${200*ry}%"></div>`:``;
			circleHtml += (rx2<2&&ry2<2)?`<div class="circle approximationRadius" style="left:${100*x}%;top:${100*y}%;width:${200*rx2}%;height:${200*ry2}%"></div>`:``;
			html += `<div class="point" style="left:${100*x}%;top:${100*y}%"><span class="point-label">${point.cycleLength}</span></div>${circleHtml}`;
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

	set formula(formula){
		this._formula = formula;
	}

	/** @type {FractalFormula} */
	get formula(){
		return this._formula;
	}
}
customElements.define("orbit-points-overlay",OrbitPointsOverlay);