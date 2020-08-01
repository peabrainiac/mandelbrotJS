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
					padding: 2px 8px 3px 8px;
				}
				:host(:hover) {
					opacity: 1;
				}
			</style>
			<span></span>
		`;
		this._span = this.shadowRoot.querySelector("span");
		this._state = "Loading";
		this._progress = 0;
		this._zoom = 1;
	}

	update(){
		let progress = Math.round(1000*this._progress)/10;
		let zoom = this._zoom.toPrecision(2).replace(/\.?0?$/,"").replace(/e\+/,"e");
		let zoom2 = Math.round(10*Math.log2(this._zoom))/10;
		this._span.textContent = `${this._state} - ${progress}% | Zoom: ${zoom} / 2^${zoom2}`;
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
}
customElements.define("mandelbrot-explorer-statusbar",MandelbrotExplorerStatusbar);