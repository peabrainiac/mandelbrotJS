import {ComplexJacobian,FractalFormula,FractalFormulaSettings} from "../MandelMaths.js";

/**
 * Formula for fractals of the type `z->cabs(z^2*r)+c`, where `r` is a parameter that indicates the rotation of the componentwise abs operation.
 */
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
		const rx = Math.cos(this._rotation*Math.PI/360);
		const ry = Math.sin(this._rotation*Math.PI/360);
		let x = 0;
		let y = 0;
		let i;
		for (i=-1;i<maxIterations&&x*x+y*y<64;i++){
			let x2 = x*x-y*y;
			let y2 = 2*x*y;
			x = Math.abs(rx*x2-ry*y2)+cx;
			y = Math.abs(rx*y2+ry*x2)+cy;
		}
		return i;
	}

	/**
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 * @returns {Generator<{zx:number,zy:number,zdz:ComplexJacobian,zdc:ComplexJacobian},void,void>}
	 */
	 *iterator(cx,cy,maxIterations){
		const rx = Math.cos(this._rotation*Math.PI/360);
		const ry = Math.sin(this._rotation*Math.PI/360);
		let zx = cx;
		let zy = cy;
		let zxdzx = 1;
		let zydzx = 0;
		let zxdzy = 0;
		let zydzy = 1;
		let zxdcx = 1;
		let zydcx = 0;
		let zxdcy = 0;
		let zydcy = 1;
		let i;
		yield {zx,zy,zdz:new ComplexJacobian(zxdzx,zydzx,zxdzy,zydzy),zdc:new ComplexJacobian(zxdcx,zydcx,zxdcy,zydcy)};
		for (i=0;i<maxIterations;i++){
			let zx2 = zx*zx-zy*zy;
			let zy2 = 2*zx*zy;
			let zxdzx2 = 2*(zx*zxdzx-zy*zydzx);
			let zydzx2 = 2*(zx*zydzx+zy*zxdzx);
			let zxdzy2 = 2*(zx*zxdzy-zy*zydzy);
			let zydzy2 = 2*(zx*zydzy+zy*zxdzy);
			let zxdcx2 = 2*(zx*zxdcx-zy*zydcx);
			let zydcx2 = 2*(zx*zydcx+zy*zxdcx);
			let zxdcy2 = 2*(zx*zxdcy-zy*zydcy);
			let zydcy2 = 2*(zx*zydcy+zy*zxdcy);
			zx = rx*zx2-ry*zy2;
			zy = rx*zy2+ry*zx2;
			let sx = Math.sign(zx);
			let sy = Math.sign(zy);
			zx = Math.abs(zx)+cx;
			zy = Math.abs(zy)+cy;
			zxdzx = sx*(rx*zxdzx2-ry*zydzx2);
			zydzx = sy*(rx*zydzx2+ry*zxdzx2);
			zxdzy = sx*(rx*zxdzy2-ry*zydzy2);
			zydzy = sy*(rx*zydzy2+ry*zxdzy2);
			zxdcx = sx*(rx*zxdcx2-ry*zydcx2)+1;
			zydcx = sy*(rx*zydcx2+ry*zxdcx2);
			zxdcy = sx*(rx*zxdcy2-ry*zydcy2);
			zydcy = sy*(rx*zydcy2+ry*zxdcy2)+1;
			yield {zx,zy,zdz:new ComplexJacobian(zxdzx,zydzx,zxdzy,zydzy),zdc:new ComplexJacobian(zxdcx,zydcx,zxdcy,zydcy)};
		}
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