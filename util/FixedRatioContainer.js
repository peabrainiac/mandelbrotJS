/** @param {string} string */
export const parseRatioString = (string)=>{
	if (/^\d+(?:\.\d+)?$/.test(string)){
		return string*1;
	}else if(/^\d+(?::|\/)\d+$/.test(string)){
		let [width,height] = string.split(/:|\//);
		return width/height;
	}else{
		throw new Error(`Error: unsupported ratio string "${string}".`);
	}
};
/**
 * Custom element that keeps its contents at a fixed ratio, leaving empty space either above and below or on both sides next to it.
 * The element itself occupies any space a normal element would; only its contents are kept at a certain ratio.
 * 
 * Usable as `<fixed-ratio-container ratio="x:y">`.
 */
export default class FixedRatioContainer extends HTMLElement {
	/**
	 * Constructs a new FixedRatioContainer.
	 * @param {number} ratio initial ratio, defaults to one
	 */
	constructor(ratio=1){
		super();
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					position: relative;
				}
				#inner {
					position: absolute;
					left: 50%;
					top: 50%;
					transform: translate(-50%,-50%);
				}
			</style>
			<div id="inner">
				<slot></slot>
			</div>
		`;
		this._innerDiv = this.shadowRoot.getElementById("inner");
		this._resizeObserver = new ResizeObserver(()=>{
			this.update();
		});
		this._resizeObserver.observe(this);
		this.ratio = ratio;
		// calls these manually because `attributeChangedCallback` doesn't seem to work while still in constructor
		this._ratio = parseRatioString(ratio);
		this.update();
	}

	update(){
		let innerWidth = Math.min(this.offsetWidth,this.offsetHeight*this.ratio);
		let innerHeight = innerWidth/this.ratio;
		this._innerDiv.style.width = innerWidth+"px";
		this._innerDiv.style.height = innerHeight+"px";
	}

	/**
	 * The ratio that the contents of this element are kept at. While this is technically a number, its setter also accepts strings of the format `x:y`, converting them to the number `x/y`.
	 * Also accessible via the attribute with the same name.
	 */
	set ratio(ratio){
		this.setAttribute("ratio",ratio+"");
	}

	get ratio(){
		return this._ratio;
	}

	static get observedAttributes(){
		return ["ratio"];
	}

	attributeChangedCallback(name,oldValue,newValue){
		if (name==="ratio"){
			this._ratio = parseRatioString(newValue);
			this.update();
		}
	}
}
customElements.define("fixed-ratio-container",FixedRatioContainer);