import ScrollDiv from "./ScrollDiv.js";
import ResizeDiv from "./ResizeDiv.js";

export default class SidebarElement extends HTMLElement {
	constructor(){
		super();
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					--width: 250px;
					--min-width: 200px;
					height: 100%;
					background: #181818;
					box-shadow: 1px 0 7px #000000;
					z-index: 1;
					flex-shrink: 0;
					flex-grow: 0;
				}
				resize-div {
					width: var(--width);
					height: 100%;
				}
				scroll-div {
					width: 100%;
					--inner-width: 100%;
					height: 100%;
					direction: rtl;
				}
				#inner {
					padding: 20px;
					min-width: var(--min-width);
					direction: ltr;
				}
			</style>
			<resize-div resize-x="1" resize-y="0">
                <scroll-div>
                    <div id="inner">
                        <slot></slot>
                    </div>
                </scroll-div>
			</resize-div>
		`;
	}
}
customElements.define("sidebar-element",SidebarElement);