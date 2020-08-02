export default class MandelbrotExplorerStatusbar extends HTMLElement {
	constructor(){
		super();
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					background-color: #000000bf;
					opacity: 0.75;
					transition: opacity 0.25s ease;
					padding: 3px 8px 3px 8px;
					font-family: monospace;
					font-size: 1.2em;
				}
				:host(:hover) {
					opacity: 1;
				}
				::selection {
					background-color: #ffaf0060;
				}
				span {
					white-space: pre-wrap;
				}
			</style>
			<span></span>
		`;
		this._span = this.shadowRoot.querySelector("span");
		this._state = "Loading";
		this._progress = 0;
		this._zoom = 1;
		this._mouseInfo = "";
	}

	update(){
		let progress = Math.round(1000*this._progress)/10;
		let zoom = this._zoom.toPrecision(2).replace(/\.?0?$/,"").replace(/e\+/,"e");
		let zoom2 = Math.round(10*Math.log2(this._zoom))/10;
		let mouseInfo = this._mouseInfo;
		this._span.textContent = `${this._state} - ${progress}%`.padEnd(17)+` | Zoom: ${zoom} / 2^${zoom2}`+(mouseInfo?" | "+mouseInfo:"");
	}

	set state(state){
		this._state = ""+state;
		this.update();
	}

	set progress(progress){
		this._progress = progress;
		this.update();
	}

	set zoom(zoom){
		this._zoom = zoom;
		this.update();
	}

	set mouseInfo(mouseInfo){
		this._mouseInfo = mouseInfo;
		this.update();
	}

	/** @type {string} */
	get state(){
		return this._state;
	}

	/** @type {number} */
	get progress(){
		return this._progress;
	}

	/** @type {number} */
	get zoom(){
		return this._zoom;
	}

	/** @type {string} */
	get mouseInfo(){
		return this._mouseInfo;
	}
}
customElements.define("mandelbrot-explorer-statusbar",MandelbrotExplorerStatusbar);