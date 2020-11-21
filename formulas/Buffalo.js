import {FractalFormula, FractalFormulaSettings} from "../MandelMaths.js";

export default class BuffaloFormula extends FractalFormula {
	constructor({rotation=0}={}){
		super();
		this._rotation = rotation;
	}

	/**
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 * @inheritdoc
	 */
	iterate(cx,cy,maxIterations){
		const rx = Math.cos(this._rotation*Math.PI/180);
		const ry = Math.sin(this._rotation*Math.PI/180);
		let x = 0;
		let y = 0;
		let i;
		const cx2 = rx*cx+ry*cy;
		const cy2 = rx*cy-ry*cx;
		for (i=-1;i<maxIterations&&x*x+y*y<64;i++){
			let x2 = x*x-y*y;
			let y2 = 2*x*y;
			x = Math.abs(rx*x2-ry*y2)+cx2;
			y = Math.abs(rx*y2+ry*x2)+cy2;
		}
		return i;
	}

	createSettingsElement(){
		return new BuffaloFormulaSettings(this);
	}

	set rotation(rotation){
		this._rotation = rotation*1;
		this.callChangeCallbacks();
	}

	get rotation(){
		return this._rotation;
	}

	getParameters(){
		return {rotation:this._rotation};
	}
}
export class BuffaloFormulaSettings extends FractalFormulaSettings {
	/** @param {BuffaloFormula} formula */
	constructor(formula){
		super(formula);
		this.innerHTML = `
			Rotation: <input type="number" class="input-number" value="${formula.rotation}" step="any">
		`;
		this._rotationInput = this.querySelectorAll("input")[0];
		this._rotationInput.addEventListener("change",()=>{
			formula.rotation = parseFloat(this._rotationInput.value);
		});
	}
}
if (self.constructor.name==="Window"){
	customElements.define("buffalo-formula-settings",BuffaloFormulaSettings);
}