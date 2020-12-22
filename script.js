import Utils from "./util/Utils.js";

import FractalExplorer from "./explorer/FractalExplorer.js";
import {GeneralSettingsGroup,FormulaSettingsGroup,ToolsSettingsGroup} from "./Settings.js";
import SpecialPointsOverlay from "./tools/SpecialPointsOverlay.js";
import OrbitPointsOverlay from "./tools/OrbitPointsOverlay.js";

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
	/**
	 * @todo hide this again whenever the formula or any of the settings change in a way that causes a new image to be rendered
	 * @todo also modernize this whole thing, I guess
	 */
	const specialPointsOverlay = new SpecialPointsOverlay();
	specialPointsOverlay.slot = "overlay";
	fractalExplorer.appendChild(specialPointsOverlay);
	fractalExplorer.fractalCanvas.onViewportChange((viewport)=>{
		specialPointsOverlay.viewport = viewport;
	});
	tools.onFindCyclicPointsButtonClick(()=>{
		specialPointsOverlay.formula = fractalExplorer.formula;
		specialPointsOverlay.iterations = fractalExplorer.iterations;
		specialPointsOverlay.show();
		specialPointsOverlay.showPoints(fractalExplorer.fractalCanvas.x,fractalExplorer.fractalCanvas.y);
	});
	tools.onShowOrbitPointsButtonClick(()=>{
		new OrbitPointsOverlay(fractalExplorer);
	});
});