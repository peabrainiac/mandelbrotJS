import FixedRatioContainer from "../js/customElements/FixedRatioContainer.js";

import MandelbrotCanvasElement from "./MandelbrotCanvasElement.js";
import ZoomPreviewElement from "./ZoomPreviewElement.js";

export default class MandelbrotExplorerElement extends HTMLElement {
	constructor(){
		super();
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
				}
				fixed-ratio-container {
					width: 100%;
					height: 100%;
					background: #101010;
				}
				#inner-container {
					width: 100%;
					height: 100%;
					box-shadow: 0 0 8px #000000;
				}
				mandelbrot-canvas-element {
					width: 100%;
					height: 100%;
				}
			</style>
		`;
		const outerContainer = new FixedRatioContainer("4:3");
		const innerContainer = document.createElement("div");
		const fractalCanvas = new MandelbrotCanvasElement();
		const zoomPreviewElement = new ZoomPreviewElement(fractalCanvas.canvas);
		innerContainer.id = "inner-container";
		innerContainer.appendChild(fractalCanvas);
		innerContainer.appendChild(zoomPreviewElement);
		outerContainer.appendChild(innerContainer);
		this.shadowRoot.appendChild(outerContainer);
		innerContainer.addEventListener("mousedown",(e)=>{
			if (e.button!==2){
				zoomPreviewElement.zoom = 8;
				zoomPreviewElement.show();
				zoomPreviewElement.setPosition(e.layerX,e.layerY);
				e.preventDefault();
			}
		});
		innerContainer.addEventListener("mousemove",(e)=>{
			if (!zoomPreviewElement.hidden){
				console.log("Move!",e);
				zoomPreviewElement.setPosition(e.layerX,e.layerY);
			}
		});
		innerContainer.addEventListener("mouseup",(e)=>{
			if (!zoomPreviewElement.hidden){
				zoomPreviewElement.hide();
				if (e.button===0){
					fractalCanvas.x = fractalCanvas.mouseXToFractalX(e.layerX);
					fractalCanvas.y = fractalCanvas.mouseYToFractalY(e.layerY);
					fractalCanvas.zoom *= 8;
					fractalCanvas.render();
				}
			}
			if (e.button===2){
				fractalCanvas.x = fractalCanvas.mouseXToFractalX(e.layerX);
				fractalCanvas.y = fractalCanvas.mouseYToFractalY(e.layerY);
				fractalCanvas.zoom /= 8;
				fractalCanvas.render();
			}
		});
		innerContainer.addEventListener("contextmenu",(e)=>{
			e.preventDefault();
		});
		innerContainer.addEventListener("mouseleave",(e)=>{
			zoomPreviewElement.hide();
		});
		this._width = 960;
		this._height = 720;
		this._outerContainer = outerContainer;
		this._fractalCanvas = fractalCanvas;
	}

	set width(width){
		this.setAttribute("width",width);
	}

	get width(){
		return this._width;
	}

	set height(height){
		this.setAttribute("height",height);
	}

	get height(){
		return this._height;
	}

	static get observedAttributes(){
		return ["width","height"];
	}

	attributeChangedCallback(name,oldValue,newValue){
		if (name==="width"){
			this._width = newValue*1;
			this._outerContainer.ratio = this._width/this._height;
			this._fractalCanvas.width = this.width;
		}else if (name=="height"){
			this._height = newValue*1;
			this._outerContainer.ratio = this._width/this._height;
			this._fractalCanvas.height = this.height;
		}
	}
}
customElements.define("mandelbrot-explorer-element",MandelbrotExplorerElement);