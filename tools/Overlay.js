import FixedRatioContainer from "../util/FixedRatioContainer.js";

/**
 * Costum element that display its contents centered, in front of everything else, and on a semitransparent background that closes the overlay when clicked at.
 * 
 * Usable as `<overlay-element ratio="x:y">`. See `<fixed-ratio-container>` for more information about the ratio attribute.
 */
export default class Overlay extends HTMLElement {
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
					right: 0;
					bottom: 0;
					background: #000000af;
					z-index: 3;
				}
				fixed-ratio-container {
					position: absolute;
					left: 0;
					top: 0;
					right: 0;
					bottom: 0;
					width: 90%;
					height: 90%;
					margin: auto;
				}
			</style>
			<fixed-ratio-container>
				<slot></slot>
			</fixed-ratio-container>
		`;
		/** @type {FixedRatioContainer} */
		this._container = this.shadowRoot.querySelector("fixed-ratio-container");
		this.addEventListener("click",e=>{
			if (e.target===this){
				this.close();
			}
		});
	}

	close(){
		this.remove();
	}
	
	/**
	 * The ratio that the contents of this element are kept at. While this is technically a number, its setter also accepts strings of the format `x:y`, converting them to the number `x/y`.
	 * Also accessible via the attribute with the same name.
	 */
	set ratio(ratio){
		this.setAttribute("ratio",ratio+"");
	}

	get ratio(){
		return this._container.ratio;
	}

	static get observedAttributes(){
		return ["ratio"];
	}

	attributeChangedCallback(name,oldValue,newValue){
		if (name==="ratio"){
			this._container.ratio = newValue;
		}
	}
}
customElements.define("overlay-element",Overlay);