export default class Utils {
	
	static onPageLoad(callback){
		if (document.readyState!="loading"){
			callback();
		}else{
			window.addEventListener("load",callback);
		}
	};
	
	static setSize(element,width,height){
		element.style.width = width+"px";
		element.style.height = height+"px";
		if (element instanceof HTMLCanvasElement){
			element.width = width;
			element.height = height;
		}
	};

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

	static createElement(type,className,style){
		var element = document.createElement(type);
		element.className = className;
		element.style = style;
		return element;
	}

	static addNewElement(parent,type,className,style){
		var element = Utils.createElement(type,className,style);
		parent.appendChild(element);
		return element;
	}

	static addNewTextNode(parent,text){
		var textNode = document.createTextNode(text);
		parent.appendChild(textNode);
		return textNode;
	}

	static errorToString(error){
		var string = error.stack;
		if (!string.startsWith(error.name)){
			string = error.name+": "+error.message+("\n"+string).replace(/\n(?=[^$])/g,"\n    at ");
		}
		return string;
	}
}