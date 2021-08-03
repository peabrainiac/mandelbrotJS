import {FractalFormula,CyclicPoint,Complex,ComplexJacobian,ComplexJacobianDerivative,FractalViewport} from "../MandelMaths.js";

export const TYPE_ELLIPSE = "ellipse";
export const TYPE_MINIBAR = "minibar";
export const TYPE_SKEWED_MINIBROT = "skewed minibrot";
export default class MandelbarFormula extends FractalFormula {
	/**
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 * @inheritdoc
	 */
	iterate(cx,cy,maxIterations){
		let x = cx;
		let y = cy;
		let i;
		for (i=0;i<maxIterations&&x*x+y*y<4;i++){
			let temp = x*x-y*y+cx;
			y = -2*x*y+cy;
			x = temp;
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
			let zx2 = zx*zx-zy*zy+cx;
			let zy2 = -2*zx*zy+cy;
			let zxdzx2 = 2*(zx*zxdzx-zy*zydzx);
			let zydzx2 = -2*(zx*zydzx+zy*zxdzx);
			let zxdzy2 = 2*(zx*zxdzy-zy*zydzy);
			let zydzy2 = -2*(zx*zydzy+zy*zxdzy);
			let zxdcx2 = 2*(zx*zxdcx-zy*zydcx)+1;
			let zydcx2 = -2*(zx*zydcx+zy*zxdcx);
			let zxdcy2 = 2*(zx*zxdcy-zy*zydcy);
			let zydcy2 = -2*(zx*zydcy+zy*zxdcy)+1;
			zx = zx2;
			zy = zy2;
			zxdzx = zxdzx2;
			zydzx = zydzx2;
			zxdzy = zxdzy2;
			zydzy = zydzy2;
			zxdcx = zxdcx2;
			zydcx = zydcx2;
			zxdcy = zxdcy2;
			zydcy = zydcy2;
			yield {zx,zy,zdz:new ComplexJacobian(zxdzx,zydzx,zxdzy,zydzy),zdc:new ComplexJacobian(zxdcx,zydcx,zxdcy,zydcy)};
		}
	}

