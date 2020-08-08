import {FractalFormula,CyclicPoint,Complex,ComplexWithDerivative,ComplexWithJacobian} from "../MandelMaths.js";

export default class MandelbarFormula extends FractalFormula {
	/**
	 * Returns the iteration count for a specific point in the mandelbrot set.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {Object} options
	 * @param {number} options.maxIterations maximum number of iterations
	 */
	iterate(cx,cy,{maxIterations=100}){
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
		let steps = [];
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
		points.steps = steps;
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
		//return CyclicPoint.create(cx,cy,cycleLength,new Complex(0,0),0,0,0,0);
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
		/*let ax = cx;
		let ay = cy;
		let x = cx;
		let y = cy;
		let dx = 1;
		let dy = 0;
		let ddx = 0;
		let ddy = 0;
		for (let i=1;i<cycleLength;i++){
			let x2 = x*x-y*y+cx;
			let y2 = 2*x*y+cy;
			let dx2 = 2*(dx*x-dy*y)+1;
			let dy2 = 2*(dx*y+dy*x);
			let ddx2 = 2*(dx*dx-dy*dy+ddx*x-ddy*y);
			let ddy2 = 2*(2*dx*dy+ddx*y+ddy*x);
			x = x2;
			y = y2;
			dx = dx2;
			dy = dy2;
			ddx = ddx2;
			ddy = ddy2;
			if (i<cycleLength-1){
				let ax2 = ax*x-ay*y;
				let ay2 = ax*y+ay*x;
				ax = ax2;
				ay = ay2;
			}
		}
		let a = cycleLength>1?new Complex(ax,ay):new Complex(1,0);
		a.scale(2**(cycleLength-1));
		a.multiply(dx,dy);
		Complex.inverse(a);
		let point = CyclicPoint.create(cx,cy,cycleLength,a,dx,dy,ddx,ddy);*/
		let point = CyclicPoint.create(cx,cy,cycleLength,new Complex(NaN,NaN),NaN,NaN,NaN,NaN)
		point.steps = steps;
		point.estimates = estimates;
		return point;
	}
}