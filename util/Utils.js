/** @type {WeakMap<Element,()=>void>} */
const callbackMap = new WeakMap();
const observer = new IntersectionObserver((entries)=>{
	entries.forEach(entry=>{
		if (entry.isIntersecting){
			callbackMap.get(entry.target)();
			callbackMap.delete(entry.target);
			observer.unobserve(entry.target);
		}
	});
});
/**
 * Registers a callback to be called when the given element enters the viewport and becomes visible for the first time.
 * @param {Element} element 
 * @param {()=>void} callback 
 */
export function onFirstVisible(element,callback){
	callbackMap.set(element,callback);
	observer.observe(element);
}

export default class Utils {
	/** @param {()=>void} callback */
	static onPageLoad(callback){
		if (document.readyState!="loading"){
			queueMicrotask(callback);
		}else{
			window.addEventListener("load",callback);
		}
	};
	
	/**
	 * @param {HTMLElement} element
	 * @param {number} width
	 * @param {number} height
	 * @deprecated
	 */
	static setSize(element,width,height){
		element.style.width = width+"px";
		element.style.height = height+"px";
		if (element instanceof HTMLCanvasElement){
			element.width = width;
			element.height = height;
		}
	};

	/** @param {HTMLTextAreaElement} element */
	static enableSmartTab(element){
		console.log("Enabling smart tab for element:",element);
		element.addEventListener("keydown",(e)=>{
			if (e.code=="Tab"){
				e.preventDefault();
				var start = element.selectionStart;
				var end = element.selectionEnd;
				var value = element.value;
				var before = value.substring(0,start);
				var selection = value.substring(start,end)
				var after = value.substring(end);
				if(selection.indexOf("\n")==-1){
					element.value = before+"\t"+after;
					element.selectionStart = start+1;
					element.selectionEnd = element.selectionStart;
				}else{
					selection = (e.shiftKey?selection.replace(/\n\t/g,"\n"):selection.replace(/\n/g,"\n\t"))
					element.value = before+selection+after;
					element.selectionStart = start;
					element.selectionEnd = start+selection.length;
				}
			}
		});
	}

	/**
	 * @param {string} type
	 * @param {string} className
	 * @param {string} style
	 * @returns {HTMLElement}
	 * @deprecated
	 */
	static createElement(type,className,style){
		var element = document.createElement(type);
		element.className = className;
		// @ts-ignore
		element.style = style;
		return element;
	}

	/**
	 * @param {HTMLElement} parent
	 * @param {string} type
	 * @param {string} className
	 * @param {string} style
	 * @returns {HTMLElement}
	 * @deprecated
	 */
	static addNewElement(parent,type,className,style){
		var element = Utils.createElement(type,className,style);
		parent.appendChild(element);
		return element;
	}

	/**
	 * @param {HTMLElement} parent
	 * @param {string} text
	 * @deprecated
	 */
	static addNewTextNode(parent,text){
		var textNode = document.createTextNode(text);
		parent.appendChild(textNode);
		return textNode;
	}

	/**
	 * @param {Error} error
	 */
	static errorToString(error){
		var string = error.stack;
		if (!string.startsWith(error.name)){
			string = error.name+": "+error.message+("\n"+string).replace(/\n(?=[^$])/g,"\n    at ");
		}
		return string;
	}
}