	/**
	 * Approximates nearby cyclic points - see `./docs/idk.pdf` for a detailed explanation.
	 * 
	 * Only applies a single calculation step without further refining, so the results may be wieldly inaccurate.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 */
	approxNearbyCyclicPoints(cx,cy,maxIterations=100){
		let x = cx;
		let y = cy;
		let xdx = 1;
		let ydx = 0;
		let xdy = 0;
		let ydy = 1;
		let xdxdx = 0;
		let ydxdx = 0;
		let xdydx = 0;
		let ydydx = 0;
		let xdxdy = 0;
		let ydxdy = 0;
		let xdydy = 0;
		let ydydy = 0;
		let i;
		let points = [];
		//let steps = [];
		for (i=0;i<maxIterations&&x*x+y*y<4;i++){
			let d = Math.sqrt(x*x+y*y);
			//steps.push({x,y,d,dx,dy,i,ddx,ddy});
			if (true/*(x*x+y*y)/(dx*dx+dy*dy)<Math.sqrt((x*x+y*y)/((ddx*ddx+ddy*ddy)/2))*/){
				let det = xdx*ydy-xdy*ydx;
				let detdx = xdxdx*ydy+xdx*ydydx-xdydx*ydx-xdy*ydxdx;
				let detdy = xdxdy*ydy+xdx*ydydy-xdydy*ydx-xdy*ydxdy;
				let pcx = cx-(x*ydy-y*xdy)/det;
				let pcy = cy-(y*xdx-x*ydx)/det;
				let pcxdx = 1-((xdx*ydy+x*ydydx-ydx*xdy-y*xdydx)*det-(x*ydy-y*xdy)*detdx)/(det*det);
				let pcydx = 0-((ydx*xdx+y*xdxdx-xdx*ydx-x*ydxdx)*det-(y*xdx-x*ydx)*detdx)/(det*det);
				let pcxdy = 0-((xdy*ydy+x*ydydy-ydy*xdy-y*xdydy)*det-(x*ydy-y*xdy)*detdy)/(det*det);
				let pcydy = 1-((ydy*xdx+y*xdxdy-xdy*ydx-x*ydxdy)*det-(y*xdx-x*ydx)*detdy)/(det*det);
				if (pcxdx*pcxdx+pcydx*pcydx<0.5*0.5&&pcxdy*pcxdy+pcydy*pcydy<0.5*0.5){
					let discard = false;
					for (let i2=0;i2<points.length;i2++){
						let p = points[i2];
						if (Complex.distance(new Complex(p.x,p.y),new Complex(pcx,pcy))<((i+1)%p.cycleLength==0?0.5:0.1)*Complex.distance(new Complex(pcx,pcy),new Complex(cx,cy))){
							discard = true;
							break;
						}
					}
					if (!discard){
						let point = this.getNearbyCyclicPoint(pcx,pcy,i+1);
						if (point!=null){
							points.push(point);
						}
					}
				}
			}
			let x2 = x*x-y*y+cx;
			let y2 = -2*x*y+cy;
			let xdx2 = 2*(xdx*x-ydx*y)+1;
			let ydx2 = -2*(xdx*y+ydx*x);
			let xdy2 = 2*(xdy*x-ydy*y);
			let ydy2 = -2*(xdy*y+ydy*x)+1;
			let xdxdx2 = 2*(xdxdx*x+xdx*xdx-ydxdx*y-ydx*ydx);
			let ydxdx2 = -2*(xdxdx*y+2*xdx*ydx+ydxdx*x);
			let xdydx2 = 2*(xdydx*x+xdy*xdx-ydydx*y-ydy*ydx);
			let ydydx2 = -2*(xdydx*y+xdy*ydx+ydydx*x+ydy*xdx);
			let xdxdy2 = 2*(xdxdy*x+xdx*xdy-ydxdy*y-ydx*ydy);
			let ydxdy2 = -2*(xdxdy*y+xdx*ydy+ydxdy*x+ydx*xdy);
			let xdydy2 = 2*(xdydy*x+xdy*xdy-ydydy*y-ydy*ydy);
			let ydydy2 = -2*(xdydy*y+2*xdy*ydy+ydydy*x);
			x = x2;
			y = y2;
			xdx = xdx2;
			ydx = ydx2;
			xdy = xdy2;
			ydy = ydy2;
			xdxdx = xdxdx2;
			ydxdx = ydxdx2;
			xdydx = xdydx2;
			ydydx = ydydx2;
			xdxdy = xdxdy2;
			ydxdy = ydxdy2;
			xdydy = xdydy2;
			ydydy = ydydy2;
		}
		//points.steps = steps;
		return points;
	}

