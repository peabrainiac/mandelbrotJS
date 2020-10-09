import {FractalFormula, FractalFormulaSettings} from "../MandelMaths.js";

export default class MoebiusMandelbrotFormula extends FractalFormula {
	constructor({offset=1}={}){
		super();
		this._a = offset;
	}

	/**
	 * Returns the iteration count for a specific point in the mandelbrot set.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {Object} options
	 * @param {number} options.maxIterations maximum number of iterations
	 */
	iterate(cx,cy,{maxIterations=100}){
		const a = this._a;
		let x = 0;
		let y = 0;
		let i;
		for (i=-1;i<maxIterations&&x*x+y*y<64;i++){
			let temp = x*x-y*y+cx;
			y = 2*x*y+cy;
			x = temp;
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
		this._a = offset*1;
		this.callChangeCallbacks();
	}

	get offset(){
		return this._a;
	}

	getParameters(){
		return {offset:this._a};
	}
}
export class MoebiusMandelbrotFormulaSettings extends FractalFormulaSettings {
	/** @param {MoebiusMandelbrotFormula} formula */
	constructor(formula){
		super(formula);
		this.innerHTML = `
			Offset: <input type="number" class="input-number" value="${formula.offset}" step="any">
		`;
		this._offsetInput = this.querySelectorAll("input")[0];
		this._offsetInput.addEventListener("change",()=>{
			formula.offset = this._offsetInput.value;
		});
	}
}
if (self.constructor.name==="Window"){
	customElements.define("moebius-mandelbrot-formula-settings",MoebiusMandelbrotFormulaSettings);
}