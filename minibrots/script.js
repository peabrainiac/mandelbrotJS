import {MandelbrotBaseFormula,MandelbrotCyclicPoint} from "../formulas/Mandelbrot.js";
import Utils from "../util/Utils.js";

Utils.onPageLoad(()=>{
	const container = document.getElementById("container");
	const formula = new MandelbrotBaseFormula();
	const minibrots = [
		[0,0,1],
		[-1,0,2],
		[-1.75,0,3],[0,1,3],[0,-1,3],
		[-1.9,0,4],[-1.3,0,4],[0,1,4],[0,-1,4],[0.5,0.5,4],[0.5,-0.5,4],
		[-1.98,0,5],[-1.85,0,5],[-1.6,0,5],[-1.3,0.4,5],[-1.3,-0.4,5],[-0.5,0.5,5],[-0.5,-0.5,5],[-0.2,1.1,5],[-0.2,-1.1,5],[0,1,5],[0,-1,5],[0.4,0.6,5],[0.4,-0.6,5],[0.4,0.3,5],[0.4,-0.3,5],
		[-1.995,0,6],[-1.97,0,6],[-1.91,0,6],[-1.77,0,6],[-1.5,0,6],[-1.3,0.4,6],[-1.3,-0.4,6],[-1.1,0.2,6],[-1.1,-0.2,6],[-0.6,0.6,6],[-0.6,-0.6,6],[-0.2,1.1,6],[-0.2,-1.1,6],[-0.15,1.1,6],[-0.15,-1.1,6],[-0.1,0.9,6],[-0.1,-0.9,6],[0,1,6],[0,-1,6],[0.35,0.7,6],[0.35,-0.7,6],[0.4,0.6,6],[0.4,-0.6,6],[0.44,0.37,6],[0.44,-0.37,6],[0.4,0.2,6],[0.4,-0.2,6]
	].map(([cx,cy,n])=>formula.getNearbyCyclicPoint(cx,cy,n));
	console.log(minibrots);
	for (let minibrot of minibrots){
		let display = new MinibrotDisplay(minibrot);
		container.append(display);
	}
});
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
		this._render();
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
						let cy = (y+(y2+0.5)/SAMPLESIZE-0.5-HEIGHT/2)/50+1e-5;
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