	/**
	 * Finds the exact location of a nearby cyclic point and calculates its properties, such as its scale and type. See `./docs/idk.pdf`.
	 * 
	 * If the estimate diverges, `null` is returned instead.
	 * 
	 * @todo also return `null` if the estimate doesn't converge fast enough for this to be precise.
	 * 
	 * @todo scale breaks for cycle length 1025 and larger because `2^1024` overflows to Infinity; multiply twos seperately to fix
	 * 
	 * @param {number} startX
	 * @param {number} startY
	 * @param {number} cycleLength
	 */
	getNearbyCyclicPoint(startX,startY,cycleLength){
		let cx = startX;
		let cy = startY;
		let estimates = [];
		for (var steps=0;steps<20;steps++){
			let x = cx;
			let y = cy;
			let xdx = 1;
			let ydx = 0;
			let xdy = 0;
			let ydy = 1;
			for (let i=1;i<cycleLength;i++){
				let x2 = x*x-y*y+cx;
				let y2 = -2*x*y+cy;
				let xdx2 = 2*(xdx*x-ydx*y)+1;
				let ydx2 = -2*(xdx*y+ydx*x);
				let xdy2 = 2*(xdy*x-ydy*y);
				let ydy2 = -2*(xdy*y+ydy*x)+1;
				x = x2;
				y = y2;
				xdx = xdx2;
				ydx = ydx2;
				xdy = xdy2;
				ydy = ydy2;
			}
			let det = xdx*ydy-xdy*ydx;
			let tempx = (x*ydy-y*xdy)/det;
			let tempy = (y*xdx-x*ydx)/det;
			estimates.push(new Complex(cx,cy));
			cx -= tempx;
			cy -= tempy;
			if (tempx*tempx+tempy*tempy<1e-10){
				steps++;
				break;
			}else if (!(cx*cx+cy*cy<4)){
				return null;
			}
		}
		let ax = 1;
		let ay = 0;
		let x = 0;
		let y = 0;
		let xdx = 0;
		let ydx = 0;
		let xdy = 0;
		let ydy = 0;
		let xdxdx = 0;
		let ydxdx = 0;
		let xdydx = 0;
		let ydydx = 0;
		let xdxdy = 0;
		let ydxdy = 0;
		let xdydy = 0;
		let ydydy = 0;
		for (let i=0;i<cycleLength;i++){
			let x2 = x*x-y*y+cx;
			let y2 = -2*x*y+cy;
			let xdx2 = 2*(xdx*x-ydx*y)+1;
			let ydx2 = -2*(xdx*y+ydx*x);
			let xdy2 = 2*(xdy*x-ydy*y);
			let ydy2 = -2*(xdy*y+ydy*x)+1;
			let xdxdx2 = 2*(xdxdx*x+xdx*xdx-ydxdx*y-ydx*ydx);
			let ydxdx2 = -2*(xdxdx*y+2*xdx*ydx+ydxdx*x);
			let xdydx2 = 2*(xdydx*x+xdy*xdx-ydydx*y-ydy*ydx);
			let ydydx2 = -2*(xdydx*y+xdy*ydx+ydydx*x+ydy*xdx);
			let xdxdy2 = 2*(xdxdy*x+xdx*xdy-ydxdy*y-ydx*ydy);
			let ydxdy2 = -2*(xdxdy*y+xdx*ydy+ydxdy*x+ydx*xdy);
			let xdydy2 = 2*(xdydy*x+xdy*xdy-ydydy*y-ydy*ydy);
			let ydydy2 = -2*(xdydy*y+2*xdy*ydy+ydydy*x);
			x = x2;
			y = y2;
			xdx = xdx2;
			ydx = ydx2;
			xdy = xdy2;
			ydy = ydy2;
			xdxdx = xdxdx2;
			ydxdx = ydxdx2;
			xdydx = xdydx2;
			ydydx = ydydx2;
			xdxdy = xdxdy2;
			ydxdy = ydxdy2;
			xdydy = xdydy2;
			ydydy = ydydy2;
			if (i<cycleLength-1){
				let ax2 = 2*(ax*x-ay*y);
				let ay2 = -2*(ax*y+ay*x);
				ax = ax2;
				ay = ay2;
			}
		}
		let c = new Complex(ax,ay);
		let jacobian = new ComplexJacobian(xdx,ydx,xdy,ydy);
		let jacobianDerivative = new ComplexJacobianDerivative(xdxdx,ydxdx,xdydx,ydydx,xdxdy,ydxdy,xdydy,ydydy);
		let scale = jacobian.copy();
		if (cycleLength%2==0){
			scale.multiply(c);
		}else{
			let b = c.copy();
			b.theta *= -1/3;
			scale.multiply(b);
		}
		ComplexJacobian.inverse(scale);
		let point = MandelbarCyclicPoint.create(cx,cy,cycleLength,scale,jacobian,jacobianDerivative);
		Object.apply(point._debugInfo,{steps,estimates,c,jacobian,jacobianDerivative});
		return point;
	}
}
/**
 * A cyclic point in the mandelbar set.
 */
