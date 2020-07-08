export default class SidebarSection extends HTMLElement {
	constructor(){
		super();
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
				}
				#header {
					padding: 5px 0;
					font-size: 1.2em;
					color: #ffaf00;
					cursor: default;
					transition: text-shadow 0.1s ease;
				}
				#header > svg {
					fill: currentcolor;
					margin-bottom: 1px;
					transform: rotate(90deg);
					transition: transform 0.5s ease;
				}
				#header:hover {
					text-shadow: 0 0 2px #ffaf00;
				}
				#title {
					margin-left: 0;
					transition: margin-left 0.1s ease;
				}
				#header:hover #title {
					margin-left: 2px;
				}
				#body {
					transition: height 0.5s ease, margin-bottom 0.5s ease;
					overflow: hidden;
					margin-bottom: 15px;
				}
				:host(.collapsed) #body {
					height: 0;
					margin-bottom: 0;
				}
				:host(.collapsed) #header > svg {
					transform: none;
				}
			</style>
			<div id="header">
				<svg width="10" height="10" viewBox="0 0 4 4">
					<path d="M 1 0 L 3 2 L 1 4"></path>
				</svg>
				<span id="title"></span>
			</div>
			<div id="body">
				<slot></slot>
			</div>
		`;
		this.classList.add("collapsed");
		this._header = this.shadowRoot.getElementById("header");
		this._titleSpan = this.shadowRoot.getElementById("title");
		this._body = this.shadowRoot.getElementById("body");
		this._header.addEventListener("click",()=>{
			if (this.classList.contains("collapsed")){
				this.expand();
			}else{
				this.collapse();
			}
		});
		this._header.addEventListener("mousedown",(e)=>{
			e.preventDefault();
		});
	}

	collapse(){
		this._body.style.height = this._body.offsetHeight+"px";
		setTimeout(()=>{
			this.classList.add("collapsed");
			this._body.style.height = 0;
		},30);
	}

	expand(){
		this._body.style.height = this._body.scrollHeight+"px";
		this.classList.remove("collapsed");
		setTimeout(()=>{
			this._body.style.removeProperty("height");
		},500);
	}

	set sectionTitle(title){
		this.setAttribute("section-title",title);
	}

	get sectionTitle(){
		return this.getAttribute("section-title");
	}

	static get observedAttributes(){
		return ["section-title"];
	}

	attributeChangedCallback(name,oldValue,newValue){
		if (name==="section-title"){
			this._titleSpan.textContent = newValue;
		}
	}
}
customElements.define("sidebar-section",SidebarSection);