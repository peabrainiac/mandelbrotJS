import MandelMaths, {FractalFormula,FractalFormulaSwitch,PeriodicPoint,Complex,ComplexWithDerivative,FractalViewport,FractalFormulaSettings,ComplexJacobian, InfiniteArray} from "../MandelMaths.js";

export const TYPE_DISK = "disk";
export const TYPE_MINIBROT = "minibrot";

export default class MandelbrotFormula extends FractalFormulaSwitch {
	/**
	 * @param {{selectedIndex?:number,parameters?:[null,{accuracy?:number}]}?} options
	 */
	constructor({selectedIndex=0,parameters=[null,{}]}={}){
		super({switchName:"Algorithm",formulas:[{name:"simple",formula:new MandelbrotBaseFormula()},{name:"experimental",formula:new ExperimentalMandelbrotFormula(parameters[1])}],selectedIndex});
	}
}
/**
 * A simple mandelbrot formula.
 */
export class MandelbrotBaseFormula extends FractalFormula {
	/**
	 * Returns the iteration count for a specific point in the mandelbrot set.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations maximum number of iterations
	 * @param {object} preparedData
	 * @param {boolean} preparedData.doCardioidClipTest whether to test if points are in the main cardioid or main bulb using a simple implicit formula. Speeds up rendering around these areas immensely, but causes a very slight slowdown everywhere else.
	 */
	iterate(cx,cy,maxIterations,{doCardioidClipTest=true}){
		if (doCardioidClipTest&&((cx*cx+2*cx+1+cy*cy<0.0625)||((cx*cx-0.5*cx+0.0625+cy*cy)*(cx-0.25+cx*cx-0.5*cx+0.0625+cy*cy)-0.25*cy*cy<0))){
			return maxIterations;
		}else{
			let zx = cx;
			let zy = cy;
			let i;
			for (i=0;i<maxIterations&&zx*zx+zy*zy<4;i++){
				let temp = zx*zx-zy*zy+cx;
				zy = 2*zx*zy+cy;
				zx = temp;
			}
			return i;
		}
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
		let zxdz = 1;
		let zydz = 0;
		let zxdc = 1;
		let zydc = 0;
		let i;
		yield {zx,zy,zdz:new ComplexJacobian(zxdz,zydz),zdc:new ComplexJacobian(zxdc,zydc)};
		for (i=0;i<maxIterations;i++){
			let zx2 = zx*zx-zy*zy+cx;
			let zy2 = 2*zx*zy+cy;
			let zxdz2 = 2*(zx*zxdz-zy*zydz);
			let zydz2 = 2*(zx*zydz+zy*zxdz);
			let zxdc2 = 2*(zx*zxdc-zy*zydc)+1;
			let zydc2 = 2*(zx*zydc+zy*zxdc);
			zx = zx2;
			zy = zy2;
			zxdz = zxdz2;
			zydz = zydz2;
			zxdc = zxdc2;
			zydc = zydc2;
			yield {zx,zy,zdz:new ComplexJacobian(zxdz,zydz),zdc:new ComplexJacobian(zxdc,zydc)};
		}
	}

	/**
	 * @inheritdoc
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} iterations
	 */
	prepare(cx,cy,iterations){
		return {doCardioidClipTest:true}
	}

