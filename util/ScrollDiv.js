export default class ScrollDiv extends HTMLElement {
    constructor(){
        super();
        var shadowRoot = this.attachShadow({mode:"open"});
        shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: relative;
                    padding: 0 !important;
                    --padding: 0;
                    --inner-width: auto;
                    --inner-height: auto;
                    --scrollbar-width: 5px;
                    --scrollbar-track-color: #00000080;
                    --scrollbar-handle-color: #303030;
                    --scrollbar-active-color: #505050;
                    overflow: hidden;
                    display: inline-block;
                    width: auto;
                    height: auto;
                }
                #outer-container {
                    overflow: auto;
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                    width: 100%;
                    height: 100%;
                }
                #outer-container::-webkit-scrollbar {
                    display: none;
                }
                #inner-container {
                    box-sizing: border-box;
                    padding: var(--padding);
                    display: inline-block;
                    width: var(--inner-width);
                    height: var(--inner-height);
                    min-width: 100%;
                    min-height: 100%;
                    position: relative;
                    overflow: hidden;
                    vertical-align: top;
                }
                .scrollbar {
                    background: var(--scrollbar-track-color);
                    opacity: 1;
                }
                .scrollbar.h {
                    position: absolute;
                    left: 0;
                    bottom: 0;
                    right: 0;
                    margin: 0 20px 5px 10px;
                }
                .scrollbar.v {
                    position: absolute;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    margin: 10px 5px 20px 0;
                }
                .scrollbar.hidden {
                    opacity: 0;
                    pointer-events: none;
                }
                .scrollbar.h, .scrollbar-handle.h {
                    height: var(--scrollbar-width);
                }
                .scrollbar.v, .scrollbar-handle.v {
                    width: var(--scrollbar-width);
                }
                .scrollbar, .scrollbar-handle {
                    border-radius: var(--scrollbar-width);
                    transition: all 0.25s ease-out;
                }
                .scrollbar-handle {
                    position: absolute;
                    background: var(--scrollbar-handle-color);
                    cursor: pointer;
                }
                .scrollbar-handle:hover, .scrollbar-handle.active {
                    background: var(--scrollbar-active-color);
                }
                .scrollbar-handle.active {
                    transition: none;
                }
            </style>
            <div id="outer-container">
                <div id="inner-container">
                    <slot></slot>
                </div>
            </div>
            <div id="scrollbar-h" class="scrollbar h" class="hidden">
                <div id="scrollbar-handle-h" class="scrollbar-handle h"></div>
            </div>
            <div id="scrollbar-v" class="scrollbar v" class="hidden">
                <div id="scrollbar-handle-v" class="scrollbar-handle v"></div>
            </div>
        `;
        var container = shadowRoot.getElementById("outer-container");
        var innerContainer = shadowRoot.getElementById("inner-container");
        var horizontalScrollbar = shadowRoot.getElementById("scrollbar-h");
        var verticalScrollbar = shadowRoot.getElementById("scrollbar-v");
        var horizontalHandle = shadowRoot.getElementById("scrollbar-handle-h");
        var verticalHandle = shadowRoot.getElementById("scrollbar-handle-v");

        function update(){
            var contentWidth = container.scrollWidth;
            var contentHeight = container.scrollHeight;
            var width = container.offsetWidth;
            var height = container.offsetHeight;
            horizontalScrollbar.classList.toggle("hidden",contentWidth<=width+1);
            verticalScrollbar.classList.toggle("hidden",contentHeight<=height+1);
		    horizontalHandle.style.left = container.scrollLeft*horizontalScrollbar.offsetWidth/contentWidth+"px";
		    verticalHandle.style.top = container.scrollTop*verticalScrollbar.offsetHeight/contentHeight+"px";
            horizontalHandle.style.right = (contentWidth-width-container.scrollLeft)*horizontalScrollbar.offsetWidth/contentWidth+"px";
            verticalHandle.style.bottom = (contentHeight-height-container.scrollTop)*verticalScrollbar.offsetHeight/contentHeight+"px";
        }

        container.addEventListener("scroll",update);
        let resizeObserver = new ResizeObserver(update);
        resizeObserver.observe(container);
        resizeObserver.observe(innerContainer);

        horizontalHandle.addEventListener("mousedown",startHorizontalDragging);
        function startHorizontalDragging(e){
            let initialX = container.scrollLeft;
            let initialMouseX = e.screenX;
            window.addEventListener("mousemove",onMouseMove);
            window.addEventListener("mouseup",onMouseUp);
            horizontalHandle.classList.add("active");
            function onMouseMove(e){
                let factor = container.scrollWidth/horizontalScrollbar.offsetWidth;
                let x = initialX+(e.screenX-initialMouseX)*factor;
                container.scrollLeft = x;
                update();
            }
            function onMouseUp(){
                horizontalHandle.classList.remove("active");
                window.removeEventListener("mousemove",onMouseMove);
                window.removeEventListener("mouseup",onMouseUp);
            }
        }

        verticalHandle.addEventListener("mousedown",startVerticalDragging);
        function startVerticalDragging(e){
            let initialY = container.scrollTop;
            let initialMouseY = e.screenY;
            window.addEventListener("mousemove",onMouseMove);
            window.addEventListener("mouseup",onMouseUp);
            verticalHandle.classList.add("active");
            function onMouseMove(e){
                let factor = container.scrollHeight/verticalScrollbar.offsetHeight;
                let y = initialY+(e.screenY-initialMouseY)*factor;
                container.scrollTop = y;
                update();
            }
            function onMouseUp(){
                verticalHandle.classList.remove("active");
                window.removeEventListener("mousemove",onMouseMove);
                window.removeEventListener("mouseup",onMouseUp);
            }
        }
    }
};
window.customElements.define("scroll-div",ScrollDiv);