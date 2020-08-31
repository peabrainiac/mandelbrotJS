/**
 * Custom element for the fractal explorer's status bar. Responsible for displaying information such as the current rendering status, progress, zoom depth etc.
 */
export default class FractalExplorerStatusbar extends HTMLElement {
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
		let time = `${`${Math.floor(this._time/3600)}`.padStart(1,"0")}:${`${Math.floor((this._time/60)%60)}`.padStart(2,"0")}:${(this._time%60).toFixed(2).padStart(5,"0")}`;
		let mouseInfo = this._mouseInfo;
		this._span.textContent = `${this._state} - ${progress}% - ${time}`.padEnd(20+time.length)+` | Zoom: ${zoom} / 2^${zoom2}`+(mouseInfo?" | "+mouseInfo:"");
	}

	set state(state){
		this._state = ""+state;
		this.update();
	}

	set progress(progress){
		this._progress = progress;
		this.update();
	}

	set time(time){
		this._time = time;
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

	/**
	 * A string representing the current state of the renderer.
	 * @type {string}
	 */
	get state(){
		return this._state;
	}

	/**
	 * A number between 0 and 1 indicating the current rendering progress.
	 * @type {number}
	 */
	get progress(){
		return this._progress;
	}

	/**
	 * The time spend rendering the current image in seconds.
	 * @type {number}
	 */
	get time(){
		return this._time;
	}

	/**
	 * The current zoom.
	 * @type {number}
	 */
	get zoom(){
		return this._zoom;
	}

	/**
	 * A string containing information about the pixel under the mouse.
	 * @type {string}
	 */
	get mouseInfo(){
		return this._mouseInfo;
	}
}
customElements.define("fractal-explorer-statusbar",FractalExplorerStatusbar);