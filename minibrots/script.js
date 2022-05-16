import {MandelbrotBaseFormula,MandelbrotCyclicPoint,Disk,Minibrot} from "../formulas/Mandelbrot.js";
import { Complex } from "../MandelMaths.js";
import Utils, {onFirstVisible} from "../util/Utils.js";

Utils.onPageLoad(()=>{
	const container = document.getElementById("container");
	/*const formula = new MandelbrotBaseFormula();
	const minibrots = [
		[0,0,1],
		[-1,0,2],
		[-1.75,0,3],[0,1,3],
		[-1.9,0,4],[-1.3,0,4],[0,1,4],[0.5,0.5,4],
		[-1.98,0,5],[-1.85,0,5],[-1.6,0,5],[-1.3,0.4,5],[-0.5,0.5,5],[-0.2,1.1,5],[0,1,5],[0.4,0.6,5],[0.4,0.3,5],
		[-1.995,0,6],[-1.97,0,6],[-1.91,0,6],[-1.77,0,6],[-1.5,0,6],[-1.3,0.4,6],[-1.1,0.2,6],[-0.6,0.6,6],[-0.2,1.1,6],[-0.15,1.1,6],[-0.1,0.9,6],[0,1,6],[0.35,0.7,6],[0.4,0.6,6],[0.44,0.37,6],[0.4,0.2,6]
	].map(([cx,cy,n])=>cy==0?[[cx,cy,n]]:[[cx,cy,n],[cx,-cy,n]]).flat().map(([cx,cy,n])=>formula.getNearbyCyclicPoint(cx,cy,n));*/
	const minibrots = findMinibrots(8);
	console.log(minibrots);
	for (let minibrot of minibrots){
		let display = new MinibrotDisplay(minibrot);
		container.append(display);
	}
});
/**
 * Finds (or at least tries to) all minibrots of period `maxPeriod` or less.
 */
function findMinibrots(maxPeriod=1){
	const formula = new MandelbrotBaseFormula();
	const minibrots = [formula.getNearbyCyclicPoint(0,0,1),formula.getNearbyCyclicPoint(-1.25,0.4,5)];
	let prevMinibrots = [...minibrots];
	for (let n=1;n<=maxPeriod;n++){
		/** @type {(Disk|Minibrot)[]} */
		let nextMinibrots = [];
		for (let minibrot of prevMinibrots){
			estimateChildren(minibrot).forEach(c=>{
				console.log(c);
				let m = formula.getNearbyCyclicPoint(c.x,c.y,minibrot.cycleLength+1);
				if (m&&!isNaN(m.scale.length)&&!(minibrots.some(m2=>m2.equals(m))||nextMinibrots.some(m2=>m2.equals(m)))){
					nextMinibrots.push(m);
				}
			});
		}
		// todo: find remaining minibrots of period n using newtons method on the polynomial with known zeroes already divided out
		minibrots.push(...nextMinibrots);
		prevMinibrots = nextMinibrots;
	}
	//minibrots.splice(0,1);
	return minibrots;
}
/**
 * Returns the approximate positions of two nearby minibrots of period n+1 when given one of period n.
 * @param {MandelbrotCyclicPoint} minibrot 
 * @returns {Complex[]};
 */
function estimateChildren(minibrot){
	const cx = minibrot.x;
	const cy = minibrot.y;
	const n = minibrot.cycleLength;
	let zx = cx;
	let zy = cy;
	let dzx = 1;
	let dzy = 0;
	let ddzx = 0;
	let ddzy = 0;
	for (let i=0;i<n;i++){
		let zx2 = zx*zx-zy*zy+cx;
		let zy2 = 2*zx*zy+cy;
		let dzx2 = 2*(dzx*zx-dzy*zy);
		let dzy2 = 2*(dzx*zy+dzy*zx);
		let ddzx2 = 2*(dzx*dzx-dzy*dzy+ddzx*zx-ddzy*zy);
		let ddzy2 = 2*(2*dzx*dzy+ddzx*zy+ddzy*zx);
		zx = zx2;
		zy = zy2;
		dzx = dzx2;
		dzy = dzy2;
		ddzx = ddzx2;
		ddzy = ddzy2;
	}
	return Complex.getQuadraticRoots(new Complex(0.5*ddzx,0.5*ddzy),new Complex(dzx,dzy),new Complex(zx,zy)).map(c=>new Complex(c.x+minibrot.x,c.y+minibrot.y));
}
class MinibrotDisplay extends HTMLElement {
	/**
	 * @param {MandelbrotCyclicPoint} minibrot
	 */
	constructor(minibrot){
		super();
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = /* html */`
			<style>
				:host {
					display: inline-block;
					width: 240px;
					height: 180px;/*300px;*/
					border-radius: 4px;
					box-shadow: 0 0 5px 0 #00000080;
				}
			</style>
			<canvas width="240" height="180"></canvas>
		`;
		this._canvas = this.shadowRoot.querySelector("canvas");
		this._minibrot = minibrot;
		this.setAttribute("x",minibrot.x.toString());
		this.setAttribute("y",minibrot.y.toString());
		onFirstVisible(this,()=>this._render());
	}

	_render(){
		const canvas = this._canvas;
		const ctx = canvas.getContext("2d");
		const imgData = new ImageData(canvas.width,canvas.height);
		const pixels = new Uint32Array(imgData.data.buffer);
		const WIDTH = canvas.width;
		const HEIGHT = canvas.height;
		const ITER = this._minibrot.cycleLength*100;
		const CX = this._minibrot.x;
		const CY = this._minibrot.y;
		const SX = this._minibrot.scale.x;
		const SY = this._minibrot.scale.y;
		const SAMPLESIZE = 2;
		for (let x=0;x<WIDTH;x++){
			for (let y=0;y<HEIGHT;y++){
				let d = 0;
				for (let x2=0;x2<SAMPLESIZE;x2++){
					for (let y2=0;y2<SAMPLESIZE;y2++){
						let cx = (x+(x2+0.5)/SAMPLESIZE-0.5-WIDTH/2)/50-0.5;
						let cy = (-(y+(y2+0.5)/SAMPLESIZE-0.5)+HEIGHT/2)/50+1e-5;
						let cx2 = cx*SX-cy*SY;
						let cy2 = cx*SY+cy*SX;
						cx = cx2+CX;
						cy = cy2+CY;
						let dcx = SX/50;
						let dcy = SY/50;
						let zx = 0;
						let zy = 0;
						let dzx = 0;
						let dzy = 0;
						for (var i=0;i<ITER&&zx*zx+zy*zy<16;i++){
							let zx2 = zx*zx-zy*zy+cx;
							let zy2 = 2*zx*zy+cy;
							let dzx2 = 2.0*(zx*dzx-zy*dzy)+dcx;
							let dzy2 = 2.0*(zx*dzy+zy*dzx)+dcy;
							zx = zx2;
							zy = zy2;
							dzx = dzx2;
							dzy = dzy2;
						}
						d += Math.min(1,i==ITER?1:2*Math.sqrt((zx*zx+zy*zy)/(dzx*dzx+dzy*dzy))*0.5*Math.log(zx*zx+zy*zy));
					}
				}
				d /= SAMPLESIZE*SAMPLESIZE;
				pixels[x+y*canvas.width] = 0xff000000+0x010101*Math.floor(255.9*0.95*d);
			}
		}
		ctx.putImageData(imgData,0,0);
	}
}
customElements.define("minibrot-display",MinibrotDisplay);