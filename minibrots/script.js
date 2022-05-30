import {MandelbrotBaseFormula,MandelbrotPeriodicPoint,Disk,Minibrot} from "../formulas/Mandelbrot.js";
import {Complex} from "../MandelMaths.js";
import Utils, {onFirstVisible} from "../util/Utils.js";
import {externalAngleType,Fraction,getAngledInternalAddress,getKneadingSequence} from "./SymbolicMandelMaths.js";

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
	].map(([cx,cy,n])=>cy==0?[[cx,cy,n]]:[[cx,cy,n],[cx,-cy,n]]).flat().map(([cx,cy,n])=>formula.getNearbyPeriodicPoint(cx,cy,n));*/
	// TODO button to export data as json
	const minibrots = findMinibrots();
	Utils.onElementBottomHit(document.documentElement,async()=>{
		for (let i=0;i<12;i++){
		// @ts-ignore
		let display = new MinibrotDisplay(minibrots.next().value);
		container.append(display);
		}
	});
});
/**
 * Finds (or at least tries to) all minibrots, ordered by their period and lower external angle.
 */
function* findMinibrots(){
	const formula = new MandelbrotBaseFormula();
	/** @type {(Disk|Minibrot)[]} */
	const minibrots = [];
	let nextYieldIndex = 0;
	for (let n=1;;n++){
		let m = 2**n-1;
		let t = Date.now();
		middle:for (let i=0;i<=m;i++){
			for (let k=1;k<n;k++){
				if (m%(2**k-1)==0&&(i%(m/((2**k-1))))==0){
					// minibrot has actually minimal period k<n
					continue middle;
				}
			}
			let angle = new Fraction(i,m);
			let landingPoint = traceExternalRay(angle);
			let minibrot = formula.getNearbyPeriodicPoint(landingPoint.x,landingPoint.y,n);
			minibrot.kneadingSequence = getKneadingSequence(angle);
			minibrot.lowerExternalAngle = angle;
			if (m&&!isNaN(minibrot.scale.length)){
				let duplicate = minibrots.find(m2=>m2.equals(minibrot));
				if (duplicate){
					console.assert(duplicate.kneadingSequence==minibrot.kneadingSequence,"had two external angles with different kneading sequences land at the same point");
					duplicate.upperExternalAngle = angle;
				}else{
					minibrot.angledInternalAddress = getAngledInternalAddress(angle);
					minibrots.push(minibrot);
				}
			}
		}
		console.log(`found ${minibrots.length-nextYieldIndex} more minibrots in ${(Date.now()-t)}ms`);
		for (let i=nextYieldIndex;i<minibrots.length;i++){
			console.assert(externalAngleType(minibrots[i].lowerExternalAngle)=="lower");
			console.assert(externalAngleType(minibrots[i].upperExternalAngle)=="upper");
			yield minibrots[i];
		}
		nextYieldIndex = minibrots.length;
	}
}
/**
 * Traces the external ray at the given angle.
 * @param {Fraction} angle
 */
