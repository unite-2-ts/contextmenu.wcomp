// @ts-ignore
import styles from "./ContextMenu.scss?inline&compress";

// @ts-ignore
import html from "./ContextMenu.html?raw";

//
import { unfixedClientZoom } from "./Zoom";

//
const preInit = URL.createObjectURL(new Blob([styles], {type: "text/css"}));

//
class ContextMenuElement extends HTMLElement {
    #initialized: boolean = false;

    //
    #initialize() {
        if (!this.#initialized) {
            this.#initialized = true;
            this.dataset.hidden = "true";

            //
            const shadow = this.attachShadow({mode: 'open'});
            const parser = new DOMParser();
            const dom = parser.parseFromString(html, "text/html");

            //
            this.innerHTML = "";
            dom.querySelector("template")?.content?.childNodes.forEach(cp => {
                shadow.appendChild(cp.cloneNode(true));
            });

            //
            const style = document.createElement("style");
            style.innerHTML = `@import url("${preInit}");`;
            shadow.appendChild(style);

            //
            document.addEventListener("click", (ev)=>{
                const t = ev.target as HTMLElement;
                if (!((t?.closest("u-contextmenu") == this) || (t?.matches("u-contextmenu") && t == this))) {
                    this.dataset.hidden = "true";
                }
            });
        }
    }

    //
    constructor() {
        super();
    }

    //
    connectedCallback() {
        this.#initialize();
    }
}

//
customElements.define("u-contextmenu", ContextMenuElement);

//
export default () => {};
export { ContextMenuElement };

//
interface CTXMenuElement {
    icon: HTMLElement;
    content: string;
    callback: Function;
};

//
export const openContextMenu = (event, content: CTXMenuElement[])=>{
    const initiator = event?.target;
    const ctxMenu   = document.querySelector("u-contextmenu") as HTMLElement;
    if (ctxMenu) {

        //
        if (initiator.matches("u-dropmenu")) {
            const bbox = initiator.getBoundingClientRect();
            const zoom = unfixedClientZoom() || 1;
            ctxMenu.style.setProperty("--inline-size", `${bbox.width * zoom}`);
            ctxMenu.style.setProperty("--client-x", `${bbox.left * zoom}`);
            ctxMenu.style.setProperty("--client-y", `${bbox.bottom * zoom}`);
        } else {
            // TODO: better inline size
            ctxMenu.style.setProperty("--inline-size", `6rem`);
            ctxMenu.style.setProperty("--client-x", event.clientX);
            ctxMenu.style.setProperty("--client-y", event.clientY);
            ctxMenu.style.setProperty("--page-x", event.pageX);
            ctxMenu.style.setProperty("--page-y", event.pageY);
        }

        //
        ctxMenu.innerHTML = "";

        //
        content.map((el: CTXMenuElement)=>{
            const li = document.createElement("li");
            li.addEventListener("click", (e)=>{
                el.callback?.(initiator, {});
                ctxMenu.dataset.hidden = "true";
            });
            if (el.icon) {
                el.icon.remove?.();
                el.icon.style.setProperty("grid-column", "icon");
                li.append(el.icon);
            };
            li.insertAdjacentHTML("beforeend", `<span style="grid-column: content;">${el.content||""}</span>`);
            ctxMenu.append(li);
        });

        //
        delete ctxMenu.dataset.hidden;
    }
}

//
const OWNER = "contextmenu";

//
const setStyleURL = (base: [any, any], url: string)=>{
    //
    if (base[1] == "innerHTML") {
        base[0][base[1]] = `@import url("${url}");`;
    } else {
        base[0][base[1]] = url;
    }
}

//
const loadStyleSheet = (inline: string, base?: [any, any])=>{
    const url = URL.canParse(inline) ? inline : URL.createObjectURL(new Blob([inline], {type: "text/css"}));
    if (base) setStyleURL(base, url);
}

//
const loadInlineStyle = (inline: string, rootElement = document.head)=>{
    const style = document.createElement("style");
    style.dataset.owner = OWNER;
    loadStyleSheet(inline, [style, "innerHTML"]);
    (rootElement.querySelector("head") ?? rootElement).appendChild(style);
}

//
const loadBlobStyle = (inline: string)=>{
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.type = "text/css";
    style.crossOrigin = "same-origin";
    style.dataset.owner = OWNER;
    loadStyleSheet(inline, [style, "href"]);
    document.head.appendChild(style);
    return style;
}

//
loadBlobStyle(preInit);
