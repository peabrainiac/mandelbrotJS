import {ComplexJacobian,FractalFormula,FractalFormulaSettings} from "../MandelMaths.js";

/**
 * Formula for fractals of the type `z->(yabs(z/r)*r)^2+c`, where `r` is a parameter that indicates the rotation of the imaginary-only componentwise abs operation.
 * 
 * Fractals falling into this class are for example the perpendicular burning ship and perpendicular mandelbrot.
 */
export default class PerpendicularBurningShipFormula extends FractalFormula {
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
		const rx = -Math.cos(this._rotation*Math.PI/180);
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
		const rx = -Math.cos(this._rotation*Math.PI/180);
		const ry = Math.sin(this._rotation*Math.PI/180);
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
			let zx2 = rx*zx+ry*zy;
			let zy2 = rx*zy-ry*zx;
			let sy = Math.sign(zy2);
			let zxdzx2 = rx*zxdzx+ry*zydzx;
			let zydzx2 = sy*(rx*zydzx-ry*zxdzx);
			let zxdzy2 = rx*zxdzy+ry*zydzy;
			let zydzy2 = sy*(rx*zydzy-ry*zxdzy);
			let zxdcx2 = rx*zxdcx+ry*zydcx;
			let zydcx2 = sy*(rx*zydcx-ry*zxdcx);
			let zxdcy2 = rx*zxdcy+ry*zydcy;
			let zydcy2 = sy*(rx*zydcy-ry*zxdcy);
			zx = zx2;
			zy = Math.abs(zy2);
			zx2 = rx*zx-ry*zy;
			zy2 = rx*zy+ry*zx;
			let zxdzx3 = rx*zxdzx2-ry*zydzx2;
			let zydzx3 = rx*zydzx2+ry*zxdzx2;
			let zxdzy3 = rx*zxdzy2-ry*zydzy2;
			let zydzy3 = rx*zydzy2+ry*zxdzy2;
			let zxdcx3 = rx*zxdcx2-ry*zydcx2;
			let zydcx3 = rx*zydcx2+ry*zxdcx2;
			let zxdcy3 = rx*zxdcy2-ry*zydcy2;
			let zydcy3 = rx*zydcy2+ry*zxdcy2;
			zx = zx2*zx2-zy2*zy2+cx;
			zy = 2*zx2*zy2+cy;
			zxdzx = 2*(zx*zxdzx3-zy*zydzx3);
			zydzx = 2*(zx*zydzx3+zy*zxdzx3);
			zxdzy = 2*(zx*zxdzy3-zy*zydzy3);
			zydzy = 2*(zx*zydzy3+zy*zxdzy3);
			zxdcx = 2*(zx*zxdcx3-zy*zydcx3)+1;
			zydcx = 2*(zx*zydcx3+zy*zxdcx3);
			zxdcy = 2*(zx*zxdcy3-zy*zydcy3);
			zydcy = 2*(zx*zydcy3+zy*zxdcy3)+1;
			yield {zx,zy,zdz:new ComplexJacobian(zxdzx,zydzx,zxdzy,zydzy),zdc:new ComplexJacobian(zxdcx,zydcx,zxdcy,zydcy)};
		}
	}

	createSettingsElement(){
		return new PerpendicularBurningShipFormulaSettings(this);
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
/**
 * @extends FractalFormulaSettings<PerpendicularBurningShipFormula>
 */
export class PerpendicularBurningShipFormulaSettings extends FractalFormulaSettings {
	/** @param {PerpendicularBurningShipFormula} formula */
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
	customElements.define("perpendicular-burning-ship-formula-settings",PerpendicularBurningShipFormulaSettings);
}