export default class MandelbrotCanvasElement extends HTMLElement {
	constructor(){
		super();
		this._width = 960;
		this._height = 720;
		this._x = -0.75;
		this._y = 0;
		this._zoom = 200;
		this._iterations = 200;
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					position: relative;
					cursor: crosshair;
				}
				canvas {
					position: absolute;
					width: 100%;
					height: 100%;
				}
				#canvas-2 {
					display: none;
				}
			</style>
			<canvas id="canvas-1"></canvas>
			<canvas id="canvas-2"></canvas>
		`;
		this._canvas1 = this.shadowRoot.getElementById("canvas-1");
		this._canvas2 = this.shadowRoot.getElementById("canvas-2");
		this._ctx1 = this._canvas1.getContext("2d");
		this._ctx2 = this._canvas2.getContext("2d");
		this._lastScreenRefresh = Date.now();
		this.render();
	}

	async render() {
		let start = Date.now();
		this._canvas1.width = this._width;
		this._canvas1.height = this._height;
		this._canvas2.width = this._width;
		this._canvas2.height = this._height;
		this._pixels = new Uint32Array(this._width*this._height);
		this._imageData = new ImageData(new Uint8ClampedArray(this._pixels.buffer),this._width);
		await this._renderPart(64);
		await this._renderPart(16);
		await this._renderPart(4);
		await this._renderPart(1);
		this._refreshCanvas();
		console.log(`Finished in ${Math.floor((Date.now()-start)*10)/10}ms!`);
	}

	async _renderPart(pixelSize){
		let x = (Math.round(this._width*0.5/pixelSize)-1)*pixelSize;
		let y = Math.round(this._height*0.5/pixelSize)*pixelSize;
		for (let i=0,r=Math.ceil(Math.max(this._width,this._height)*0.5/pixelSize);i<r*2;i+=2){
			for (let i2=0;i2<i;i2++){
				this._renderPixel(x,y,pixelSize);
				x -= pixelSize;
			}
			await this._waitForScreenRefresh();
			for (let i2=0;i2<i+1;i2++){
				this._renderPixel(x,y,pixelSize);
				y -= pixelSize;
			}
			await this._waitForScreenRefresh();
			for (let i2=0;i2<i+1;i2++){
				this._renderPixel(x,y,pixelSize);
				x += pixelSize;
			}
			await this._waitForScreenRefresh();
			for (let i2=0;i2<i+2;i2++){
				this._renderPixel(x,y,pixelSize);
				y += pixelSize;
			}
			await this._waitForScreenRefresh();
		}
	}

	_renderPixel(x,y,pixelSize){
		if (x+pixelSize>0&&y+pixelSize>0&&x<this._width&&y<this._height){
			let color = this.getPixelColor(Math.floor(x+pixelSize/2),Math.floor(y+pixelSize/2));
			if (pixelSize>1){
				this._ctx1.fillStyle = "#"+(((color>>>16)&0xff)+(((color>>>8)&0xff)<<8)+((color&0xff)<<16)).toString(16).padStart(6,0);
				this._ctx1.fillRect(x,y,pixelSize,pixelSize);
			}
		}
	}

	getPixelColor(x,y){
		let index = x+y*this._width;
		let cachedColor = this._pixels[index];
		if (cachedColor!=0){
			return cachedColor;
		}else{
			let cx = this._x+(x-this._width/2)/this._zoom;
			let cy = this._y+(y-this._height/2)/this._zoom;
			let zx = cx;
			let zy = cy;
			let i;
			let iterations = this._iterations;
			for (i=0;i<iterations&&zx*zx+zy*zy<4;i++){
				let temp = zx*zx-zy*zy+cx;
				zy = 2*zx*zy+cy;
				zx = temp;
			}
			//for (let i2=0;i2<100000;i2++){}
			let color = (i==iterations?0:Math.floor(255.999*i/iterations)+(Math.floor(175.999*i/iterations)<<8))+0xff000000;
			this._pixels[index] = color;
			return color;
		}
	}

	async _waitForScreenRefresh(){
		if (Date.now()-this._lastScreenRefresh>100){
			this._refreshCanvas();
			await new Promise((resolve)=>{
				requestAnimationFrame(resolve);
			});
			this._lastScreenRefresh = Date.now();
		}
	}

	_refreshCanvas(){
		this._ctx2.putImageData(this._imageData,0,0);
		this._ctx1.drawImage(this._canvas2,0,0,this._width,this._height);
	}

	get canvas(){
		return this._canvas2;
	}

	set x(x){
		this._x = x;
	}

	get x(){
		return this._x;
	}

	set y(y){
		this._y = y;
	}

	get y(){
		return this._y;
	}

	set zoom(zoom){
		this._zoom = zoom;
	}

	get zoom(){
		return this._zoom;
	}

	mouseXToFractalX(x){
		return this._x+(x/this.offsetWidth-0.5)*this._width/this._zoom;
	}

	mouseYToFractalY(y){
		return this._y+(y/this.offsetHeight-0.5)*this._height/this._zoom;
	}
}
customElements.define("mandelbrot-canvas-element",MandelbrotCanvasElement);