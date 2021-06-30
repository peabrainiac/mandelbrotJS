import {ComplexJacobian,FractalFormula,FractalFormulaSettings} from "../MandelMaths.js";

export default class BurningShipFormula extends FractalFormula {
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
		const rx2 = rx*rx-ry*ry;
		const ry2 = 2*rx*ry;
		const cx2 = rx2*cx+ry2*cy;
		const cy2 = rx2*cy-ry2*cx;
		for (i=-1;i<maxIterations&&x*x+y*y<64;i++){
			let x2 = x*x-y*y+cx2;
			let y2 = 2*x*y+cy2;
			x = Math.abs(rx*x2-ry*y2);
			y = Math.abs(rx*y2+ry*x2);
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
		const rx2 = rx*rx-ry*ry;
		const ry2 = 2*rx*ry;
		const cx2 = rx2*cx+ry2*cy;
		const cy2 = rx2*cy-ry2*cx;
		const cxdc = rx2;
		const cydc = -ry2;
		let zx = rx*cx2-ry*cy2;
		let zy = ry*cx2+rx*cy2;
		let sx = Math.sign(zx);
		let sy = Math.sign(zy);
		zx = Math.abs(zx);
		zy = Math.abs(zy);
		let zxdzx = sx*(rx*cxdc);
		let zydzx = sy*(ry*cydc);
		let zxdzy = sx*(ry*cydc);
		let zydzy = sy*(rx*cxdc);
		let zxdcx = sx*(rx*cxdc);
		let zydcx = sy*(ry*cydc);
		let zxdcy = sx*(ry*cydc);
		let zydcy = sy*(rx*cxdc);
		let i;
		for (i=0;i<maxIterations;i++){
			let zx2 = zx*zx-zy*zy+cx2;
			let zy2 = 2*zx*zy+cy2;
			let zxdzx2 = 2*(zx*zxdzx-zy*zydzx);
			let zydzx2 = 2*(zx*zydzx+zy*zxdzx);
			let zxdzy2 = 2*(zx*zxdzy-zy*zydzy);
			let zydzy2 = 2*(zx*zydzy+zy*zxdzy);
			let zxdcx2 = 2*(zx*zxdcx-zy*zydcx)+cxdc;
			let zydcx2 = 2*(zx*zydcx+zy*zxdcx)+cydc;
			let zxdcy2 = 2*(zx*zxdcy-zy*zydcy)-cydc;
			let zydcy2 = 2*(zx*zydcy+zy*zxdcy)+cxdc;
			zx = rx*zx2-ry*zy2;
			zy = ry*zx2+rx*zy2;
			let sx = Math.sign(zx);
			let sy = Math.sign(zy);
			zx = Math.abs(zx);
			zy = Math.abs(zy);
			zxdzx = sx*(rx*zxdzx2);
			zydzx = sy*(ry*zydzx2);
			zxdzy = sx*(-ry*zxdzy2);
			zydzy = sy*(rx*zydzy2);
			zxdcx = sx*(rx*zxdcx2);
			zydcx = sy*(ry*zydcx2);
			zxdcy = sx*(-ry*zxdcy2);
			zydcy = sy*(rx*zydcy2);
			yield {zx,zy,zdz:new ComplexJacobian(zxdzx,zydzx,zxdzy,zydzy),zdc:new ComplexJacobian(zxdcx,zydcx,zxdcy,zydcy)};
		}
	}

	createSettingsElement(){
		return new BurningShipFormulaSettings(this);
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
export class BurningShipFormulaSettings extends FractalFormulaSettings {
	/** @param {BurningShipFormula} formula */
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
	customElements.define("burning-ship-formula-settings",BurningShipFormulaSettings);
}