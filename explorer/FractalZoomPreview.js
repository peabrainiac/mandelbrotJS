/**
 * Custom element responsible for displaying a preview of the region around the cursor before zooming in.
 */
export default class FractalZoomPreview extends HTMLElement {
	/**
	 * @param {HTMLCanvasElement} canvas
	 */
	constructor(canvas=null){
		super();
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					pointer-events: none;
					position: absolute;
					left: 0;
					top: 0;
					width: 100%;
					height: 100%;
					box-shadow: 4px 4px 8px #000000bf;
					transform: translate(-50%,-50%);
				}
				:host(.hidden) {
					display: none;
				}
				canvas {
					width: 100%;
					height: 100%;
					image-rendering: pixelated;
					image-rendering: crisp-edges;
				}
			</style>
			<canvas></canvas>
		`;
		this._previewCanvas = this.shadowRoot.querySelector("canvas");
		this._previewCtx = this._previewCanvas.getContext("2d");
		this.targetCanvas = canvas;
		this.hide();
		this.zoom = 8;
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} zoom
	 */
	setPosition(x,y,zoom=this._zoom){
		this._x = x;
		this._y = y;
		this.zoom = zoom;
		this.style.left = x+"px";
		this.style.top = y+"px";
		this.update();
	}

	update(){
		let width = this._targetCanvas.width/this._zoom;
		let height = this._targetCanvas.height/this._zoom;
		this._previewCanvas.width = width;
		this._previewCanvas.height = height;
		let pixelOffsetX = Math.round(this._x*this._targetCanvas.width/this.parentElement.offsetWidth-width/2);
		let pixelOffsetY = Math.round(this._y*this._targetCanvas.height/this.parentElement.offsetHeight-height/2);
		this._previewCtx.putImageData(this._targetCtx.getImageData(pixelOffsetX,pixelOffsetY,width,height),0,0);
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

	set targetCanvas(canvas){
		this._targetCanvas = canvas;
		this._targetCtx = canvas?canvas.getContext("2d"):null;
	}

	/**
	 * the canvas with image to zoom into.
	 * @type {HTMLCanvasElement}
	 */
	get targetCanvas(){
		return this._targetCanvas;
	}

	set zoom(zoom){
		if (this._zoom!==zoom){
			/** @type {number} */
			this._zoom = zoom;
			this.style.width = `${Math.cbrt(zoom)*100/zoom}%`;
			this.style.height = `${Math.cbrt(zoom)*100/zoom}%`;
		}
	}

	/**
	 * How much the preview should be zoomed in relative to the original image.
	 * @type {number}
	 */
	get zoom(){
		return this._zoom;
	}
}
customElements.define("fractal-zoom-preview",FractalZoomPreview);