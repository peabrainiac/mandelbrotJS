import SidebarSection from "./SidebarSection.js";
import MandelbrotExplorerElement from "./MandelbrotExplorerElement.js";

export class GeneralSettingsGroup extends SidebarSection {
	constructor(){
		super();
		this.sectionTitle = "General";
		this.innerHTML = `
			Resolution: <input id="width" class="input-number" type="number" value="1920">x<input id="height" class="input-number" type="number" value="1080"><br>
			Pixels per unit: <input id="pixels-per-unit" class="input-number" type="number" step="any" value="200">
			<br><br>
			Iterations: <input id="iterations" class="input-number" type="number" value="2000">
			<br><br>
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
		this._pixelsPerUnitInput = this.querySelector("#pixels-per-unit");
		this._iterationsInput = this.querySelector("#iterations");
		this._screenshotButton = this.querySelector("#screenshot-button");
		this._zoomFactorSelect = this.querySelector("#zoom-factor-select");
	}

	/**
	 * @param {MandelbrotExplorerElement} fractalExplorer 
	 */
	link(fractalExplorer){
		this.onResolutionChange((width,height)=>{
			fractalExplorer.width = width;
			fractalExplorer.height = height;
		});
		this.onPixelsPerUnitChange((pixelsPerUnit)=>{
			fractalExplorer.pixelsPerUnit = pixelsPerUnit;
		});
		this.onIterationsChange((iterations)=>{
			fractalExplorer.iterations = iterations;
		});
		this.onScreenshotTake(async()=>{
			let blob = await fractalExplorer.toBlob();
			let url = URL.createObjectURL(blob);
			let a = document.createElement("a");
			a.href = url;
			a.download = "image.png";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		});
		this.onZoomFactorChange((zoomFactor)=>{
			fractalExplorer.zoomFactor = zoomFactor;
		});
	}

	/**
	 * @param {(width:number,height:number)=>{}} callback 
	 */
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

	/**
	 * @param {(pixelsPerUnit:number)=>{}} callback 
	 */
	onPixelsPerUnitChange(callback){
		let width = this.width;
		let height = this.height;
		let pixelsPerUnit = this.pixelsPerUnit;
		this._widthInput.addEventListener("change",()=>{
			if (width!==this.width){
				let oldWidth = width;
				width = this.width;
				this.pixelsPerUnit *= Math.sqrt((width*width+height*height)/(oldWidth*oldWidth+height*height));
				pixelsPerUnit = this.pixelsPerUnit;
				callback(pixelsPerUnit);
			}
		});
		this._heightInput.addEventListener("change",()=>{
			if (height!==this.height){
				let oldHeight = height;
				height = this.height;
				this.pixelsPerUnit *= Math.sqrt((width*width+height*height)/(width*width+oldHeight*oldHeight));
				pixelsPerUnit = this.pixelsPerUnit;
				callback(pixelsPerUnit);
			}
		});
		this._pixelsPerUnitInput.addEventListener("change",()=>{
			if (pixelsPerUnit!==this.pixelsPerUnit){
				pixelsPerUnit = this.pixelsPerUnit;
				callback(pixelsPerUnit);
			}
		});
		callback(this.pixelsPerUnit);
	}

	/**
	 * @param {(iterations:number)=>{}} callback 
	 */
	onIterationsChange(callback){
		this._iterationsInput.addEventListener("change",()=>{
			callback(this.iterations);
		});
		callback(this.iterations);
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

	set pixelsPerUnit(pixelsPerUnit){
		this._pixelsPerUnitInput.value = ((pixelsPerUnit+0.03)%1<0.06)?Math.round(pixelsPerUnit):Math.round(pixelsPerUnit*100)/100;
	}

	get pixelsPerUnit(){
		return 1*this._pixelsPerUnitInput.value;
	}

	set iterations(iterations){
		this._iterationsInput.value = iterations;
	}

	get iterations(){
		return 1*this._iterationsInput.value;
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