	/**
	 * Approximates nearby periodic points - see `./docs/idk.pdf` for a detailed explanation.
	 * 
	 * Returns an array of points generated by `getNearbyPeriodicPoint`, sorted by their period in ascending order.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 */
	approxNearbyPeriodicPoints(cx,cy,maxIterations=100){
		let zx = cx;
		let zy = cy;
		let dx = 1;
		let dy = 0;
		let ddx = 0;
		let ddy = 0;
		let dddx = 0;
		let dddy = 0;
		let i;
		let points = [];
		let steps = [];
		for (i=0;i<maxIterations&&zx*zx+zy*zy<4;i++){
			let d = Math.sqrt(zx*zx+zy*zy);
			steps.push({zx,zy,d,dx,dy,i,ddx,ddy});
			if ((zx*zx+zy*zy)/(dx*dx+dy*dy)<Math.sqrt((zx*zx+zy*zy)/((ddx*ddx+ddy*ddy)/2))){
				//let pcx = cx-(zx*dx+zy*dy)/(dx*dx+dy*dy);
				//let pcy = cy-(zy*dx-zx*dy)/(dx*dx+dy*dy);
				let roots = Complex.getQuadraticRoots(new ComplexWithDerivative(ddx/2,ddy/2,dddx/2,dddy/2),new ComplexWithDerivative(dx,dy,ddx,ddy),new ComplexWithDerivative(zx,zy,dx,dy));
				let root = (roots[0].length<roots[1].length)?roots[0]:roots[1];
				let pcx = cx+root.x;
				let pcy = cy+root.y;
				let pdx = root.dx+1;
				let pdy = root.dy;
				if (pdx*pdx+pdy*pdy<0.5*0.5){
					let discard = false;
					for (let i2=0;i2<points.length;i2++){
						let p = points[i2];
						if (Complex.distance(new Complex(p.x,p.y),new Complex(pcx,pcy))<((i+1)%p.period==0?0.5:0.1)*Complex.distance(new Complex(pcx,pcy),new Complex(cx,cy))){
							discard = true;
							break;
						}
					}
					if (!discard){
						let point = this.getNearbyPeriodicPoint(pcx,pcy,i+1);
						if (point!=null){
							point.firstEstimate = {x:pcx,y:pcy,dx,dy,ddx,ddy,dddx,dddy,pdx,pdy};
							points.push(point);
						}
					}
				}
			}
			let zx2 = zx*zx-zy*zy+cx;
			let zy2 = 2*zx*zy+cy;
			let dx2 = 2*(dx*zx-dy*zy)+1;
			let dy2 = 2*(dx*zy+dy*zx);
			let ddx2 = 2*(dx*dx-dy*dy+ddx*zx-ddy*zy);
			let ddy2 = 2*(2*dx*dy+ddx*zy+ddy*zx);
			let dddx2 = 6*(ddx*dx-ddy*dy)+2*(dddx*zx-dddy*zy);
			let dddy2 = 6*(ddx*dy+ddy*dx)+2*(dddx*zy+dddy*zx);
			zx = zx2;
			zy = zy2;
			dx = dx2;
			dy = dy2;
			ddx = ddx2;
			ddy = ddy2;
			dddx = dddx2;
			dddy = dddy2;
		}
		points.steps = steps;
		return points;
	}

