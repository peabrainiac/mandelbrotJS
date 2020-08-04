import Utils from "../js/Utils.js";

import MandelbrotExplorerElement from "./MandelbrotExplorerElement.js";
import {GeneralSettingsGroup,FormulaSettingsGroup,ToolsSettingsGroup} from "./Settings.js";
import OrbitPointsOverlay from "./OrbitPointsOverlay.js";

Utils.onPageLoad(()=>{
	/** @type {MandelbrotExplorerElement} */
	const fractalExplorer = document.querySelector("mandelbrot-explorer-element");
	const sidebar = document.querySelector("sidebar-element");
	const generalSettings = new GeneralSettingsGroup();
	const formulaSettings = new FormulaSettingsGroup();
	const tools = new ToolsSettingsGroup();
	sidebar.appendChild(generalSettings);
	sidebar.appendChild(formulaSettings);
	sidebar.appendChild(tools);
	generalSettings.link(fractalExplorer);
	formulaSettings.link(fractalExplorer);
	const orbitPointsOverlay = new OrbitPointsOverlay();
	orbitPointsOverlay.slot = "overlay";
	fractalExplorer.appendChild(orbitPointsOverlay);
	fractalExplorer.fractalCanvas.onViewportChange((viewport)=>{
		orbitPointsOverlay.viewport = viewport;
	});
	tools.onFindCyclicButtonClick(()=>{
		orbitPointsOverlay.formula = fractalExplorer.formula;
		orbitPointsOverlay.show();
		orbitPointsOverlay.showPoints(fractalExplorer.fractalCanvas.x,fractalExplorer.fractalCanvas.y,fractalExplorer.formula);
	});
});