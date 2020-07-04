import Utils from "../js/Utils.js";

import ZoomPreviewElement from "./ZoomPreviewElement.js";

Utils.onPageLoad(()=>{
	const container = document.getElementById("container");
	const fractalCanvas = container.querySelector("mandelbrot-canvas-element");
	const zoomPreviewElement = new ZoomPreviewElement(fractalCanvas.canvas);
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
				console.log("Zoom!",e);
			}
		}
	});
	container.addEventListener("mouseleave",(e)=>{
		zoomPreviewElement.hide();
	});
});