function traceExternalRay(angle){
	const n = angle.a;
	const m = angle.b;
	const bailout = 8;
	const stepFactor = 0.4; // sort of step size, but multiplicative
	let cx = bailout*Math.cos(n/m*Math.PI*2);
	let cy = bailout*Math.sin(n/m*Math.PI*2);
	for (let i=0;i<1000;i++){
		let zx = cx;
		let zy = cy;
		let dzx = 1;
		let dzy = 0;
		let i2;
		let k = n;
		for (i2=0;i2<1000&&zx*zx+zy*zy<bailout*bailout;i2++){
			let zx2 = zx*zx-zy*zy+cx;
			let zy2 = 2*zx*zy+cy;
			let dzx2 = 2*(dzx*zx-dzy*zy)+1.0;
			let dzy2 = 2*(dzx*zy+dzy*zx);
			zx = zx2;
			zy = zy2;
			dzx = dzx2;
			dzy = dzy2;
			k = (2*k)%m;
		}
		if (true||zx*zx+zy*zy>=bailout*bailout){
			let sx = Math.cos(k/m*Math.PI*2);
			let sy = Math.sin(k/m*Math.PI*2);
			let r = Math.hypot(zx,zy);
			let dx = stepFactor*r*sx-zx;
			let dy = stepFactor*r*sy-zy;
			cx += (dx*dzx+dy*dzy)/(dzx*dzx+dzy*dzy);
			cy += (dy*dzx-dx*dzy)/(dzx*dzx+dzy*dzy);
			//console.log(`c: ${cx.toPrecision(3)}+${cy.toPrecision(3)}i`)
			//console.log(k,zx,zy,dzx,dzy);
		}
	}
	return new Complex(cx,cy);
}
// @ts-ignore
window.traceExternalRay = traceExternalRay;
let minDiskRadius = Infinity;
class MinibrotDisplay extends HTMLElement {
	/**
	 * @param {MandelbrotPeriodicPoint} minibrot
	 */
	constructor(minibrot){
		super();
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = /* html */`
			<style>
				:host {
					display: inline-block;
					width: 240px;
					border-radius: 4px;
					box-shadow: 0 0 5px 0 #00000080;
					overflow: hidden;
				}
				:host > canvas {
					display: block;
				}
				#display-body {
					padding: 8px;
				}
				#display-body > table {
					width: 100%;
					table-layout: fixed;
					word-wrap: break-word;
				}
				td {
					vertical-align: top;
				}
				.subscript {
					vertical-align: sub;
					font-size: 0.75em;
				}
				@media (prefers-color-scheme: dark) {
					:host > canvas {
						filter: invert(1);
					}
				}
			</style>
			<canvas width="240" height="180"></canvas>
			<div id="display-body">
				<table>
					<tr><td>period:</td><td id="period"></td></tr>
					<tr><td>position:</td><td id="position"></td></tr>
					<tr><td>scale:</td><td id="scale"></td></tr>
					<tr><td>external angles:</td><td id="external-angles"></td></tr>
					<tr><td>kneading seq.:</td><td id="kneading-sequence"></td></tr>
					<tr><td>internal address:</td><td id="internal-address"></td></tr>
				</table>
			</div>
		`;
		this._canvas = this.shadowRoot.querySelector("canvas");
		this._minibrot = minibrot;
		this.setAttribute("x",minibrot.x.toString());
		this.setAttribute("y",minibrot.y.toString());
		this.shadowRoot.querySelector("#period").textContent = minibrot.period.toString();
		if (minibrot.period==1&&minibrot.x==0&&minibrot.y==0){
			this.shadowRoot.querySelector("#position").textContent = "0";
			this.shadowRoot.querySelector("#scale").textContent = "1";
			this.shadowRoot.querySelector("#external-angles").textContent = "0, 1";
		}else if (minibrot.period==2&&minibrot.x==-1&&minibrot.y==0){
			this.shadowRoot.querySelector("#position").textContent = "-1";
			this.shadowRoot.querySelector("#scale").textContent = "0.5";
			this.shadowRoot.querySelector("#external-angles").textContent = "1/3, 2/3";
		}else{
			this.shadowRoot.querySelector("#position").textContent = new Complex(minibrot.x,minibrot.y).toString({precision:2+Math.ceil(Math.log10(Math.hypot(minibrot.x,minibrot.y)/minibrot.scale.length)),includeBreakingSpace:true});
			this.shadowRoot.querySelector("#scale").textContent = minibrot.scale.toString({precision:2});
			this.shadowRoot.querySelector("#external-angles").textContent = minibrot.lowerExternalAngle+", "+minibrot.upperExternalAngle;
		}
		this.shadowRoot.querySelector("#kneading-sequence").textContent = minibrot.kneadingSequence;
		// TODO link to corresponding minibrots in internal address?
		this.shadowRoot.querySelector("#internal-address").innerHTML = minibrot.angledInternalAddress.map(({period,angle})=>period+(angle?`<span class="subscript">${angle}</span>`:"")).join("\u200b - ");
		// TODO compute and display minibrot formula
		onFirstVisible(this,()=>this._render());
	}

	// TODO optimize rendering
	_render(){
		const canvas = this._canvas;
		const ctx = canvas.getContext("2d");
		const imgData = new ImageData(canvas.width,canvas.height);
		const pixels = new Uint32Array(imgData.data.buffer);
		const WIDTH = canvas.width;
		const HEIGHT = canvas.height;
		const ZOOM = 50;
		const ITER = this._minibrot.period*100;
		const CX = this._minibrot.x;
		const CY = this._minibrot.y;
		const SX = this._minibrot.scale.x;
		const SY = this._minibrot.scale.y;
		const SAMPLESIZE = 2;
		const address = this._minibrot.angledInternalAddress;
		const isDisk = address.length>=2&&(address[address.length-1].period%address[address.length-2].period==0);
		for (let x=0;x<WIDTH;x++){
			for (let y=0;y<HEIGHT;y++){
				let d = 0;
				for (let x2=0;x2<SAMPLESIZE;x2++){
					for (let y2=0;y2<SAMPLESIZE;y2++){
						let rcx = (x+(x2+0.5)/SAMPLESIZE-0.5-WIDTH/2)/ZOOM-0.5;
						let rcy = (-(y+(y2+0.5)/SAMPLESIZE-0.5)+HEIGHT/2)/ZOOM+1e-5;
						if (isDisk?rcx*rcx+rcy*rcy<0.45*0.45:((rcx-0.25)**2+rcy**2)**2+(rcx-0.25)*((rcx-0.25)**2+rcy**2)-0.25*rcy*rcy<-0.035){
							d += 1;
							continue;
						}
						let cx = rcx*SX-rcy*SY+CX;
						let cy = rcx*SY+rcy*SX+CY;
						let dcx = SX/ZOOM;
						let dcy = SY/ZOOM;
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
						/*let r = ((rcx-0.25)**2+rcy**2)**2+(rcx-0.25)*((rcx-0.25)**2+rcy**2)-0.25*rcy*rcy;//Math.hypot(rcx,rcy);
						if (i!=ITER&&!isDisk&&r<minDiskRadius){
							console.log("new minDiskRadius:",r,", period:",this._minibrot.period);
							minDiskRadius = r;
						}*/
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