export class MandelbarCyclicPoint extends CyclicPoint {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} cycleLength
	 * @param {ComplexJacobian} scale
	 * @param {Complex} relativeApproximationRadius
	 */
	constructor(x,y,cycleLength,scale,relativeApproximationRadius){
		super(x,y,cycleLength);
		this.scale = scale;
		this.relativeApproximationRadius = relativeApproximationRadius;
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} cycleLength
	 * @param {ComplexJacobian} scale
	 * @param {ComplexJacobian} jacobian
	 * @param {ComplexJacobianDerivative} jacobianDerivative
	 */
	static create(x,y,cycleLength,scale,jacobian,jacobianDerivative){
		let j = jacobian.relativeTo(scale);
		let jd = jacobianDerivative.relativeTo(scale);
		let rrx = 0.5*Math.sqrt((j.xdx**2+j.ydx**2)/(jd.xdxdx**2+jd.ydxdx**2));
		let rry = 0.5*Math.sqrt((j.xdy**2+j.ydy**2)/(jd.xdydy**2+jd.ydydy**2));
		let rx = rrx*Math.sqrt(scale.xdx**2+scale.ydx**2);
		let ry = rry*Math.sqrt(scale.xdy**2+scale.ydy**2);
		/** @type {MandelbarCyclicPoint} */
		let point = new (rrx<1?Ellipse:(cycleLength%2==1?Minibar:SkewedMinibrot))(x,y,cycleLength,scale,new Complex(rrx,rry));
		point._debugInfo = {rx,ry};
		return point;
	}

	/**
	 * @inheritdoc
	 * @param {FractalViewport} viewport
	 */
	toElement(viewport){
		let element = document.createElement("div");
		element.className = "point-container";
		if (this.scale.isFinite()){
			let x = viewport.toRelativeX(this.x);
			let y = viewport.toRelativeY(this.y)*viewport.height/viewport.width;
			let r = viewport.toRelativeWidth(1);
			let transform = this.scale.copy();
			transform.scale(r*this.relativeRadius);
			let transform2 = this.scale.copy();
			let rx = r*this.relativeApproximationRadius.x;
			let ry = r*this.relativeApproximationRadius.y;
			transform2.xdx *= rx;
			transform2.ydx *= rx;
			transform2.xdy *= ry;
			transform2.ydy *= ry;
			element.innerHTML = `
				<svg viewBox="0 0 1 ${viewport.height/viewport.width}" preserveAspectRatio="none" class="point-container">
					<g class="svg-ellipse" style="transform:${transform.toCssString(x,y)}">
						<circle cx="0" cy="0" r="1"/>
						<path d="M -1 0 L 0 0 L 0 0.5"/>
					</g>
					${transform2.isFinite()?`<g class="svg-ellipse approximationRadius" style="transform:${transform2.toCssString(x,y)}">
						<circle cx="0" cy="0" r="1"/>
					</g>`:``}
				</svg>
			`;
		}
		element.appendChild(super.toElement(viewport));
		return element;
	}

	get relativeRadius(){
		return 1;
	}
}
/** A cyclic point in the mandelbar set that belongs to a skewed, hence elliptical disk. */
export class Ellipse extends MandelbarCyclicPoint {

	get relativeRadius(){
		return 0.5;
	}

	get type(){
		return TYPE_ELLIPSE;
	}
}
/** A cyclic point in the mandelbar set that belongs to the main deltoid or the deltoid of a mini-mandelbar. */
export class Minibar extends MandelbarCyclicPoint {

	get relativeRadius(){
		return 2;
	}

	get type(){
		return TYPE_MINIBAR;
	}
}
/** A cyclic point in the mandelbar set that belongs to the cardioid of a minibrot. */
export class SkewedMinibrot extends MandelbarCyclicPoint {

	get relativeRadius(){
		return 2;
	}

	get type(){
		return TYPE_SKEWED_MINIBROT;
	}
}