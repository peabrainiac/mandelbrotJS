export default class ResizeDiv extends HTMLElement {
    static get observedAttributes(){
        return ["resize-x","resize-y"];
    }
    constructor(){
        super();
        console.log("Created ResizeDiv!");
        let shadowRoot = this.attachShadow({mode:"open"});
        shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: relative;
                }
                #container {
                    width: 100%;
                    height: 100%;
                }
                #handle {
                    position: absolute;
                    right: 0;
                    bottom: 0;
                    color: #bfbfbf;
                }
                #svg {
                    fill: currentcolor;
                }
                #handle.none {
                    display: none;
                }
                #handle.horizontal {
                    cursor: ew-resize;
                }
                #handle.vertical {
                    cursor: ns-resize;
                }
                #handle.both {
                    cursor: nwse-resize;
                }
            </style>
            <div id="container">
                <slot></slot>
            </div>
            <div id="handle" class="none">
                <svg id="svg" width="12" height="12" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="2" width="2" height="2" />
                    <rect x="5" y="5" width="2" height="2" />
                    <rect x="8" y="5" width="2" height="2" />
                    <rect x="2" y="8" width="2" height="2" />
                    <rect x="5" y="8" width="2" height="2" />
                    <rect x="8" y="8" width="2" height="2" />
                </svg>
            </div>
        `;
        var element = this;
        var handle = shadowRoot.getElementById("handle");
        handle.addEventListener("mousedown",startDragging);

        function startDragging(e){
            let temp = element.getBoundingClientRect();
            let initialWidth = temp.width;
            let initialHeight = temp.height;
            let initialMouseX = e.screenX;
            let initialMouseY = e.screenY;
            window.addEventListener("mousemove",onMouseMove);
            window.addEventListener("mouseup",onMouseUp);
            function onMouseMove(e){
                let resizeX = element.getAttribute("resize-x");
                let resizeY = element.getAttribute("resize-y");
                let width = initialWidth+(e.screenX-initialMouseX)*resizeX;
                let height = initialHeight+(e.screenY-initialMouseY)*resizeY;
                if (resizeX!=0){
                    element.style.width = Math.max(width,12)+"px";
                }
                if (resizeY!=0){
                    element.style.height = Math.max(height,12)+"px";
                }
            }
            function onMouseUp(){
                window.removeEventListener("mousemove",onMouseMove);
                window.removeEventListener("mouseup",onMouseUp);
            }
        }
    }
    attributeChangedCallback(){
        let resizeX = this.resizeX;
        let resizeY = this.resizeY;
        let handle = this.shadowRoot.getElementById("handle");
        handle.className = ((resizeX==0)?((resizeY==0)?"none":"vertical"):((resizeY==0)?"horizontal":"both"));
    }
    get resizeX(){
        return this.getAttribute("resize-x");
    }
    get resizeY(){
        return this.getAttribute("resize-y");
    }
    set resizeX(value){
        this.setAttribute("resize-x",value);
    }
    set resizeY(value){
        this.setAttribute("resize-y",value);
    }
}
window.customElements.define("resize-div",ResizeDiv);