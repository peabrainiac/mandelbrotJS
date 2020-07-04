export default class ZoomPreviewElement extends HTMLElement {
	constructor(canvas){
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
				}
			</style>
			<canvas></canvas>
		`;
		this._previewCanvas = this.shadowRoot.querySelector("canvas");
		this._targetCanvas = canvas;
		this._previewCtx = this._previewCanvas.getContext("2d");
		this._targetCtx = this._targetCanvas.getContext("2d");
		this.hide();
		this.zoom = 8;
	}

	setPosition(x,y,zoom=this._zoom){
		this.zoom = zoom;
		this.style.left = x+"px";
		this.style.top = y+"px";
		let width = this._targetCanvas.width/zoom;
		let height = this._targetCanvas.height/zoom;
		this._previewCanvas.width = width;
		this._previewCanvas.height = height;
		this._previewCtx.putImageData(this._targetCtx.getImageData(Math.round(x-width/2),Math.round(y-height/2),width,height),0,0);
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

	set zoom(zoom){
		if (this._zoom!==zoom){
			this._zoom = zoom;
			this.style.width = `${Math.cbrt(zoom)*100/zoom}%`;
			this.style.height = `${Math.cbrt(zoom)*100/zoom}%`;
		}
	}

	get zoom(){
		return this._zoom;
	}
}
customElements.define("zoom-preview-element",ZoomPreviewElement);