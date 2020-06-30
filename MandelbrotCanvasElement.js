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
				host {
					display: block;
					position: relative;
				}
				canvas {
					position: absolute;
					width: 100%;
					height: 100%;
				}
			</style>
			<canvas></canvas>
		`;
		this._canvas = this.shadowRoot.querySelector("canvas");
		this._ctx = this._canvas.getContext("2d");
		this._lastScreenRefresh = Date.now();
		this.render();
	}

	async render() {
		let start = Date.now();
		this._canvas.width = this._width;
		this._canvas.height = this._height;
		this._pixels = new Uint32Array(this._width*this._height);
		await this._renderPart(64);
		await this._renderPart(16);
		await this._renderPart(4);
		await this._renderPart(1);
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
			this._ctx.fillStyle = "#"+(((color>>>16)&0xff)+(((color>>>8)&0xff)<<8)+((color&0xff)<<16)).toString(16).padStart(6,0);
			this._ctx.fillRect(x,y,pixelSize,pixelSize);
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
			//for (let i2=0;i2<3000000;i2++){}
			let color = (i==iterations?0:Math.floor(255.999*i/iterations)+(Math.floor(175.999*i/iterations)<<8))+0xff000000;
			this._pixels[index] = color;
			return color;
		}
	}

	async _waitForScreenRefresh(){
		if (Date.now()-this._lastScreenRefresh>100){
			await new Promise((resolve)=>{
				requestAnimationFrame(resolve);
			});
			this._lastScreenRefresh = Date.now();
		}
	}
}
customElements.define("mandelbrot-canvas-element",MandelbrotCanvasElement);