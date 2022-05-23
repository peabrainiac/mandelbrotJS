import {MandelbrotBaseFormula,MandelbrotPeriodicPoint,Disk,Minibrot} from "../formulas/Mandelbrot.js";
import {Complex} from "../MandelMaths.js";
import Utils, {onFirstVisible} from "../util/Utils.js";
import {externalAngleType,getInternalAddress,getInternalAngle,getKneadingSequence} from "./SymbolicMandelMaths.js";

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
			let landingPoint = traceExternalRay(i,m);
			let minibrot = formula.getNearbyPeriodicPoint(landingPoint.x,landingPoint.y,n);
			minibrot.kneadingSequence = getKneadingSequence(i,m);
			minibrot.lowerExternalAngle = i+"/"+m;
			//console.log(`i: $${i}, $$`)
			if (m&&!isNaN(minibrot.scale.length)){
				let duplicate = minibrots.find(m2=>m2.equals(minibrot));
				if (duplicate){
					console.assert(duplicate.kneadingSequence==minibrot.kneadingSequence,"had two external angles with different kneading sequences land at the same point");
					duplicate.upperExternalAngle = i+"/"+m;
				}else{
					minibrots.push(minibrot);
					let internalAddressMinibrots = minibrots.filter(minibrot2=>{
						if (minibrot2.period==minibrot.period&&minibrot2.upperExternalAngle==undefined){
							return true;
						}else{
							let i2 = parseInt(minibrot2.lowerExternalAngle.split("/")[0]);
							let i3 = parseInt(minibrot2.upperExternalAngle.split("/")[0]);
							let m2 = parseInt(minibrot2.lowerExternalAngle.split("/")[1]);
							return i2*m<=i*m2&&i*m2<i3*m;
						}
					}).sort((m1,m2)=>parseInt(m1.lowerExternalAngle.split("/")[0])*parseInt(m2.lowerExternalAngle.split("/")[1])-parseInt(m2.lowerExternalAngle.split("/")[0])*parseInt(m1.lowerExternalAngle.split("/")[1])).filter((m,i,a)=>!a.some((m2,i2)=>i2>i&&m2.period<m.period));
					let internalAddress = internalAddressMinibrots.map(m=>m.period);
					console.assert(internalAddress.join(",")==getInternalAddress(minibrot.kneadingSequence).join(","));
					minibrot.angledInternalAddress = internalAddress.map((period,index)=>{
						if (index+1<internalAddress.length){
							return {period,angle:getInternalAngle(minibrot.kneadingSequence,period,internalAddress[index+1],i,m)};
						}else{
							return {period};
						}
					});
				}
			}
		}
		console.log(`found ${minibrots.length-nextYieldIndex} more minibrots in ${(Date.now()-t)}ms`);
		for (let i=nextYieldIndex;i<minibrots.length;i++){
			console.assert(externalAngleType(parseInt(minibrots[i].lowerExternalAngle.split("/")[0]),parseInt(minibrots[i].lowerExternalAngle.split("/")[1]))=="lower");
			console.assert(externalAngleType(parseInt(minibrots[i].upperExternalAngle.split("/")[0]),parseInt(minibrots[i].upperExternalAngle.split("/")[1]))=="upper");
			yield minibrots[i];
		}
		nextYieldIndex = minibrots.length;
	}
}
/**
 * Traces the external ray at angle n/m.
 * @param {number} n
 * @param {number} m
 */
function traceExternalRay(n,m){
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
// TODO compute internal addresses from kneading sequences too
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
		this.shadowRoot.querySelector("#internal-address").textContent = minibrot.angledInternalAddress.map(({period,angle})=>period+(angle?`_${angle.numerator}/${angle.denominator}`:"")).join("\u200b->");
		// TODO compute and display angled internal address
		// TODO compute and display minibrot formula
		// TODO fancier formatting with KaTeX?
		onFirstVisible(this,()=>this._render());
	}

	_render(){
		const canvas = this._canvas;
		const ctx = canvas.getContext("2d");
		const imgData = new ImageData(canvas.width,canvas.height);
		const pixels = new Uint32Array(imgData.data.buffer);
		const WIDTH = canvas.width;
		const HEIGHT = canvas.height;
		const ITER = this._minibrot.period*100;
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