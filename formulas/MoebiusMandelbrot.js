import {FractalFormula, FractalFormulaSettings} from "../MandelMaths.js";

export default class MoebiusMandelbrotFormula extends FractalFormula {
	constructor({offset=1,rotation=0}={}){
		super();
		this._offset = offset;
		this._rotation = rotation;
	}

	/**
	 * @inheritdoc
	 * @param {number} cx
	 * @param {number} cy
	 */
	iterate(cx,cy,{maxIterations=100}){
		const a = this._offset;
		const rx = Math.cos(this._rotation*Math.PI/180);
		const ry = Math.sin(this._rotation*Math.PI/180);
		let x = 0;
		let y = 0;
		let i;
		const rx2 = rx*rx-ry*ry;
		const ry2 = 2*rx*ry;
		const cx2 = rx2*cx+ry2*cy;
		const cy2 = rx2*cy-ry2*cx;
		for (i=-1;i<maxIterations&&x*x+y*y<64;i++){
			let x2 = x*x-y*y+cx2;
			let y2 = 2*x*y+cy2;
			x = rx*x2-ry*y2;
			y = rx*y2+ry*x2;
			if (x<-a){
				x += 2*a;
				y *= -1;
			}else if(x>a){
				x -= 2*a;
				y *= -1;
			}
		}
		return i;
	}

	createSettingsElement(){
		return new MoebiusMandelbrotFormulaSettings(this);
	}

	set offset(offset){
		this._offset = offset*1;
		this.callChangeCallbacks();
	}

	get offset(){
		return this._offset;
	}

	set rotation(rotation){
		this._rotation = rotation*1;
		this.callChangeCallbacks();
	}

	get rotation(){
		return this._rotation;
	}

	getParameters(){
		return {offset:this._offset,rotation:this._rotation};
	}
}
export class MoebiusMandelbrotFormulaSettings extends FractalFormulaSettings {
	/** @param {MoebiusMandelbrotFormula} formula */
	constructor(formula){
		super(formula);
		this.innerHTML = `
			Offset: <input type="number" class="input-number" value="${formula.offset}" step="any"><br>
			Rotation: <input type="number" class="input-number" value="${formula.rotation}" step="any">
		`;
		this._offsetInput = this.querySelectorAll("input")[0];
		this._offsetInput.addEventListener("change",()=>{
			formula.offset = parseFloat(this._offsetInput.value);
		});
		this._rotationInput = this.querySelectorAll("input")[1];
		this._rotationInput.addEventListener("change",()=>{
			formula.rotation = parseFloat(this._rotationInput.value);
		});
	}
}
if (self.constructor.name==="Window"){
	customElements.define("moebius-mandelbrot-formula-settings",MoebiusMandelbrotFormulaSettings);
}