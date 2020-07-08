import SidebarSection from "./SidebarSection.js";

export class GeneralSettingsGroup extends SidebarSection {
	constructor(){
		super();
		this.sectionTitle = "General";
		this.innerHTML = `
			Resolution: <input id="width" class="input-number" type="number" value="1920">x<input id="height" class="input-number" type="number" value="1080">
			<br><br>
			<span id="screenshot-button" class="button">Save image</span>
		`;
		this._widthInput = this.querySelector("#width");
		this._heightInput = this.querySelector("#height");
		this._screenshotButton = this.querySelector("#screenshot-button");
	}

	onResolutionChange(callback){
		let width = this.width;
		let height = this.height;
		this._widthInput.addEventListener("change",()=>{
			if (width!==this.width){
				width = this.width;
				callback(width,height);
			}
		});
		this._heightInput.addEventListener("change",()=>{
			if (height!==this.height){
				height = this.height;
				callback(width,height);
			}
		});
	}

	onScreenshotTake(callback){
		this._screenshotButton.addEventListener("click",()=>{
			callback();
		});
	}

	set width(width){
		this._widthInput.value = width;
	}

	get width(){
		return 1*this._widthInput.value;
	}

	set height(height){
		this._heightInput.value = height;
	}

	get height(){
		return 1*this._heightInput.value;
	}
}
customElements.define("general-settings-group",GeneralSettingsGroup);