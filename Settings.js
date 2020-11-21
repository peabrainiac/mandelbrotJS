import SidebarSection from "./SidebarSection.js";
import FractalExplorer from "./explorer/FractalExplorer.js";

import {FractalFormula} from "./MandelMaths.js";
import MandelbrotFormula from "./formulas/Mandelbrot.js";
import MandelbarFormula from "./formulas/Mandelbar.js";
import MoebiusMandelbrotFormula from "./formulas/MoebiusMandelbrot.js";
import BurningShipFormula from "./formulas/BurningShip.js";
import BuffaloFormula from "./formulas/Buffalo.js";
import PerpendicularBurningShipFormula from "./formulas/PerpendicularBurningShip.js";

export class GeneralSettingsGroup extends SidebarSection {
	constructor(){
		super();
		this.sectionTitle = "General";
		this.innerHTML = `
			Resolution: <input id="width" class="input-number" type="number" value="1920">x<input id="height" class="input-number" type="number" value="1080"><br>
			Pixels per unit: <input id="pixels-per-unit" class="input-number" type="number" step="any" value="200">
			<br><br>
			Iterations: <input id="iterations" class="input-number" type="number" value="200">
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
			Multisampling: <select id="samples-per-pixel-select" class="input-select">
				<option value="1" selected="">off</option>
				<option value="2">x2</option>
				<option value="4">x4</option>
				<option value="8">x8</option>
				<option value="16">x16</option>
				<option value="32">x32</option>
				<option value="64">x64</option>
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
		/** @type {HTMLSelectElement} */
		this._samplesPerPixelSelect = this.querySelector("#samples-per-pixel-select");
	}

	/**
	 * @param {FractalExplorer} fractalExplorer 
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
		this.onSamplesPerPixelChange((samplesPerPixel)=>{
			fractalExplorer.samplesPerPixel = samplesPerPixel;
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

	/**
	 * Registers a callback to be executed whenever the samplesPerPixel-value gets changed, and once when it is registered.
	 * @param {(samplesPerPixel:number)=>void} callback
	 */
	onSamplesPerPixelChange(callback){
		this._samplesPerPixelSelect.addEventListener("change",()=>{
			callback(this._samplesPerPixelSelect.value*1);
		});
		callback(this._samplesPerPixelSelect.value*1);
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
export class FormulaSettingsGroup extends SidebarSection {
	constructor(){
		super();
		this.sectionTitle = "Formula";
		this.innerHTML = `
			Fractal: <select id="formula-select" class="input-select">
				<option value="0" selected="">Mandelbrot set</option>
				<option value="1">Mandelbar set</option>
				<option value="2">Möbius mandelbrot set</option>
				<option value="3">Burning ship</option>
				<option value="4">Perpendicular burning ship</option>
				<option value="5">Buffalo</option>
			</select>
			<br><br>
			<div id="formula-settings-container"></div>
		`;
		/** @type {FractalFormula[]} */
		this._formulas = [new MandelbrotFormula(),new MandelbarFormula(),new MoebiusMandelbrotFormula(),new BurningShipFormula(),new PerpendicularBurningShipFormula(),new BuffaloFormula()];
		/** @type {HTMLSelectElement} */
		this._formulaSelect = this.querySelector("#formula-select");
		this._formulaSettingsContainer = this.querySelector("#formula-settings-container");
		this.onFormulaChange(formula=>{
			while(this._formulaSettingsContainer.firstChild){
				this._formulaSettingsContainer.firstChild.remove();
			}
			if (formula.settingsElement){
				this._formulaSettingsContainer.appendChild(formula.settingsElement);
			}
		});
	}

	/**
	 * @param {FractalExplorer} fractalExplorer 
	 */
	link(fractalExplorer){
		this.onFormulaChange((formula)=>{
			fractalExplorer.formula = formula;
		});
	}

	get formulas(){
		return this._formulas;
	}

	get formula(){
		return this._formulas[this._formulaSelect.value];
	}

	/**
	 * @param {(formula:FractalFormula)=>void} callback 
	 */
	onFormulaChange(callback){
		this._formulaSelect.addEventListener("change",()=>{
			callback(this.formula);
		});
		callback(this.formula);
	}
}
export class ToolsSettingsGroup extends SidebarSection {
	constructor(){
		super();
		this.sectionTitle = "Tools";
		this.innerHTML = `
			<div style="text-align:center">
				<span id="find-cyclic-button" class="button" style="display:inline-block">Find cyclic points</span>
			</div>
		`;
		this._findOrbitButton = this.querySelector("#find-cyclic-button");
	}

	onFindCyclicButtonClick(callback){
		this._findOrbitButton.addEventListener("click",()=>{
			callback();
		});
	}
}
customElements.define("general-settings-group",GeneralSettingsGroup);
customElements.define("formula-settings-group",FormulaSettingsGroup);
customElements.define("tools-settings-group",ToolsSettingsGroup);