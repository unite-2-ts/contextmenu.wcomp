import { zoomOf } from "./Zoom";
import { releasePointer } from "../../../interact.ts/src/$core$/PointerAPI";

// TODO: support of fragments
const onBorderObserve = new WeakMap<HTMLElement, Function[]>();
export const observeBorderBox = (element, cb) => {
    if (!onBorderObserve.has(element)) {
        const callbacks: Function[] = [];

        //
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.borderBoxSize) {
                    const borderBoxSize = entry.borderBoxSize[0];
                    if (borderBoxSize) {
                        callbacks.forEach((cb) => cb?.(borderBoxSize, observer));
                    }
                }
            }
        });

        //
        cb?.({
            inlineSize: element.offsetWidth,
            blockSize: element.offsetHeight,
        }, observer);

        //
        onBorderObserve.set(element, callbacks);
        observer.observe(element, {box: "border-box"});
    }

    //
    onBorderObserve.get(element)?.push(cb);
}

//
class Scrollable {
    #scrollable?: HTMLElement;

    //
    constructor(scrollable: HTMLElement) {
        this.#scrollable = scrollable;
        const weak = new WeakRef(this);
        const scr_w = new WeakRef(this.#scrollable);

        //
        document.addEventListener("wheel", (ev)=>{
            const self = weak?.deref?.();
            const scrollable = scr_w?.deref?.();
            if (scrollable?.matches?.(":where(:hover, :active)")) {
                ev.preventDefault();
                ev.stopPropagation();

                //
                //if (ev.deltaMode == WheelEvent.DOM_DELTA_PIXEL)
                {
                    scrollable.scrollBy({
                        top: ((ev?.deltaY || 0)+(ev?.deltaX || 0)), left: 0,
                        behavior: "smooth"
                    });
                }
            }
        }, {passive: false});

        //
        const initialValues = ()=>{
            const scrollable = scr_w?.deref?.();
            scrollable?.parentElement?.style.setProperty("--scroll-left"  , "" + scrollable.scrollLeft  , "");
            scrollable?.parentElement?.style.setProperty("--scroll-top"   , "" + scrollable.scrollTop   , "");
            scrollable?.parentElement?.style.setProperty("--scroll-width" , "" + scrollable.scrollWidth , "");
            scrollable?.parentElement?.style.setProperty("--scroll-height", "" + scrollable.scrollHeight, "");
            scrollable?.parentElement?.style.setProperty("--offset-width" , "" + scrollable.offsetWidth , "");
            scrollable?.parentElement?.style.setProperty("--offset-height", "" + scrollable.offsetHeight, "");
            if ((scrollable?.offsetWidth || 0) >= (scrollable?.scrollWidth || 0)) {
                if (!scrollable?.parentElement?.querySelector(".u2-scroll-box")?.classList?.contains?.("hidden")) {
                    scrollable?.parentElement?.querySelector(".u2-scroll-box")?.classList?.add?.("hidden");
                }
            } else {
                if (scrollable?.parentElement?.querySelector(".u2-scroll-box")?.classList?.contains?.("hidden")) {
                    scrollable?.parentElement?.querySelector(".u2-scroll-box")?.classList?.remove?.("hidden");
                }
            }
        }

        //
        initialValues();
        requestIdleCallback(initialValues, {timeout: 100});

        //
        const axis   = 1;
        const status = {
            pointerLocation: 0,
            virtualScroll: 0,
            pointerId: -1,
        };

        //
        document.addEventListener("input", initialValues);
        document.addEventListener("change", initialValues);

        //
        this.#scrollable.addEventListener("scroll", (ev)=>{
            initialValues();

            //
            /*if (status.pointerId >= 0) {
                this.#scrollable?.scrollTo({
                    [["top", "top"][axis]]: status.virtualScroll[axis],
                    behavior: "instant",
                });
            }*/
        });

        //
        observeBorderBox(this.#scrollable, (box)=>{
            initialValues();
            const scrollable = scr_w?.deref?.();
            scrollable?.parentElement?.style.setProperty("--offset-width" , "" + box.inlineSize, "");
            scrollable?.parentElement?.style.setProperty("--offset-height", "" + box.blockSize , "");
        });

        //
        this.#scrollable.parentElement?.querySelector(".u2-scroll-bar")?.
            addEventListener?.("dragstart", (ev)=>{
                ev?.preventDefault?.();
                ev?.stopPropagation?.();
            });

        //
        this.#scrollable.parentElement?.querySelector(".u2-scroll-bar")?.
            addEventListener?.("pointerdown", (ev) => {
                if (status.pointerId < 0) {
                    ev?.preventDefault?.();
                    ev?.stopPropagation?.();

                    //
                    status.pointerId = ev.pointerId;
                    status.pointerLocation =
                        ev[["clientX", "clientY"][axis]] / zoomOf();
                    status.virtualScroll = scr_w?.deref?.()?.[["scrollLeft", "scrollTop"][axis]];

                    // stronger policy now...
                    ev.target?.setPointerCapture?.(ev.pointerId);
                }
            });

        //
        document.documentElement.addEventListener("pointermove", (ev) => {
            if (ev.pointerId == status.pointerId) {
                ev.stopPropagation();
                ev.preventDefault();

                //
                const scrollable = scr_w?.deref?.();
                const previous = scrollable?.[["scrollLeft", "scrollTop"][axis]];
                const coord = ev[["clientX", "clientY"][axis]] / zoomOf();

                //
                status.virtualScroll +=
                    (coord - status.pointerLocation) /
                    Math.max(Math.max(Math.min(scrollable?.[["offsetWidth", "offsetHeight"][axis]] / Math.max(scrollable?.[["scrollWidth", "scrollHeight"][axis]], 0.0001), 1), 0), 0.0001);
                status.pointerLocation = coord;

                //
                const realShift = status.virtualScroll - previous;
                if (Math.abs(realShift) >= 0.001) {
                    scrollable?.scrollBy({
                        [["top", "top"][axis]]: realShift,
                        behavior: "instant",
                    });
                }
            }
        }, {capture: true});

        //
        const stopScroll = (ev) => {
            if (status.pointerId == ev.pointerId) {
                ev.stopPropagation();
                ev.preventDefault();

                //
                const scrollable = scr_w?.deref?.();
                requestIdleCallback(()=>{
                    scrollable?.scrollTo({
                        [["top", "top"][axis]]: status.virtualScroll[axis],
                        behavior: "instant",
                    });
                }, {timeout: 100});

                //
                status.pointerId = -1;
                status.virtualScroll = scrollable?.[["scrollLeft", "scrollTop"][axis]];

                // stronger policy now...
                ev.target?.releasePointerCapture?.(ev.pointerId);
            }
        };

        //
        document.documentElement.addEventListener("pointerup", stopScroll, {capture: true});
        document.documentElement.addEventListener("pointercancel", stopScroll, {capture: true});
    }
};

//
export default Scrollable;
