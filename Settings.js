import SidebarSection from "./SidebarSection.js";

export class GeneralSettingsGroup extends SidebarSection {
	constructor(){
		super();
		this.sectionTitle = "General";
		this.innerHTML = `
			Resolution: <input id="width" class="input-number" type="number" value="1920">x<input id="height" class="input-number" type="number" value="1080">
			Zoom factor: <select id="zoom-factor-select" class="input-select">
				<option value="2">2</option>
				<option value="4">4</option>
				<option value="8" selected="">8</option>
				<option value="16">16</option>
				<option value="32">32</option>
				<option value="64">64</option>
				<option value="128">128</option>
			</select>
			<br><br>
			<div style="text-align:center">
				<span id="screenshot-button" class="button" style="display:inline-block">Save image</span>
			</div>
		`;
		this._widthInput = this.querySelector("#width");
		this._heightInput = this.querySelector("#height");
		this._screenshotButton = this.querySelector("#screenshot-button");
		this._zoomFactorSelect = this.querySelector("#zoom-factor-select");
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
		callback(width,height);
	}

	onScreenshotTake(callback){
		this._screenshotButton.addEventListener("click",()=>{
			callback();
		});
	}

	onZoomFactorChange(callback){
		this._zoomFactorSelect.addEventListener("change",()=>{
			callback(this._zoomFactorSelect.value);
		});
		callback(this._zoomFactorSelect.value);
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
export class ToolsSettingsGroup extends SidebarSection {
	constructor(){
		super();
		this.sectionTitle = "Tools";
		this.innerHTML = `
			<div style="text-align:center">
				<span id="find-orbit-button" class="button" style="display:inline-block">Find orbit points</span>
			</div>
		`;
		this._findOrbitButton = this.querySelector("#find-orbit-button");
	}

	onFindOrbitButtonClick(callback){
		this._findOrbitButton.addEventListener("click",()=>{
			callback();
		});
	}
}
customElements.define("general-settings-group",GeneralSettingsGroup);
customElements.define("tools-settings-group",ToolsSettingsGroup);