export const parseRatioString = (string)=>{
	if (/^\d+(?:\.\d+)?$/.test(string)){
		return string*1;
	}else if(/^\d+(?::|\/)\d+$/.test(string)){
		let [width,height] = string.split(/:|\//);
		return width/height;
	}else{
		throw new Error(`Error: unsupported ratio string "${string}".`)
	}
};
export default class FixedRatioContainer extends HTMLElement {
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
	}

	update(){
		let innerWidth = Math.min(this.offsetWidth,this.offsetHeight*this.ratio);
		let innerHeight = innerWidth/this.ratio;
		this._innerDiv.style.width = innerWidth+"px";
		this._innerDiv.style.height = innerHeight+"px";
	}

	set ratio(ratio){
		this.setAttribute("ratio",ratio);
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