	/**
	 * Finds the exact location of a nearby periodic point and calculates its properties, such as its scale and type. See `./docs/idk.pdf`.
	 * 
	 * If the estimate diverges, `null` is returned instead.
	 * 
	 * @todo also return `null` if the estimate doesn't converge fast enough for this to be precise.
	 * 
	 * @param {number} startX
	 * @param {number} startY
	 * @param {number} period
	 */
	getNearbyPeriodicPoint(startX,startY,period){
		let cx = startX;
		let cy = startY;
		let estimates = [];
		for (var steps=0;steps<20;steps++){
			let x = cx;
			let y = cy;
			let dx = 1;
			let dy = 0;
			for (let i=1;i<period;i++){
				let x2 = x*x-y*y+cx;
				let y2 = 2*x*y+cy;
				let dx2 = 2*(dx*x-dy*y)+1;
				let dy2 = 2*(dx*y+dy*x);
				x = x2;
				y = y2;
				dx = dx2;
				dy = dy2;
			}
			let temp = Complex.quotient(new Complex(x,y),new Complex(dx,dy));
			estimates.push(new Complex(cx,cy));
			cx -= temp.x;
			cy -= temp.y;
			if (temp.length<1e-10){
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
		let dx = 0;
		let dy = 0;
		let ddx = 0;
		let ddy = 0;
		let ddxdz0 = 0;
		let ddydz0 = 0;
		for (let i=0;i<period;i++){
			/*if (i==period-1){
				console.group(period);
				console.log(`dz0: ${ax}+${ay}i`);
				console.log(`ddz0: ${ddxdz0}+${ddydz0}i`);
				console.log(`dz: ${dx}+${dy}i`);
				console.log(`ddz: ${ddx}+${ddy}i`);
				console.groupEnd();
			}*/
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
			if (i<period-1){
				let ax2 = 2*(ax*x-ay*y);
				let ay2 = 2*(ax*y+ay*x);
				let ddxdz02 = 2*(ddxdz0*x-ddydz0*y+ax*ax-ay*ay);
				let ddydz02 = 2*(ddxdz0*y+ddydz0*x+2*ax*ay);
				ax = ax2;
				ay = ay2;
				ddxdz0 = ddxdz02;
				ddydz0 = ddydz02;
			}
		}
		let a = new Complex(ax,ay);
		let scale = a.copy();
		scale.multiply(dx,dy);
		Complex.inverse(scale);
		if (Math.abs(cy)<scale.length/10){
			cy = 0;
			scale.y = 0;
		}
		let point = MandelbrotPeriodicPoint.create(cx,cy,period,scale,a,dx,dy,ddx,ddy);
		point.steps = steps;
		point.estimates = estimates;
		point.derivatives = new InfiniteArray(n=>{
			if (n==0){
				return new Complex(x,y);
			}else if(n==1){
				return new Complex(dx,dy);
			}else{
				let binomialCoefficients = MandelMaths.binomialCoefficients(n);
				let derivatives = [];
				for (let j=0;j<=n;j++){
					derivatives.push(new Complex(0));
				}
				for (let i=0;i<period;i++){
					for (let j=n;j>=0;j--){
						let temp = new Complex(0);
						for (let k=0;k<=j;k++){
							temp.add(derivatives[k].copy().multiply(derivatives[j-k]).multiply(binomialCoefficients[k]));
						}
						derivatives[j] = temp;
					}
					derivatives[0].x += cx;
					derivatives[0].y += cy;
					derivatives[1].x += 1;
				}
				return derivatives[n];
			}
		});
		return point;
	}
	
	/**
	 * @inheritdoc
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 * @return {Complex[][]}
	 */
	getOrbitPoints(cx,cy,maxIterations){
		let array = [new Complex(cx,cy)];
		let zx = cx;
		let zy = cy;
		let i;
		for (i=0;i<maxIterations&&zx*zx+zy*zy<4;i++){
			let temp = zx*zx-zy*zy+cx;
			zy = 2*zx*zy+cy;
			zx = temp;
			array.push(new Complex(zx,zy));
		}
		return [array];
	}
}
/**
 * A mandelbrot formula using experimental algorithms.
 */
export class ExperimentalMandelbrotFormula extends MandelbrotBaseFormula {
	constructor({accuracy=16}={}){
		super();
		this._accuracy = accuracy;
	}

	/**
	 * Returns the iteration count for a specific point in the mandelbrot set.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations maximum number of iterations
	 * @param {object} preparedData
	 * @param {boolean} preparedData.doCardioidClipTest whether to test if points are in the main cardioid or main bulb using a simple implicit formula. Speeds up rendering around these areas immensely, but causes a very slight slowdown everywhere else.
	 * @param {Minibrot[]} preparedData.nearbyMinibrots
	 */
	iterate(cx,cy,maxIterations,{doCardioidClipTest=true,nearbyMinibrots}){
		if (doCardioidClipTest&&((cx*cx+2*cx+1+cy*cy<0.0625)||((cx*cx-0.5*cx+0.0625+cy*cy)*(cx-0.25+cx*cx-0.5*cx+0.0625+cy*cy)-0.25*cy*cy<0))){
			return maxIterations;
		}else{
			const accuracy = this._accuracy;
			/** minibrots close enough to `c` whose approximation is accurate enough  */
			const relevantMinibrots = nearbyMinibrots.filter(minibrot=>(cx-minibrot.x)**2+(cy-minibrot.y)**2<(minibrot.approximationRadius/accuracy)**2&&minibrot.relativeApproximationRadius>accuracy*3);
			const mainMandelbrot = relevantMinibrots[0];
			/** the minibrot that is currently used as a reference point. the period of this determines how many iterations are calculated at once */
			let currentMinibrot = mainMandelbrot;
			/** index of the current minibrot in the `relevantMinibrots` array */
			let currentMinibrotIndex = 0;
			/** x-Position */
			let zx = 0;
			/** y-Position */
			let zy = 0;
			/** number that gets added to the real component during each iteration in the current reference frame. */
			let cx2 = cx;
			/** number that gets added to the imaginary component during each iteration in the current reference frame. */
			let cy2 = cy;
			/** real component of the `a`-value of the current minibrot */
			let ax = 1;
			/** imaginary component of the `a`-value of the current minibrot */
			let ay = 0;
			/** number of iterations computed so far. Starts at -1 because iteration skipping is here based on the iteration before a minibrot gets hit, not the iteration itself. */
			let i = -1;
			/** period of the current minibrot; number of iterations that get computed at once */
			let period = 1;
			/** radius around `c` at which computation might need to stop for the current minibrot. `4` for the main mandelbrot, `approximationRadius/accuracy-|c-m|` for everything else. */
			let escapeRadius = 4;
			/** the next minibrot to switch to */
			let next = null;
			/** index of the next minibrot to switch to */
			let nextIndex = 0;
			loop:while(true){
				if (next!==null){
					const a = next.a;
					ax = a.x;
					ay = a.y;
					let dx = next.dx;
					let dy = next.dy;
					let dx2 = cx-next.x;
					let dy2 = cy-next.y;
					cx2 = dx2*dx-dy2*dy;
					cy2 = dx2*dy+dy2*dx;
					period = next.period;
					currentMinibrot = next;
					currentMinibrotIndex = nextIndex;
					escapeRadius = next===mainMandelbrot?4:next.approximationRadius/accuracy-Math.sqrt(dx*dx+dy*dy);
				}
				/** minimum radius around `c` that fully contains all relevant minibrots with radii smaller than the current one */
				let innerRadius = 0;
				for (let i2=currentMinibrotIndex+1,l=relevantMinibrots.length;i2<l;i2++){
					let minibrot = relevantMinibrots[i2];
					let dx = cx-minibrot.x;
					let dy = cy-minibrot.y;
					let r = minibrot.approximationRadius/accuracy-Math.sqrt(dx*dx+dy*dy);
					if (r>innerRadius){
						innerRadius = r;
					}
				}
				while(i<maxIterations){
					/** `|z|^2`; distance between the next iteration and `c` */
					let r = zx*zx+zy*zy;
					if(r>escapeRadius){
						if (currentMinibrot===mainMandelbrot){
							return i;
						}else{
							next = mainMandelbrot;
							nextIndex = 0;
							let zx2 = zx*zx-zy*zy+cx;
							let zy2 = 2*zx*zy+cy;
							for (let i2=currentMinibrotIndex;i2>=1;i2--){
								let minibrot = relevantMinibrots[i2];
								let dx = zx2-minibrot.x;
								let dy = zy2-minibrot.y;
								let r = minibrot.approximationRadius/accuracy;
								if (dx*dx+dy*dy<r*r){
									next = minibrot;
									nextIndex = i2;
									break;
								}
							}
							if (next!==currentMinibrot){
								continue loop;
							}
						}
					}else if (r<innerRadius){
						let zx2 = zx*zx-zy*zy+cx;
						let zy2 = 2*zx*zy+cy;
						for (let i2 = relevantMinibrots.length-1;i2>currentMinibrotIndex;i2--){
							let minibrot = relevantMinibrots[i2];
							let dx = zx2-minibrot.x;
							let dy = zy2-minibrot.y;
							let r = minibrot.approximationRadius/accuracy;
							if (dx*dx+dy*dy<r*r){
								next = minibrot;
								nextIndex = i2;
								continue loop;
							}
						}
					}
					let zx2 = zx*zx-zy*zy;
					let zy2 = 2*zx*zy;
					zx = zx2*ax-zy2*ay+cx2;
					zy = zx2*ay+zy2*ax+cy2;
					i += period;
				}
				return maxIterations;
			}
		}
	}
	
	/**
	 * @inheritdoc
	 * @todo pass this the prepared minibrots as a parameter instead of just recomputing them
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 * @return {Complex[][]}
	 */
	getOrbitPoints(cx,cy,maxIterations){
		const {nearbyMinibrots} = this.prepare(cx,cy,maxIterations);
		const array = [new Complex(cx,cy)];
		const accuracy = this._accuracy;
		const relevantMinibrots = nearbyMinibrots.filter(minibrot=>(cx-minibrot.x)**2+(cy-minibrot.y)**2<(minibrot.approximationRadius/accuracy)**2&&minibrot.relativeApproximationRadius>accuracy*3);
		const mainMandelbrot = relevantMinibrots[0];
		let currentMinibrot = mainMandelbrot;
		let zx = cx;
		let zy = cy;
		let cx2 = cx;
		let cy2 = cy;
		let ax = 1;
		let ay = 0;
		let sx = 1;
		let sy = 0;
		let cx3 = 0;
		let cy3 = 0;
		let i = 0;
		while((currentMinibrot!=mainMandelbrot||zx*zx+zy*zy<4)&&i<maxIterations){
			let next = mainMandelbrot;
			let azx = currentMinibrot.x+zx*currentMinibrot.scale.x-zy*currentMinibrot.scale.y;
			let azy = currentMinibrot.y+zx*currentMinibrot.scale.y+zy*currentMinibrot.scale.x;
			for (let i2=relevantMinibrots.length-1;i2>=1;i2--){
				let minibrot = relevantMinibrots[i2];
				let dx = azx-minibrot.x;
				let dy = azy-minibrot.y;
				let r = minibrot.approximationRadius/accuracy;
				if (dx*dx+dy*dy<r*r){
					next = minibrot;
					break;
				}
			}
			if (next!=currentMinibrot){
				const scale = next.scale;
				const a = next.a;
				ax = a.x;
				ay = a.y;
				sx = scale.x;
				sy = scale.y;
				let r = scale.length;
				let dx = azx-next.x;
				let dy = azy-next.y;
				let dcx = cx-next.x;
				let dcy = cy-next.y;
				zx = (dx*scale.x+dy*scale.y)/(r*r);
				zy = (dy*scale.x-dx*scale.y)/(r*r);
				cx2 = (dcx*scale.x+dcy*scale.y)/(r*r);
				cy2 = (dcy*scale.x-dcx*scale.y)/(r*r);
				let ax2 = next.dx-a.x;
				let ay2 = next.dy-a.y;
				cx3 = ax2*cx2-ay2*cy2;
				cy3 = ay2*cx2+ax2*cy2;
				/*console.group("Context switch:");
				console.log("Minibrot:",next);
				console.log("cx2:",cx2);
				console.log("cy2:",cy2);
				console.log("ax2:",ax2);
				console.log("ay2:",ay2);
				console.log("cx3:",cx3);
				console.log("cy3:",cy3);
				console.groupEnd();*/
				currentMinibrot = next;
			}
			let zx2 = zx*ax-zy*ay+cx3;
			let zy2 = zy*ax+zx*ay+cy3;
			let zx3 = zx2*zx2-zy2*zy2;
			let zy3 = 2*zx2*zy2;
			zx = zx3*sx-zy3*sy+cx2;
			zy = zx3*sy+zy3*sx+cy2;
			i += currentMinibrot.period;
			let azx2 = currentMinibrot.x+zx*currentMinibrot.scale.x-zy*currentMinibrot.scale.y;
			let azy2 = currentMinibrot.y+zx*currentMinibrot.scale.y+zy*currentMinibrot.scale.x;
			array.push(new Complex(azx2,azy2));
		}
		return [array];
	}

	/**
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} iterations
	 * @inheritdoc
	 */
	prepare(cx,cy,iterations){
		/** @type {Minibrot[]} */
		const nearbyMinibrots = this.approxNearbyPeriodicPoints(cx,cy,iterations).filter(periodicPoint=>periodicPoint instanceof Minibrot);
		const nearbyMinibrotsTree = new MinibrotNode(nearbyMinibrots[0]);
		nearbyMinibrotsTree.insertChildren(nearbyMinibrots.slice(1),this._accuracy);
		console.log(nearbyMinibrotsTree);
		return {doCardioidClipTest:true,nearbyMinibrots,nearbyMinibrotsTree};
	}

	createSettingsElement(){
		return new ExperimentalMandelbrotFormulaSettings(this);
	}

	set accuracy(accuracy){
		this._accuracy = accuracy*1;
		this.callChangeCallbacks();
	}

	get accuracy(){
		return this._accuracy;
	}

	getParameters(){
		return {accuracy:this._accuracy};
	}
}
/**
 * @extends {FractalFormulaSettings<ExperimentalMandelbrotFormula>}
 */
export class ExperimentalMandelbrotFormulaSettings extends FractalFormulaSettings {
	/**
	 * @param {ExperimentalMandelbrotFormula} formula
	 */
	constructor(formula){
		super(formula);
		this.innerHTML = `
			<span title="Determines how far inside of the calculated &quot;approximation radius&quot; a point should be in order for the approximation to be used.">
				Accuracy: <input type="number" class="input-number" value="${formula.accuracy}" step="any">
			</span>
		`;
		this._accuracyInput = this.querySelector("input");
		this._accuracyInput.addEventListener("change",()=>{
			formula.accuracy = parseFloat(this._accuracyInput.value);
		})
	}
}
if (self.constructor.name==="Window"){
	customElements.define("experimental-mandelbrot-formula-settings",ExperimentalMandelbrotFormulaSettings);
}
export class MandelbrotPeriodicPoint extends PeriodicPoint {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} period
	 * @param {Complex} scale
	 * @param {Complex} a
	 * @param {number} approximationRadius
	 * @param {number} dx
	 * @param {number} dy
	 */
	constructor(x,y,period,scale,a,approximationRadius,dx,dy){
		super(x,y,period);
		this.scale = scale;
		this.a = a;
		this.approximationRadius = approximationRadius;
		this.relativeApproximationRadius = approximationRadius/scale.length;
		/** real component of the derivative of `z_{n-1}` with respect to `z_0` */
		this.dx = dx;
		/** imaginary component of the derivative of `z_{n-1}` with respect to `z_0` */
		this.dy = dy;
		/** @type {string|undefined} */
		this.kneadingSequence = undefined;
		/** @type {import("../minibrots/SymbolicMandelMaths.js").Fraction|undefined} */
		this.lowerExternalAngle = undefined;
		/** @type {import("../minibrots/SymbolicMandelMaths.js").Fraction|undefined} */
		this.upperExternalAngle = undefined;
		/** @type {{period:number,angle?:import("../minibrots/SymbolicMandelMaths.js").Fraction}[]|undefined} */
		this.angledInternalAddress = undefined;
	}

	/**
	 * Creates a new Minibrot or Disk object from the given parameters.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} period
	 * @param {Complex} scale
	 * @param {Complex} a
	 * @param {number} dx
	 * @param {number} dy
	 * @param {number} ddx
	 * @param {number} ddy
	 */
	static create(x,y,period,scale,a,dx,dy,ddx,ddy){
		let radius = 0.5*Math.sqrt((dx*dx+dy*dy)/(ddx*ddx+ddy*ddy));
		let relativeRadius = radius/scale.length;
		let point = relativeRadius<=1?new Disk(x,y,period,scale,a,radius,dx,dy):new Minibrot(x,y,period,scale,a,radius,dx,dy);
		point.ddz = new Complex(ddx,ddy);
		return point;
	}

	/**
	 * @inheritdoc
	 * @param {FractalViewport} viewport
	 */
	toElement(viewport){
		let element = document.createElement("div");
		element.className = "point-container";
		let x = viewport.toRelativeX(this.x);
		let y = viewport.toRelativeY(this.y);
		let rx = viewport.toRelativeWidth(this.radius);
		let ry = viewport.toRelativeHeight(this.radius);
		let rx2 = viewport.toRelativeWidth(this.approximationRadius);
		let ry2 = viewport.toRelativeHeight(this.approximationRadius);
		if (rx<2&&ry<2){
			let circleDiv = document.createElement("div");
			circleDiv.className = "circle";
			circleDiv.style = `left:${100*x}%;top:${100*y}%;width:${200*rx}%;height:${200*ry}%`;
			element.appendChild(circleDiv);
		}
		if (rx2<2&&ry2<2){
			let circleDiv = document.createElement("div");
			circleDiv.className = "circle approximationRadius";
			circleDiv.style = `left:${100*x}%;top:${100*y}%;width:${200*rx2}%;height:${200*ry2}%`;
			element.appendChild(circleDiv);
		}
		element.appendChild(super.toElement(viewport));
		return element;
	}

	/**
	 * Tests wether a given periodic point is the same as this one.
	 * @param {MandelbrotPeriodicPoint} point
	 */
	equals(point){
		return Math.hypot(point.x-this.x,point.y-this.y)<Math.max(0.5*Math.min(point.scale.length,this.scale.length),0.1*Math.max(point.scale.length,this.scale.length));
	}
}
/**
 * A periodic point in the mandelbrot set that belongs to the main cardioid or the cardioid of a minibrot.
 */
export class Minibrot extends MandelbrotPeriodicPoint {

