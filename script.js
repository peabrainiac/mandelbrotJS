import Utils from "./util/Utils.js";

import FractalExplorer from "./explorer/FractalExplorer.js";
import {GeneralSettingsGroup,FormulaSettingsGroup,ToolsSettingsGroup} from "./Settings.js";
import SpecialPointsOverlay from "./SpecialPointsOverlay.js";

Utils.onPageLoad(()=>{
	/** @type {FractalExplorer} */
	const fractalExplorer = document.querySelector("fractal-explorer");
	const sidebar = document.querySelector("sidebar-element");
	const generalSettings = new GeneralSettingsGroup();
	const formulaSettings = new FormulaSettingsGroup();
	const tools = new ToolsSettingsGroup();
	sidebar.appendChild(generalSettings);
	sidebar.appendChild(formulaSettings);
	sidebar.appendChild(tools);
	generalSettings.link(fractalExplorer);
	formulaSettings.link(fractalExplorer);
	const specialPointsOverlay = new SpecialPointsOverlay();
	specialPointsOverlay.slot = "overlay";
	fractalExplorer.appendChild(specialPointsOverlay);
	fractalExplorer.fractalCanvas.onViewportChange((viewport)=>{
		specialPointsOverlay.viewport = viewport;
	});
	tools.onFindCyclicButtonClick(()=>{
		specialPointsOverlay.formula = fractalExplorer.formula;
		specialPointsOverlay.iterations = fractalExplorer.iterations;
		specialPointsOverlay.show();
		specialPointsOverlay.showPoints(fractalExplorer.fractalCanvas.x,fractalExplorer.fractalCanvas.y);
	});
});