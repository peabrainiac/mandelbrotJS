import FixedRatioContainer from "../js/customElements/FixedRatioContainer.js";

import MandelbrotCanvasElement, {STATE_RENDERING,STATE_FINISHED,STATE_CANCELLED,ITERATIONS_NOT_YET_KNOWN} from "./MandelbrotCanvasElement.js";
import MandelbrotExplorerStatusbar from "./MandelbrotExplorerStatusbar.js";
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
				#outer-container {
					width: 100%;
					height: 100%;
					background: #101010;
				}
				#inner-container {
					width: 100%;
					height: 100%;
					box-shadow: 0 0 8px #000000;
				}
				#canvas {
					position: absolute;
					left: 0;
					top: 0;
					width: 100%;
					height: 100%;
				}
				#statusbar {
					position: absolute;
					left: 0;
					right: 0;
					bottom: 0;
				}
			</style>
			<fixed-ratio-container id="outer-container" ratio="4:3">
				<div id="inner-container">
					<mandelbrot-canvas-element id="canvas"></mandelbrot-canvas-element>
					<mandelbrot-explorer-statusbar id="statusbar"></mandelbrot-explorer-statusbar>
					<zoom-preview-element id="zoom-preview"></zoom-preview-element>
					<slot name="overlay"></slot>
				</div>
			</fixed-ratio-container>
		`;
		/** @type {FixedRatioContainer} */
		const outerContainer = this.shadowRoot.getElementById("outer-container");
		const innerContainer = this.shadowRoot.getElementById("inner-container");
		/** @type {MandelbrotCanvasElement} */
		const fractalCanvas = this.shadowRoot.getElementById("canvas");
		/** @type {MandelbrotExplorerStatusbar} */
		const statusbar = this.shadowRoot.getElementById("statusbar");
		/** @type {ZoomPreviewElement} */
		const zoomPreviewElement = this.shadowRoot.getElementById("zoom-preview");
		zoomPreviewElement.targetCanvas = fractalCanvas.canvas;
		fractalCanvas.addEventListener("mousedown",(e)=>{
			if (e.button!==2){
				zoomPreviewElement.show();
				zoomPreviewElement.setPosition(e.layerX,e.layerY);
				e.preventDefault();
			}
		});
		fractalCanvas.addEventListener("mousemove",(e)=>{
			let pixelX = fractalCanvas.mouseXToPixelX(e.layerX);
			let pixelY = fractalCanvas.mouseYToPixelY(e.layerY);
			let iterations = fractalCanvas.getPixelIterations(pixelX,pixelY);
			statusbar.mouseInfo = `Iterations: ${iterations!=ITERATIONS_NOT_YET_KNOWN?iterations+(iterations<fractalCanvas.iterations?"":"+"):"not yet known"}`;
			if (!zoomPreviewElement.hidden){
				zoomPreviewElement.setPosition(e.layerX,e.layerY);
			}
		});
		fractalCanvas.addEventListener("mouseup",(e)=>{
			if (!zoomPreviewElement.hidden){
				zoomPreviewElement.hide();
				if (e.button===0){
					fractalCanvas.x = fractalCanvas.mouseXToFractalX(e.layerX);
					fractalCanvas.y = fractalCanvas.mouseYToFractalY(e.layerY);
					fractalCanvas.zoom *= this._zoomFactor;
				}
			}
			if (e.button===2&&!e.shiftKey){
				fractalCanvas.x = fractalCanvas.mouseXToFractalX(e.layerX);
				fractalCanvas.y = fractalCanvas.mouseYToFractalY(e.layerY);
				fractalCanvas.zoom /= this._zoomFactor;
			}
		});
		fractalCanvas.addEventListener("contextmenu",(e)=>{
			e.preventDefault();
		});
		fractalCanvas.addEventListener("mouseleave",(e)=>{
			zoomPreviewElement.hide();
			statusbar.mouseInfo = "";
		});
		this._width = 960;
		this._height = 720;
		this._pixelsPerUnit = 200;
		this._outerContainer = outerContainer;
		this._fractalCanvas = fractalCanvas;
		this._zoomPreviewElement = zoomPreviewElement;
		this.zoomFactor = 8;
		fractalCanvas.onStateChange((state)=>{
			if (state==STATE_RENDERING){
				statusbar.state = "Rendering";
			}else if (state==STATE_FINISHED){
				statusbar.state = "Finished";
			}else if (state==STATE_CANCELLED){
				statusbar.state = "Cancelled";
			}
		});
		fractalCanvas.onProgress((progress)=>{
			statusbar.progress = progress;
		});
		fractalCanvas.onZoomChange((zoom)=>{
			statusbar.zoom = zoom;
			console.log(zoom);
		});
	}

	/**
	 * Returns a blob with the current contents of the canvas.
	 * @returns {Promise<Blob>}
	 */
	async toBlob(){
		return new Promise((resolve)=>{
			this._fractalCanvas.canvas.toBlob(resolve);
		});
	}

	get fractalCanvas(){
		return this._fractalCanvas;
	}

	set formula(formula){
		this._fractalCanvas.formula = formula;
	}

	get formula(){
		return this._fractalCanvas.formula;
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

	set pixelsPerUnit(pixelsPerUnit){
		this.setAttribute("pixels-per-unit",pixelsPerUnit);
	}

	get pixelsPerUnit(){
		return this._pixelsPerUnit;
	}

	static get observedAttributes(){
		return ["width","height","pixels-per-unit"];
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
		}else if(name=="pixels-per-unit"){
			this._pixelsPerUnit = newValue*1;
			this._fractalCanvas.pixelsPerUnit = this.pixelsPerUnit;
		}
	}

	set zoomFactor(factor){
		this._zoomFactor = factor
		this._zoomPreviewElement.zoom = factor;
	}

	/** @type {number} */
	get zoomFactor(){
		return this._zoomFactor;
	}

	set iterations(iterations){
		this._fractalCanvas.iterations = iterations;
	}

	get iterations(){
		return this._fractalCanvas.iterations;
	}

}
customElements.define("mandelbrot-explorer-element",MandelbrotExplorerElement);