	get radius(){
		return this.scale.length*2;
	}

	get type(){
		return TYPE_MINIBROT;
	}
}
/**
 * A periodic point in the mandelbrot set that belongs to a disk.
 */
export class Disk extends MandelbrotPeriodicPoint {
	
	get radius(){
		return this.scale.length/2;
	}

	get type(){
		return TYPE_DISK;
	}
}
/**
 * A minibrot with possibly a parent and some other nodes as children, essentially forming a tree-like structure.
 * 
 * The children here are just minibrots that lie inside of the approximation radius of this minibrot, not necessarily minibrots that are also sub-minibrots of this minibrot.
 * 
 * Currently unused; I thought I needed this, but didn't. At least for now.
 */
export class MinibrotNode extends Minibrot {
	/**
	 * @param {Minibrot} minibrot
	 * @param {MinibrotNode} parentNode
	 */
	constructor(minibrot,parentNode=null){
		super(minibrot.x,minibrot.y,minibrot.period,minibrot.scale,minibrot.a,minibrot.approximationRadius,minibrot.dx,minibrot.dy);
		this._parent = parentNode;
		/** @type {MinibrotNode[]} */
		this._children = [];
	}

	/**
	 * Inserts nodes into the tree in such a way that their `approximationRadius` lies fully within that of their parent, but not inside that of any of its children.
	 * @param {(Minibrot|MinibrotNode)[]} minibrots
	 * @param {number} accuracy
	 */
	insertChildren(minibrots,accuracy){
		for (let i=0;i<minibrots.length;i++){
			let minibrot = minibrots[i];
			this.getSmallestContainingMinibrot(minibrot,accuracy).addChild(minibrot);
		}
	}

