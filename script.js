import Utils from "../js/Utils.js";

import MandelbrotCanvasElement from "./MandelbrotCanvasElement.js";
import ZoomPreviewElement from "./ZoomPreviewElement.js";

Utils.onPageLoad(()=>{
	const container = document.getElementById("container");
	const fractalCanvas = new MandelbrotCanvasElement();
	const zoomPreviewElement = new ZoomPreviewElement(fractalCanvas.canvas);
	fractalCanvas.style = "width:100%;height:100%";
	container.appendChild(fractalCanvas);
	container.appendChild(zoomPreviewElement);
	container.addEventListener("mousedown",(e)=>{
		if (e.button!==2){
			zoomPreviewElement.zoom = 8;
			zoomPreviewElement.show();
			zoomPreviewElement.setPosition(e.layerX,e.layerY);
			e.preventDefault();
		}
	});
	container.addEventListener("mousemove",(e)=>{
		if (!zoomPreviewElement.hidden){
			console.log("Move!",e);
			zoomPreviewElement.setPosition(e.layerX,e.layerY);
		}
	});
	container.addEventListener("mouseup",(e)=>{
		if (!zoomPreviewElement.hidden){
			zoomPreviewElement.hide();
			if (e.button===0){
				fractalCanvas.x = fractalCanvas.mouseXToFractalX(e.layerX);
				fractalCanvas.y = fractalCanvas.mouseYToFractalY(e.layerY);
				fractalCanvas.zoom *= 8;
				fractalCanvas.render();
			}
		}
		if (e.button===2){
			fractalCanvas.x = fractalCanvas.mouseXToFractalX(e.layerX);
			fractalCanvas.y = fractalCanvas.mouseYToFractalY(e.layerY);
			fractalCanvas.zoom /= 8;
			fractalCanvas.render();
		}
	});
	container.addEventListener("contextmenu",(e)=>{
		e.preventDefault();
	});
	container.addEventListener("mouseleave",(e)=>{
		zoomPreviewElement.hide();
	});
});