	/**
	 * Adds a node as a child directly, without further checks.
	 * @param {Minibrot|MinibrotNode} minibrot
	 */
	addChild(minibrot){
		this._children.push(minibrot instanceof MinibrotNode?minibrot:new MinibrotNode(minibrot,this));
	}

	/**
	 * Returns the smallest minibrot in this tree whose `approximationRadius` fully contains that of the given minibrot, or `null`.
	 * 
	 * Based on the assumption that every minibrot in this tree only has children whose `approximationRadius` is fully contained in that of the parent node,
	 * and also that no two nodes with the same parent have overlapping approximationRadii. Might not work correctly otherwise.
	 * @param {Minibrot} minibrot
	 * @param {number} accuracy
	 * @return {MinibrotNode}
	 */
	getSmallestContainingMinibrot(minibrot,accuracy){
		if (Math.sqrt((minibrot.x-this.x)**2+(minibrot.y-this.y)**2)>(this.approximationRadius-minibrot.approximationRadius)/accuracy){
			return null;
		}else{
			for (let i=0;i<this.children.length;i++){
				let smallestContainingChild = this.children[i].getSmallestContainingMinibrot(minibrot,accuracy);
				if (smallestContainingChild){
					return smallestContainingChild;
				}
			}
			return this;
		}
	}

	/** @readonly */
	get parent(){
		return this._parent;
	}

	/** @readonly */
	get children(){
		return this._children;
	}
}