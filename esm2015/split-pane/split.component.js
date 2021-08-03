import { Component, Input, Output, ChangeDetectionStrategy, ChangeDetectorRef, Renderer2, ElementRef, NgZone, ViewChildren, QueryList, EventEmitter, ViewEncapsulation, } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { getInputPositiveNumber, getInputBoolean, isUserSizesValid, getAreaMinSize, getAreaMaxSize, getPointFromEvent, getElementPixelSize, getGutterSideAbsorptionCapacity, updateAreaSize, } from './utils';
/**
 * mtx-split
 *
 *
 *  PERCENT MODE ([unit]="'percent'")
 *  ___________________________________________________________________________________________
 * |       A       [g1]       B       [g2]       C       [g3]       D       [g4]       E       |
 * |-------------------------------------------------------------------------------------------|
 * |       20                 30                 20                 15                 15      | <-- [size]="x"
 * |               10px               10px               10px               10px               | <-- [gutterSize]="10"
 * |calc(20% - 8px)    calc(30% - 12px)   calc(20% - 8px)    calc(15% - 6px)    calc(15% - 6px)| <-- CSS flex-basis property (with flex-grow&shrink at 0)
 * |     152px              228px              152px              114px              114px     | <-- el.getBoundingClientRect().width
 * |___________________________________________________________________________________________|
 *                                                                                 800px         <-- el.getBoundingClientRect().width
 *  flex-basis = calc( { area.size }% - { area.size/100 * nbGutter*gutterSize }px );
 *
 *
 *  PIXEL MODE ([unit]="'pixel'")
 *  ___________________________________________________________________________________________
 * |       A       [g1]       B       [g2]       C       [g3]       D       [g4]       E       |
 * |-------------------------------------------------------------------------------------------|
 * |      100                250                 *                 150                100      | <-- [size]="y"
 * |               10px               10px               10px               10px               | <-- [gutterSize]="10"
 * |   0 0 100px          0 0 250px           1 1 auto          0 0 150px          0 0 100px   | <-- CSS flex property (flex-grow/flex-shrink/flex-basis)
 * |     100px              250px              200px              150px              100px     | <-- el.getBoundingClientRect().width
 * |___________________________________________________________________________________________|
 *                                                                                 800px         <-- el.getBoundingClientRect().width
 *
 */
export class MtxSplitComponent {
    constructor(ngZone, elRef, cdRef, renderer) {
        this.ngZone = ngZone;
        this.elRef = elRef;
        this.cdRef = cdRef;
        this.renderer = renderer;
        this._direction = 'horizontal';
        ////
        this._unit = 'percent';
        ////
        this._gutterSize = 1;
        ////
        this._gutterStep = 1;
        ////
        this._restrictMove = false;
        ////
        this._useTransition = false;
        ////
        this._disabled = false;
        ////
        this._dir = 'ltr';
        ////
        this._gutterDblClickDuration = 0;
        ////
        this.dragStart = new EventEmitter(false);
        this.dragEnd = new EventEmitter(false);
        this.gutterClick = new EventEmitter(false);
        this.gutterDblClick = new EventEmitter(false);
        this.dragProgressSubject = new Subject();
        this.dragProgress$ = this.dragProgressSubject.asObservable();
        ////
        this.isDragging = false;
        this.dragListeners = [];
        this.snapshot = null;
        this.startPoint = null;
        this.endPoint = null;
        this.displayedAreas = [];
        this.hidedAreas = [];
        this._clickTimeout = null;
        // To force adding default class, could be override by user @Input() or not
        this.direction = this._direction;
    }
    set direction(v) {
        this._direction = v === 'vertical' ? 'vertical' : 'horizontal';
        this.renderer.addClass(this.elRef.nativeElement, `mtx-split-${this._direction}`);
        this.renderer.removeClass(this.elRef.nativeElement, `mtx-split-${this._direction === 'vertical' ? 'horizontal' : 'vertical'}`);
        this.build(false, false);
    }
    get direction() {
        return this._direction;
    }
    set unit(v) {
        this._unit = v === 'pixel' ? 'pixel' : 'percent';
        this.renderer.addClass(this.elRef.nativeElement, `mtx-split-${this._unit}`);
        this.renderer.removeClass(this.elRef.nativeElement, `mtx-split-${this._unit === 'pixel' ? 'percent' : 'pixel'}`);
        this.build(false, true);
    }
    get unit() {
        return this._unit;
    }
    set gutterSize(v) {
        this._gutterSize = getInputPositiveNumber(v, 11);
        this.build(false, false);
    }
    get gutterSize() {
        return this._gutterSize;
    }
    set gutterStep(v) {
        this._gutterStep = getInputPositiveNumber(v, 1);
    }
    get gutterStep() {
        return this._gutterStep;
    }
    set restrictMove(v) {
        this._restrictMove = getInputBoolean(v);
    }
    get restrictMove() {
        return this._restrictMove;
    }
    set useTransition(v) {
        this._useTransition = getInputBoolean(v);
        if (this._useTransition) {
            this.renderer.addClass(this.elRef.nativeElement, 'mtx-split-transition');
        }
        else {
            this.renderer.removeClass(this.elRef.nativeElement, 'mtx-split-transition');
        }
    }
    get useTransition() {
        return this._useTransition;
    }
    set disabled(v) {
        this._disabled = getInputBoolean(v);
        if (this._disabled) {
            this.renderer.addClass(this.elRef.nativeElement, 'mtx-split-disabled');
        }
        else {
            this.renderer.removeClass(this.elRef.nativeElement, 'mtx-split-disabled');
        }
    }
    get disabled() {
        return this._disabled;
    }
    set dir(v) {
        this._dir = v === 'rtl' ? 'rtl' : 'ltr';
        this.renderer.setAttribute(this.elRef.nativeElement, 'dir', this._dir);
    }
    get dir() {
        return this._dir;
    }
    set gutterDblClickDuration(v) {
        this._gutterDblClickDuration = getInputPositiveNumber(v, 0);
    }
    get gutterDblClickDuration() {
        return this._gutterDblClickDuration;
    }
    get transitionEnd() {
        return new Observable(subscriber => (this.transitionEndSubscriber = subscriber)).pipe(debounceTime(20));
    }
    ngAfterViewInit() {
        this.ngZone.runOutsideAngular(() => {
            // To avoid transition at first rendering
            setTimeout(() => this.renderer.addClass(this.elRef.nativeElement, 'mtx-split-init'));
        });
    }
    getNbGutters() {
        return this.displayedAreas.length === 0 ? 0 : this.displayedAreas.length - 1;
    }
    addArea(component) {
        const newArea = {
            component,
            order: 0,
            size: 0,
            minSize: null,
            maxSize: null,
        };
        if (component.visible === true) {
            this.displayedAreas.push(newArea);
            this.build(true, true);
        }
        else {
            this.hidedAreas.push(newArea);
        }
    }
    removeArea(component) {
        if (this.displayedAreas.some(a => a.component === component)) {
            const area = this.displayedAreas.find(a => a.component === component);
            this.displayedAreas.splice(this.displayedAreas.indexOf(area), 1);
            this.build(true, true);
        }
        else if (this.hidedAreas.some(a => a.component === component)) {
            const area = this.hidedAreas.find(a => a.component === component);
            this.hidedAreas.splice(this.hidedAreas.indexOf(area), 1);
        }
    }
    updateArea(component, resetOrders, resetSizes) {
        if (component.visible === true) {
            this.build(resetOrders, resetSizes);
        }
    }
    showArea(component) {
        const area = this.hidedAreas.find(a => a.component === component);
        if (area === undefined) {
            return;
        }
        const areas = this.hidedAreas.splice(this.hidedAreas.indexOf(area), 1);
        this.displayedAreas.push(...areas);
        this.build(true, true);
    }
    hideArea(comp) {
        const area = this.displayedAreas.find(a => a.component === comp);
        if (area === undefined) {
            return;
        }
        const areas = this.displayedAreas.splice(this.displayedAreas.indexOf(area), 1);
        areas.forEach(_area => {
            _area.order = 0;
            _area.size = 0;
        });
        this.hidedAreas.push(...areas);
        this.build(true, true);
    }
    getVisibleAreaSizes() {
        return this.displayedAreas.map(a => (a.size === null ? '*' : a.size));
    }
    setVisibleAreaSizes(sizes) {
        if (sizes.length !== this.displayedAreas.length) {
            return false;
        }
        const formatedSizes = sizes.map(s => getInputPositiveNumber(s, null));
        const isValid = isUserSizesValid(this.unit, formatedSizes);
        if (isValid === false) {
            return false;
        }
        // @ts-ignore
        this.displayedAreas.forEach((area, i) => (area.component._size = formatedSizes[i]));
        this.build(false, true);
        return true;
    }
    build(resetOrders, resetSizes) {
        this.stopDragging();
        // ¤ AREAS ORDER
        if (resetOrders === true) {
            // If user provided 'order' for each area, use it to sort them.
            if (this.displayedAreas.every(a => a.component.order !== null)) {
                this.displayedAreas.sort((a, b) => (a.component.order - b.component.order));
            }
            // Then set real order with multiples of 2, numbers between will be used by gutters.
            this.displayedAreas.forEach((area, i) => {
                area.order = i * 2;
                area.component.setStyleOrder(area.order);
            });
        }
        // ¤ AREAS SIZE
        if (resetSizes === true) {
            const useUserSizes = isUserSizesValid(this.unit, this.displayedAreas.map(a => a.component.size));
            switch (this.unit) {
                case 'percent': {
                    const defaultSize = 100 / this.displayedAreas.length;
                    this.displayedAreas.forEach(area => {
                        area.size = useUserSizes ? area.component.size : defaultSize;
                        area.minSize = getAreaMinSize(area);
                        area.maxSize = getAreaMaxSize(area);
                    });
                    break;
                }
                case 'pixel': {
                    if (useUserSizes) {
                        this.displayedAreas.forEach(area => {
                            area.size = area.component.size;
                            area.minSize = getAreaMinSize(area);
                            area.maxSize = getAreaMaxSize(area);
                        });
                    }
                    else {
                        const wildcardSizeAreas = this.displayedAreas.filter(a => a.component.size === null);
                        // No wildcard area > Need to select one arbitrarily > first
                        if (wildcardSizeAreas.length === 0 && this.displayedAreas.length > 0) {
                            this.displayedAreas.forEach((area, i) => {
                                area.size = i === 0 ? null : area.component.size;
                                area.minSize = i === 0 ? null : getAreaMinSize(area);
                                area.maxSize = i === 0 ? null : getAreaMaxSize(area);
                            });
                        }
                        // More than one wildcard area > Need to keep only one arbitrarly > first
                        // tslint:disable-next-line: one-line
                        else if (wildcardSizeAreas.length > 1) {
                            let alreadyGotOne = false;
                            this.displayedAreas.forEach(area => {
                                if (area.component.size === null) {
                                    if (alreadyGotOne === false) {
                                        area.size = null;
                                        area.minSize = null;
                                        area.maxSize = null;
                                        alreadyGotOne = true;
                                    }
                                    else {
                                        area.size = 100;
                                        area.minSize = null;
                                        area.maxSize = null;
                                    }
                                }
                                else {
                                    area.size = area.component.size;
                                    area.minSize = getAreaMinSize(area);
                                    area.maxSize = getAreaMaxSize(area);
                                }
                            });
                        }
                    }
                    break;
                }
            }
        }
        this.refreshStyleSizes();
        this.cdRef.markForCheck();
    }
    refreshStyleSizes() {
        ///////////////////////////////////////////
        // PERCENT MODE
        if (this.unit === 'percent') {
            // Only one area > flex-basis 100%
            if (this.displayedAreas.length === 1) {
                this.displayedAreas[0].component.setStyleFlex(0, 0, `100%`, false, false);
            }
            // Multiple areas > use each percent basis
            // tslint:disable-next-line: one-line
            else {
                const sumGutterSize = this.getNbGutters() * this.gutterSize;
                this.displayedAreas.forEach(area => {
                    area.component.setStyleFlex(0, 0, `calc( ${area.size}% - ${(area.size / 100) * sumGutterSize}px )`, area.minSize !== null && area.minSize === area.size ? true : false, area.maxSize !== null && area.maxSize === area.size ? true : false);
                });
            }
        }
        ///////////////////////////////////////////
        // PIXEL MODE
        // tslint:disable-next-line: one-line
        else if (this.unit === 'pixel') {
            this.displayedAreas.forEach(area => {
                // Area with wildcard size
                if (area.size === null) {
                    if (this.displayedAreas.length === 1) {
                        area.component.setStyleFlex(1, 1, `100%`, false, false);
                    }
                    else {
                        area.component.setStyleFlex(1, 1, `auto`, false, false);
                    }
                }
                // Area with pixel size
                // tslint:disable-next-line: one-line
                else {
                    // Only one area > flex-basis 100%
                    if (this.displayedAreas.length === 1) {
                        area.component.setStyleFlex(0, 0, `100%`, false, false);
                    }
                    // Multiple areas > use each pixel basis
                    // tslint:disable-next-line: one-line
                    else {
                        area.component.setStyleFlex(0, 0, `${area.size}px`, area.minSize !== null && area.minSize === area.size ? true : false, area.maxSize !== null && area.maxSize === area.size ? true : false);
                    }
                }
            });
        }
    }
    clickGutter(event, gutterNum) {
        const tempPoint = getPointFromEvent(event);
        // Be sure mouseup/touchend happened at same point as mousedown/touchstart to trigger click/dblclick
        if (this.startPoint && this.startPoint.x === tempPoint.x && this.startPoint.y === tempPoint.y) {
            // If timeout in progress and new click > clearTimeout & dblClickEvent
            if (this._clickTimeout !== null) {
                window.clearTimeout(this._clickTimeout);
                this._clickTimeout = null;
                this.notify('dblclick', gutterNum);
                this.stopDragging();
            }
            // Else start timeout to call clickEvent at end
            // tslint:disable-next-line: one-line
            else {
                this._clickTimeout = window.setTimeout(() => {
                    this._clickTimeout = null;
                    this.notify('click', gutterNum);
                    this.stopDragging();
                }, this.gutterDblClickDuration);
            }
        }
    }
    startDragging(event, gutterOrder, gutterNum) {
        event.preventDefault();
        event.stopPropagation();
        this.startPoint = getPointFromEvent(event);
        if (this.startPoint === null || this.disabled === true) {
            return;
        }
        this.snapshot = {
            gutterNum,
            lastSteppedOffset: 0,
            allAreasSizePixel: getElementPixelSize(this.elRef, this.direction) - this.getNbGutters() * this.gutterSize,
            allInvolvedAreasSizePercent: 100,
            areasBeforeGutter: [],
            areasAfterGutter: [],
        };
        this.displayedAreas.forEach(area => {
            const areaSnapshot = {
                area,
                sizePixelAtStart: getElementPixelSize(area.component.elRef, this.direction),
                sizePercentAtStart: (this.unit === 'percent' ? area.size : -1), // If pixel mode, anyway, will not be used.
            };
            if (area.order < gutterOrder) {
                if (this.restrictMove === true) {
                    this.snapshot.areasBeforeGutter = [areaSnapshot];
                }
                else {
                    this.snapshot.areasBeforeGutter.unshift(areaSnapshot);
                }
            }
            else if (area.order > gutterOrder) {
                if (this.restrictMove === true) {
                    if (this.snapshot.areasAfterGutter.length === 0) {
                        this.snapshot.areasAfterGutter = [areaSnapshot];
                    }
                }
                else {
                    this.snapshot.areasAfterGutter.push(areaSnapshot);
                }
            }
        });
        this.snapshot.allInvolvedAreasSizePercent = [
            ...this.snapshot.areasBeforeGutter,
            ...this.snapshot.areasAfterGutter,
        ].reduce((t, a) => t + a.sizePercentAtStart, 0);
        if (this.snapshot.areasBeforeGutter.length === 0 ||
            this.snapshot.areasAfterGutter.length === 0) {
            return;
        }
        this.dragListeners.push(this.renderer.listen('document', 'mouseup', this.stopDragging.bind(this)));
        this.dragListeners.push(this.renderer.listen('document', 'touchend', this.stopDragging.bind(this)));
        this.dragListeners.push(this.renderer.listen('document', 'touchcancel', this.stopDragging.bind(this)));
        this.ngZone.runOutsideAngular(() => {
            this.dragListeners.push(this.renderer.listen('document', 'mousemove', this.dragEvent.bind(this)));
            this.dragListeners.push(this.renderer.listen('document', 'touchmove', this.dragEvent.bind(this)));
        });
        this.displayedAreas.forEach(area => area.component.lockEvents());
        this.isDragging = true;
        this.renderer.addClass(this.elRef.nativeElement, 'mtx-dragging');
        this.renderer.addClass(this.gutterEls.toArray()[this.snapshot.gutterNum - 1].nativeElement, 'mtx-dragged');
        this.notify('start', this.snapshot.gutterNum);
    }
    dragEvent(event) {
        event.preventDefault();
        event.stopPropagation();
        if (this._clickTimeout !== null) {
            window.clearTimeout(this._clickTimeout);
            this._clickTimeout = null;
        }
        if (this.isDragging === false) {
            return;
        }
        this.endPoint = getPointFromEvent(event);
        if (this.endPoint === null) {
            return;
        }
        // Calculate steppedOffset
        let offset = this.direction === 'horizontal'
            ? this.startPoint.x - this.endPoint.x
            : this.startPoint.y - this.endPoint.y;
        if (this.dir === 'rtl') {
            offset = -offset;
        }
        const steppedOffset = Math.round(offset / this.gutterStep) * this.gutterStep;
        if (steppedOffset === this.snapshot.lastSteppedOffset) {
            return;
        }
        this.snapshot.lastSteppedOffset = steppedOffset;
        // Need to know if each gutter side areas could reacts to steppedOffset
        let areasBefore = getGutterSideAbsorptionCapacity(this.unit, this.snapshot.areasBeforeGutter, -steppedOffset, this.snapshot.allAreasSizePixel);
        let areasAfter = getGutterSideAbsorptionCapacity(this.unit, this.snapshot.areasAfterGutter, steppedOffset, this.snapshot.allAreasSizePixel);
        // Each gutter side areas can't absorb all offset
        if (areasBefore.remain !== 0 && areasAfter.remain !== 0) {
            if (Math.abs(areasBefore.remain) === Math.abs(areasAfter.remain)) {
            }
            else if (Math.abs(areasBefore.remain) > Math.abs(areasAfter.remain)) {
                areasAfter = getGutterSideAbsorptionCapacity(this.unit, this.snapshot.areasAfterGutter, steppedOffset + areasBefore.remain, this.snapshot.allAreasSizePixel);
            }
            else {
                areasBefore = getGutterSideAbsorptionCapacity(this.unit, this.snapshot.areasBeforeGutter, -(steppedOffset - areasAfter.remain), this.snapshot.allAreasSizePixel);
            }
        }
        // Areas before gutter can't absorbs all offset > need to recalculate sizes for areas after gutter.
        // tslint:disable-next-line: one-line
        else if (areasBefore.remain !== 0) {
            areasAfter = getGutterSideAbsorptionCapacity(this.unit, this.snapshot.areasAfterGutter, steppedOffset + areasBefore.remain, this.snapshot.allAreasSizePixel);
        }
        // Areas after gutter can't absorbs all offset > need to recalculate sizes for areas before gutter.
        // tslint:disable-next-line: one-line
        else if (areasAfter.remain !== 0) {
            areasBefore = getGutterSideAbsorptionCapacity(this.unit, this.snapshot.areasBeforeGutter, -(steppedOffset - areasAfter.remain), this.snapshot.allAreasSizePixel);
        }
        if (this.unit === 'percent') {
            // Hack because of browser messing up with sizes using calc(X% - Ypx) -> el.getBoundingClientRect()
            // If not there, playing with gutters makes total going down to 99.99875% then 99.99286%, 99.98986%,..
            const all = [...areasBefore.list, ...areasAfter.list];
            const areaToReset = all.find(a => a.percentAfterAbsorption !== 0 &&
                a.percentAfterAbsorption !== a.areaSnapshot.area.minSize &&
                a.percentAfterAbsorption !== a.areaSnapshot.area.maxSize);
            if (areaToReset) {
                areaToReset.percentAfterAbsorption =
                    this.snapshot.allInvolvedAreasSizePercent -
                        all
                            .filter(a => a !== areaToReset)
                            .reduce((total, a) => total + a.percentAfterAbsorption, 0);
            }
        }
        // Now we know areas could absorb steppedOffset, time to really update sizes
        areasBefore.list.forEach(item => updateAreaSize(this.unit, item));
        areasAfter.list.forEach(item => updateAreaSize(this.unit, item));
        this.refreshStyleSizes();
        this.notify('progress', this.snapshot.gutterNum);
    }
    stopDragging(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (this.isDragging === false) {
            return;
        }
        this.displayedAreas.forEach(area => area.component.unlockEvents());
        while (this.dragListeners.length > 0) {
            const fct = this.dragListeners.pop();
            if (fct) {
                fct();
            }
        }
        // Warning: Have to be before "notify('end')"
        // because "notify('end')"" can be linked to "[size]='x'" > "build()" > "stopDragging()"
        this.isDragging = false;
        // If moved from starting point, notify end
        if (this.endPoint &&
            (this.startPoint.x !== this.endPoint.x ||
                this.startPoint.y !== this.endPoint.y)) {
            this.notify('end', this.snapshot.gutterNum);
        }
        this.renderer.removeClass(this.elRef.nativeElement, 'mtx-dragging');
        this.renderer.removeClass(this.gutterEls.toArray()[this.snapshot.gutterNum - 1].nativeElement, 'mtx-dragged');
        this.snapshot = null;
        // Needed to let (click)="clickGutter(...)" event run and verify if mouse moved or not
        this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
                this.startPoint = null;
                this.endPoint = null;
            });
        });
    }
    notify(type, gutterNum) {
        const sizes = this.getVisibleAreaSizes();
        if (type === 'start') {
            this.dragStart.emit({ gutterNum, sizes });
        }
        else if (type === 'end') {
            this.dragEnd.emit({ gutterNum, sizes });
        }
        else if (type === 'click') {
            this.gutterClick.emit({ gutterNum, sizes });
        }
        else if (type === 'dblclick') {
            this.gutterDblClick.emit({ gutterNum, sizes });
        }
        else if (type === 'transitionEnd') {
            if (this.transitionEndSubscriber) {
                this.ngZone.run(() => this.transitionEndSubscriber.next(sizes));
            }
        }
        else if (type === 'progress') {
            // Stay outside zone to allow users do what they want about change detection mechanism.
            this.dragProgressSubject.next({ gutterNum, sizes });
        }
    }
    ngOnDestroy() {
        this.stopDragging();
    }
}
MtxSplitComponent.decorators = [
    { type: Component, args: [{
                selector: 'mtx-split',
                exportAs: 'mtxSplit',
                host: {
                    class: 'mtx-split',
                },
                encapsulation: ViewEncapsulation.None,
                changeDetection: ChangeDetectionStrategy.OnPush,
                template: "<ng-content></ng-content>\r\n<ng-template ngFor [ngForOf]=\"displayedAreas\" let-index=\"index\" let-last=\"last\">\r\n  <div #gutterEls class=\"mtx-split-gutter\"\r\n       *ngIf=\"last === false\"\r\n       [style.flex-basis.px]=\"gutterSize\"\r\n       [style.order]=\"index * 2 + 1\"\r\n       (mousedown)=\"startDragging($event, index * 2 + 1, index + 1)\"\r\n       (touchstart)=\"startDragging($event, index * 2 + 1, index + 1)\"\r\n       (mouseup)=\"clickGutter($event, index + 1)\"\r\n       (touchend)=\"clickGutter($event, index + 1)\">\r\n    <div class=\"mtx-split-gutter-handle\"></div>\r\n  </div>\r\n</ng-template>\r\n",
                styles: [".mtx-split{display:flex;flex-wrap:nowrap;justify-content:flex-start;align-items:stretch;overflow:hidden;width:100%;height:100%}.mtx-split>.mtx-split-gutter{position:relative;display:flex;flex-grow:0;flex-shrink:0;align-items:center;justify-content:center}.mtx-split>.mtx-split-gutter>.mtx-split-gutter-handle{position:absolute;opacity:0}.mtx-split>.mtx-split-pane{flex-grow:0;flex-shrink:0;overflow-x:hidden;overflow-y:auto}.mtx-split>.mtx-split-pane.mtx-split-pane-hidden{flex:0 1 0!important;overflow-x:hidden;overflow-y:hidden}.mtx-split.mtx-split-horizontal{flex-direction:row}.mtx-split.mtx-split-horizontal>.mtx-split-gutter{flex-direction:row;height:100%;cursor:col-resize}.mtx-split.mtx-split-horizontal>.mtx-split-gutter>.mtx-split-gutter-handle{width:11px;height:100%;left:-5px;right:5px}.mtx-split.mtx-split-horizontal>.mtx-split-pane{height:100%}.mtx-split.mtx-split-vertical{flex-direction:column}.mtx-split.mtx-split-vertical>.mtx-split-gutter{flex-direction:column;width:100%;cursor:row-resize}.mtx-split.mtx-split-vertical>.mtx-split-gutter>.mtx-split-gutter-handle{width:100%;height:11px;top:-5px;bottom:5px}.mtx-split.mtx-split-vertical>.mtx-split-pane{width:100%}.mtx-split.mtx-split-vertical>.mtx-split-pane.mtx-split-pane-hidden{max-width:0}.mtx-split.mtx-split-disabled>.mtx-split-gutter{cursor:default}.mtx-split.mtx-split-disabled>.mtx-split-gutter .mtx-split-gutter-handle{background-image:none}.mtx-split.mtx-split-transition.mtx-split-init:not(.mtx-dragging)>.mtx-split-gutter,.mtx-split.mtx-split-transition.mtx-split-init:not(.mtx-dragging)>.mtx-split-pane{transition:flex-basis .3s}"]
            },] }
];
/** @nocollapse */
MtxSplitComponent.ctorParameters = () => [
    { type: NgZone },
    { type: ElementRef },
    { type: ChangeDetectorRef },
    { type: Renderer2 }
];
MtxSplitComponent.propDecorators = {
    direction: [{ type: Input }],
    unit: [{ type: Input }],
    gutterSize: [{ type: Input }],
    gutterStep: [{ type: Input }],
    restrictMove: [{ type: Input }],
    useTransition: [{ type: Input }],
    disabled: [{ type: Input }],
    dir: [{ type: Input }],
    gutterDblClickDuration: [{ type: Input }],
    dragStart: [{ type: Output }],
    dragEnd: [{ type: Output }],
    gutterClick: [{ type: Output }],
    gutterDblClick: [{ type: Output }],
    transitionEnd: [{ type: Output }],
    gutterEls: [{ type: ViewChildren, args: ['gutterEls',] }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BsaXQuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvZXh0ZW5zaW9ucy9zcGxpdC1wYW5lL3NwbGl0LmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsU0FBUyxFQUNULEtBQUssRUFDTCxNQUFNLEVBQ04sdUJBQXVCLEVBQ3ZCLGlCQUFpQixFQUNqQixTQUFTLEVBR1QsVUFBVSxFQUNWLE1BQU0sRUFDTixZQUFZLEVBQ1osU0FBUyxFQUNULFlBQVksRUFDWixpQkFBaUIsR0FDbEIsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFFLFVBQVUsRUFBYyxPQUFPLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDdkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBVzlDLE9BQU8sRUFDTCxzQkFBc0IsRUFDdEIsZUFBZSxFQUNmLGdCQUFnQixFQUNoQixjQUFjLEVBQ2QsY0FBYyxFQUNkLGlCQUFpQixFQUNqQixtQkFBbUIsRUFDbkIsK0JBQStCLEVBQy9CLGNBQWMsR0FDZixNQUFNLFNBQVMsQ0FBQztBQUVqQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQTRCRztBQWFILE1BQU0sT0FBTyxpQkFBaUI7SUF5SzVCLFlBQ1UsTUFBYyxFQUNkLEtBQWlCLEVBQ2pCLEtBQXdCLEVBQ3hCLFFBQW1CO1FBSG5CLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxVQUFLLEdBQUwsS0FBSyxDQUFZO1FBQ2pCLFVBQUssR0FBTCxLQUFLLENBQW1CO1FBQ3hCLGFBQVEsR0FBUixRQUFRLENBQVc7UUE1S3JCLGVBQVUsR0FBOEIsWUFBWSxDQUFDO1FBa0I3RCxJQUFJO1FBRUksVUFBSyxHQUF3QixTQUFTLENBQUM7UUFrQi9DLElBQUk7UUFFSSxnQkFBVyxHQUFHLENBQUMsQ0FBQztRQVl4QixJQUFJO1FBRUksZ0JBQVcsR0FBRyxDQUFDLENBQUM7UUFVeEIsSUFBSTtRQUVJLGtCQUFhLEdBQUcsS0FBSyxDQUFDO1FBVTlCLElBQUk7UUFFSSxtQkFBYyxHQUFHLEtBQUssQ0FBQztRQWdCL0IsSUFBSTtRQUVJLGNBQVMsR0FBRyxLQUFLLENBQUM7UUFnQjFCLElBQUk7UUFFSSxTQUFJLEdBQWtCLEtBQUssQ0FBQztRQVlwQyxJQUFJO1FBRUksNEJBQXVCLEdBQUcsQ0FBQyxDQUFDO1FBVXBDLElBQUk7UUFFTSxjQUFTLEdBQUcsSUFBSSxZQUFZLENBQXFCLEtBQUssQ0FBQyxDQUFDO1FBQ3hELFlBQU8sR0FBRyxJQUFJLFlBQVksQ0FBcUIsS0FBSyxDQUFDLENBQUM7UUFDdEQsZ0JBQVcsR0FBRyxJQUFJLFlBQVksQ0FBcUIsS0FBSyxDQUFDLENBQUM7UUFDMUQsbUJBQWMsR0FBRyxJQUFJLFlBQVksQ0FBcUIsS0FBSyxDQUFDLENBQUM7UUFTL0Qsd0JBQW1CLEdBQWdDLElBQUksT0FBTyxFQUFFLENBQUM7UUFDekUsa0JBQWEsR0FBbUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFlBQVksRUFBRSxDQUFDO1FBRXhGLElBQUk7UUFFSSxlQUFVLEdBQUcsS0FBSyxDQUFDO1FBQ25CLGtCQUFhLEdBQXNCLEVBQUUsQ0FBQztRQUN0QyxhQUFRLEdBQTRCLElBQUksQ0FBQztRQUN6QyxlQUFVLEdBQXlCLElBQUksQ0FBQztRQUN4QyxhQUFRLEdBQXlCLElBQUksQ0FBQztRQUU5QixtQkFBYyxHQUF3QixFQUFFLENBQUM7UUFDeEMsZUFBVSxHQUF3QixFQUFFLENBQUM7UUEwUXRELGtCQUFhLEdBQWtCLElBQUksQ0FBQztRQWhRbEMsMkVBQTJFO1FBQzNFLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUNuQyxDQUFDO0lBOUtELElBQWEsU0FBUyxDQUFDLENBQTRCO1FBQ2pELElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7UUFFL0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsYUFBYSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUNqRixJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FDdkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQ3hCLGFBQWEsSUFBSSxDQUFDLFVBQVUsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLENBQzFFLENBQUM7UUFFRixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1gsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQ3pCLENBQUM7SUFNRCxJQUFhLElBQUksQ0FBQyxDQUFzQjtRQUN0QyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRWpELElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLGFBQWEsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDNUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQ3ZCLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUN4QixhQUFhLElBQUksQ0FBQyxLQUFLLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUM1RCxDQUFDO1FBRUYsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQztJQUVELElBQUksSUFBSTtRQUNOLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQztJQUNwQixDQUFDO0lBTUQsSUFBYSxVQUFVLENBQUMsQ0FBUztRQUMvQixJQUFJLENBQUMsV0FBVyxHQUFHLHNCQUFzQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqRCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ1osT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDO0lBQzFCLENBQUM7SUFNRCxJQUFhLFVBQVUsQ0FBQyxDQUFTO1FBQy9CLElBQUksQ0FBQyxXQUFXLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFFRCxJQUFJLFVBQVU7UUFDWixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDMUIsQ0FBQztJQU1ELElBQWEsWUFBWSxDQUFDLENBQVU7UUFDbEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVELElBQUksWUFBWTtRQUNkLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUM1QixDQUFDO0lBTUQsSUFBYSxhQUFhLENBQUMsQ0FBVTtRQUNuQyxJQUFJLENBQUMsY0FBYyxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV6QyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDdkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztTQUMxRTthQUFNO1lBQ0wsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztTQUM3RTtJQUNILENBQUM7SUFFRCxJQUFJLGFBQWE7UUFDZixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUM7SUFDN0IsQ0FBQztJQU1ELElBQWEsUUFBUSxDQUFDLENBQVU7UUFDOUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFcEMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ2xCLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLG9CQUFvQixDQUFDLENBQUM7U0FDeEU7YUFBTTtZQUNMLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLG9CQUFvQixDQUFDLENBQUM7U0FDM0U7SUFDSCxDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3hCLENBQUM7SUFNRCxJQUFhLEdBQUcsQ0FBQyxDQUFnQjtRQUMvQixJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBRXhDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekUsQ0FBQztJQUVELElBQUksR0FBRztRQUNMLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNuQixDQUFDO0lBTUQsSUFBYSxzQkFBc0IsQ0FBQyxDQUFTO1FBQzNDLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVELElBQUksc0JBQXNCO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDO0lBQ3RDLENBQUM7SUFVRCxJQUFjLGFBQWE7UUFDekIsT0FBTyxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLHVCQUF1QixHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUNuRixZQUFZLENBQU0sRUFBRSxDQUFDLENBQ3RCLENBQUM7SUFDSixDQUFDO0lBNEJNLGVBQWU7UUFDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUU7WUFDakMseUNBQXlDO1lBQ3pDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7UUFDdkYsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sWUFBWTtRQUNsQixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7SUFDL0UsQ0FBQztJQUVNLE9BQU8sQ0FBQyxTQUFnQztRQUM3QyxNQUFNLE9BQU8sR0FBaUI7WUFDNUIsU0FBUztZQUNULEtBQUssRUFBRSxDQUFDO1lBQ1IsSUFBSSxFQUFFLENBQUM7WUFDUCxPQUFPLEVBQUUsSUFBSTtZQUNiLE9BQU8sRUFBRSxJQUFJO1NBQ2QsQ0FBQztRQUVGLElBQUksU0FBUyxDQUFDLE9BQU8sS0FBSyxJQUFJLEVBQUU7WUFDOUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFbEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7U0FDeEI7YUFBTTtZQUNMLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQy9CO0lBQ0gsQ0FBQztJQUVNLFVBQVUsQ0FBQyxTQUFnQztRQUNoRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsS0FBSyxTQUFTLENBQUMsRUFBRTtZQUM1RCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFpQixDQUFDO1lBQ3RGLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRWpFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQ3hCO2FBQU0sSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLEtBQUssU0FBUyxDQUFDLEVBQUU7WUFDL0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBaUIsQ0FBQztZQUNsRixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztTQUMxRDtJQUNILENBQUM7SUFFTSxVQUFVLENBQ2YsU0FBZ0MsRUFDaEMsV0FBb0IsRUFDcEIsVUFBbUI7UUFFbkIsSUFBSSxTQUFTLENBQUMsT0FBTyxLQUFLLElBQUksRUFBRTtZQUM5QixJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztTQUNyQztJQUNILENBQUM7SUFFTSxRQUFRLENBQUMsU0FBZ0M7UUFDOUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQ2xFLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtZQUN0QixPQUFPO1NBQ1I7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2RSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDO1FBRW5DLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFTSxRQUFRLENBQUMsSUFBMkI7UUFDekMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLElBQUksQ0FBQyxDQUFDO1FBQ2pFLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtZQUN0QixPQUFPO1NBQ1I7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvRSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3BCLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQ2hCLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQztRQUUvQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBRU0sbUJBQW1CO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7SUFFTSxtQkFBbUIsQ0FBQyxLQUE4QjtRQUN2RCxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUU7WUFDL0MsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUVELE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQWEsQ0FBQztRQUNsRixNQUFNLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRTNELElBQUksT0FBTyxLQUFLLEtBQUssRUFBRTtZQUNyQixPQUFPLEtBQUssQ0FBQztTQUNkO1FBRUQsYUFBYTtRQUNiLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXBGLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVPLEtBQUssQ0FBQyxXQUFvQixFQUFFLFVBQW1CO1FBQ3JELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUVwQixnQkFBZ0I7UUFFaEIsSUFBSSxXQUFXLEtBQUssSUFBSSxFQUFFO1lBQ3hCLCtEQUErRDtZQUMvRCxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLEVBQUU7Z0JBQzlELElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUN0QixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFnQixHQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBZ0IsQ0FBVyxDQUNwRixDQUFDO2FBQ0g7WUFFRCxvRkFBb0Y7WUFDcEYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3RDLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDbkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzNDLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFFRCxlQUFlO1FBRWYsSUFBSSxVQUFVLEtBQUssSUFBSSxFQUFFO1lBQ3ZCLE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUNuQyxJQUFJLENBQUMsSUFBSSxFQUNULElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQWEsQ0FDM0QsQ0FBQztZQUVGLFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRTtnQkFDakIsS0FBSyxTQUFTLENBQUMsQ0FBQztvQkFDZCxNQUFNLFdBQVcsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUM7b0JBRXJELElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUNqQyxJQUFJLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQyxDQUFDLENBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFlLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQzt3QkFDekUsSUFBSSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3BDLElBQUksQ0FBQyxPQUFPLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN0QyxDQUFDLENBQUMsQ0FBQztvQkFDSCxNQUFNO2lCQUNQO2dCQUNELEtBQUssT0FBTyxDQUFDLENBQUM7b0JBQ1osSUFBSSxZQUFZLEVBQUU7d0JBQ2hCLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFOzRCQUNqQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDOzRCQUNoQyxJQUFJLENBQUMsT0FBTyxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDcEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3RDLENBQUMsQ0FBQyxDQUFDO3FCQUNKO3lCQUFNO3dCQUNMLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQzt3QkFFckYsNERBQTREO3dCQUM1RCxJQUFJLGlCQUFpQixDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFOzRCQUNwRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRTtnQ0FDdEMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO2dDQUNqRCxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO2dDQUNyRCxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUN2RCxDQUFDLENBQUMsQ0FBQzt5QkFDSjt3QkFDRCx5RUFBeUU7d0JBQ3pFLHFDQUFxQzs2QkFDaEMsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFOzRCQUNyQyxJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7NEJBQzFCLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO2dDQUNqQyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtvQ0FDaEMsSUFBSSxhQUFhLEtBQUssS0FBSyxFQUFFO3dDQUMzQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQzt3Q0FDakIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7d0NBQ3BCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO3dDQUNwQixhQUFhLEdBQUcsSUFBSSxDQUFDO3FDQUN0Qjt5Q0FBTTt3Q0FDTCxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQzt3Q0FDaEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7d0NBQ3BCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO3FDQUNyQjtpQ0FDRjtxQ0FBTTtvQ0FDTCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO29DQUNoQyxJQUFJLENBQUMsT0FBTyxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQ0FDcEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7aUNBQ3JDOzRCQUNILENBQUMsQ0FBQyxDQUFDO3lCQUNKO3FCQUNGO29CQUNELE1BQU07aUJBQ1A7YUFDRjtTQUNGO1FBRUQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRU8saUJBQWlCO1FBQ3ZCLDJDQUEyQztRQUMzQyxlQUFlO1FBQ2YsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTtZQUMzQixrQ0FBa0M7WUFDbEMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3BDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDM0U7WUFDRCwwQ0FBMEM7WUFDMUMscUNBQXFDO2lCQUNoQztnQkFDSCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFFNUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUN6QixDQUFDLEVBQ0QsQ0FBQyxFQUNELFNBQVMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFFLElBQUksQ0FBQyxJQUFlLEdBQUcsR0FBRyxDQUFDLEdBQUcsYUFBYSxNQUFNLEVBQzVFLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQ2xFLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQ25FLENBQUM7Z0JBQ0osQ0FBQyxDQUFDLENBQUM7YUFDSjtTQUNGO1FBQ0QsMkNBQTJDO1FBQzNDLGFBQWE7UUFDYixxQ0FBcUM7YUFDaEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtZQUM5QixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDakMsMEJBQTBCO2dCQUMxQixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFO29CQUN0QixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTt3QkFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO3FCQUN6RDt5QkFBTTt3QkFDTCxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7cUJBQ3pEO2lCQUNGO2dCQUNELHVCQUF1QjtnQkFDdkIscUNBQXFDO3FCQUNoQztvQkFDSCxrQ0FBa0M7b0JBQ2xDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO3dCQUNwQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7cUJBQ3pEO29CQUNELHdDQUF3QztvQkFDeEMscUNBQXFDO3lCQUNoQzt3QkFDSCxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FDekIsQ0FBQyxFQUNELENBQUMsRUFDRCxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksRUFDaEIsSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFDbEUsSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FDbkUsQ0FBQztxQkFDSDtpQkFDRjtZQUNILENBQUMsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDO0lBSU0sV0FBVyxDQUFDLEtBQThCLEVBQUUsU0FBaUI7UUFDbEUsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFrQixDQUFDO1FBRTVELG9HQUFvRztRQUNwRyxJQUFJLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsS0FBSyxTQUFTLENBQUMsQ0FBQyxFQUFFO1lBQzdGLHNFQUFzRTtZQUN0RSxJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssSUFBSSxFQUFFO2dCQUMvQixNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDeEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUNuQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7YUFDckI7WUFDRCwrQ0FBK0M7WUFDL0MscUNBQXFDO2lCQUNoQztnQkFDSCxJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO29CQUMxQyxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztvQkFDMUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQ2hDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDdEIsQ0FBQyxFQUFFLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO2FBQ2pDO1NBQ0Y7SUFDSCxDQUFDO0lBRU0sYUFBYSxDQUNsQixLQUE4QixFQUM5QixXQUFtQixFQUNuQixTQUFpQjtRQUVqQixLQUFLLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdkIsS0FBSyxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBRXhCLElBQUksQ0FBQyxVQUFVLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0MsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksRUFBRTtZQUN0RCxPQUFPO1NBQ1I7UUFFRCxJQUFJLENBQUMsUUFBUSxHQUFHO1lBQ2QsU0FBUztZQUNULGlCQUFpQixFQUFFLENBQUM7WUFDcEIsaUJBQWlCLEVBQ2YsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVO1lBQ3pGLDJCQUEyQixFQUFFLEdBQUc7WUFDaEMsaUJBQWlCLEVBQUUsRUFBRTtZQUNyQixnQkFBZ0IsRUFBRSxFQUFFO1NBQ3JCLENBQUM7UUFFRixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNqQyxNQUFNLFlBQVksR0FBeUI7Z0JBQ3pDLElBQUk7Z0JBQ0osZ0JBQWdCLEVBQUUsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDM0Usa0JBQWtCLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQVcsRUFBRSwyQ0FBMkM7YUFDdEgsQ0FBQztZQUVGLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxXQUFXLEVBQUU7Z0JBQzVCLElBQUksSUFBSSxDQUFDLFlBQVksS0FBSyxJQUFJLEVBQUU7b0JBQzdCLElBQUksQ0FBQyxRQUE2QixDQUFDLGlCQUFpQixHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7aUJBQ3hFO3FCQUFNO29CQUNKLElBQUksQ0FBQyxRQUE2QixDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztpQkFDN0U7YUFDRjtpQkFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsV0FBVyxFQUFFO2dCQUNuQyxJQUFJLElBQUksQ0FBQyxZQUFZLEtBQUssSUFBSSxFQUFFO29CQUM5QixJQUFLLElBQUksQ0FBQyxRQUE2QixDQUFDLGdCQUFnQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7d0JBQ3BFLElBQUksQ0FBQyxRQUE2QixDQUFDLGdCQUFnQixHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7cUJBQ3ZFO2lCQUNGO3FCQUFNO29CQUNKLElBQUksQ0FBQyxRQUE2QixDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztpQkFDekU7YUFDRjtRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFFBQVEsQ0FBQywyQkFBMkIsR0FBRztZQUMxQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCO1lBQ2xDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0I7U0FDbEMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRWhELElBQ0UsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUM1QyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQzNDO1lBQ0EsT0FBTztTQUNSO1FBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQ3JCLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDMUUsQ0FBQztRQUNGLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQzNFLENBQUM7UUFDRixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FDckIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUM5RSxDQUFDO1FBRUYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUU7WUFDakMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQ3JCLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDekUsQ0FBQztZQUNGLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQ3pFLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBRWpFLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2pFLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUNwQixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFDbkUsYUFBYSxDQUNkLENBQUM7UUFFRixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFTyxTQUFTLENBQUMsS0FBOEI7UUFDOUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3ZCLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUV4QixJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssSUFBSSxFQUFFO1lBQy9CLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ3hDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1NBQzNCO1FBRUQsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLEtBQUssRUFBRTtZQUM3QixPQUFPO1NBQ1I7UUFFRCxJQUFJLENBQUMsUUFBUSxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3pDLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUU7WUFDMUIsT0FBTztTQUNSO1FBRUQsMEJBQTBCO1FBRTFCLElBQUksTUFBTSxHQUNSLElBQUksQ0FBQyxTQUFTLEtBQUssWUFBWTtZQUM3QixDQUFDLENBQUUsSUFBSSxDQUFDLFVBQTRCLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN4RCxDQUFDLENBQUUsSUFBSSxDQUFDLFVBQTRCLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzdELElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxLQUFLLEVBQUU7WUFDdEIsTUFBTSxHQUFHLENBQUMsTUFBTSxDQUFDO1NBQ2xCO1FBQ0QsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7UUFFN0UsSUFBSSxhQUFhLEtBQU0sSUFBSSxDQUFDLFFBQTZCLENBQUMsaUJBQWlCLEVBQUU7WUFDM0UsT0FBTztTQUNSO1FBRUEsSUFBSSxDQUFDLFFBQTZCLENBQUMsaUJBQWlCLEdBQUcsYUFBYSxDQUFDO1FBRXRFLHVFQUF1RTtRQUV2RSxJQUFJLFdBQVcsR0FBRywrQkFBK0IsQ0FDL0MsSUFBSSxDQUFDLElBQUksRUFDUixJQUFJLENBQUMsUUFBNkIsQ0FBQyxpQkFBaUIsRUFDckQsQ0FBQyxhQUFhLEVBQ2IsSUFBSSxDQUFDLFFBQTZCLENBQUMsaUJBQWlCLENBQ3RELENBQUM7UUFDRixJQUFJLFVBQVUsR0FBRywrQkFBK0IsQ0FDOUMsSUFBSSxDQUFDLElBQUksRUFDUixJQUFJLENBQUMsUUFBNkIsQ0FBQyxnQkFBZ0IsRUFDcEQsYUFBYSxFQUNaLElBQUksQ0FBQyxRQUE2QixDQUFDLGlCQUFpQixDQUN0RCxDQUFDO1FBRUYsaURBQWlEO1FBQ2pELElBQUksV0FBVyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDdkQsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRTthQUNqRTtpQkFBTSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUNyRSxVQUFVLEdBQUcsK0JBQStCLENBQzFDLElBQUksQ0FBQyxJQUFJLEVBQ1IsSUFBSSxDQUFDLFFBQTZCLENBQUMsZ0JBQWdCLEVBQ3BELGFBQWEsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUNqQyxJQUFJLENBQUMsUUFBNkIsQ0FBQyxpQkFBaUIsQ0FDdEQsQ0FBQzthQUNIO2lCQUFNO2dCQUNMLFdBQVcsR0FBRywrQkFBK0IsQ0FDM0MsSUFBSSxDQUFDLElBQUksRUFDUixJQUFJLENBQUMsUUFBNkIsQ0FBQyxpQkFBaUIsRUFDckQsQ0FBQyxDQUFDLGFBQWEsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQ25DLElBQUksQ0FBQyxRQUE2QixDQUFDLGlCQUFpQixDQUN0RCxDQUFDO2FBQ0g7U0FDRjtRQUNELG1HQUFtRztRQUNuRyxxQ0FBcUM7YUFDaEMsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNqQyxVQUFVLEdBQUcsK0JBQStCLENBQzFDLElBQUksQ0FBQyxJQUFJLEVBQ1IsSUFBSSxDQUFDLFFBQTZCLENBQUMsZ0JBQWdCLEVBQ3BELGFBQWEsR0FBRyxXQUFXLENBQUMsTUFBTSxFQUNqQyxJQUFJLENBQUMsUUFBNkIsQ0FBQyxpQkFBaUIsQ0FDdEQsQ0FBQztTQUNIO1FBQ0QsbUdBQW1HO1FBQ25HLHFDQUFxQzthQUNoQyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ2hDLFdBQVcsR0FBRywrQkFBK0IsQ0FDM0MsSUFBSSxDQUFDLElBQUksRUFDUixJQUFJLENBQUMsUUFBNkIsQ0FBQyxpQkFBaUIsRUFDckQsQ0FBQyxDQUFDLGFBQWEsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQ25DLElBQUksQ0FBQyxRQUE2QixDQUFDLGlCQUFpQixDQUN0RCxDQUFDO1NBQ0g7UUFFRCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO1lBQzNCLG1HQUFtRztZQUNuRyxzR0FBc0c7WUFDdEcsTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEQsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FDMUIsQ0FBQyxDQUFDLEVBQUUsQ0FDRixDQUFDLENBQUMsc0JBQXNCLEtBQUssQ0FBQztnQkFDOUIsQ0FBQyxDQUFDLHNCQUFzQixLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU87Z0JBQ3hELENBQUMsQ0FBQyxzQkFBc0IsS0FBSyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQzNELENBQUM7WUFFRixJQUFJLFdBQVcsRUFBRTtnQkFDZixXQUFXLENBQUMsc0JBQXNCO29CQUMvQixJQUFJLENBQUMsUUFBNkIsQ0FBQywyQkFBMkI7d0JBQy9ELEdBQUc7NkJBQ0EsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLFdBQVcsQ0FBQzs2QkFDOUIsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUMsQ0FBQzthQUNoRTtTQUNGO1FBRUQsNEVBQTRFO1FBRTVFLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNsRSxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFakUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDekIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUcsSUFBSSxDQUFDLFFBQTZCLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDekUsQ0FBQztJQUVPLFlBQVksQ0FBQyxLQUFhO1FBQ2hDLElBQUksS0FBSyxFQUFFO1lBQ1QsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3ZCLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztTQUN6QjtRQUVELElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxLQUFLLEVBQUU7WUFDN0IsT0FBTztTQUNSO1FBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFFbkUsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDcEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNyQyxJQUFJLEdBQUcsRUFBRTtnQkFDUCxHQUFHLEVBQUUsQ0FBQzthQUNQO1NBQ0Y7UUFFRCw2Q0FBNkM7UUFDN0Msd0ZBQXdGO1FBQ3hGLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDO1FBRXhCLDJDQUEyQztRQUMzQyxJQUNFLElBQUksQ0FBQyxRQUFRO1lBQ2IsQ0FBRSxJQUFJLENBQUMsVUFBNEIsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN0RCxJQUFJLENBQUMsVUFBNEIsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFDM0Q7WUFDQSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRyxJQUFJLENBQUMsUUFBNkIsQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUNuRTtRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3BFLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFFLElBQUksQ0FBQyxRQUE2QixDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxhQUFhLEVBQ3pGLGFBQWEsQ0FDZCxDQUFDO1FBQ0YsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFFckIsc0ZBQXNGO1FBQ3RGLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFO1lBQ2pDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0JBQ2QsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1lBQ3ZCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU0sTUFBTSxDQUNYLElBQTJFLEVBQzNFLFNBQWlCO1FBRWpCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBRXpDLElBQUksSUFBSSxLQUFLLE9BQU8sRUFBRTtZQUNwQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1NBQzNDO2FBQU0sSUFBSSxJQUFJLEtBQUssS0FBSyxFQUFFO1lBQ3pCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7U0FDekM7YUFBTSxJQUFJLElBQUksS0FBSyxPQUFPLEVBQUU7WUFDM0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztTQUM3QzthQUFNLElBQUksSUFBSSxLQUFLLFVBQVUsRUFBRTtZQUM5QixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1NBQ2hEO2FBQU0sSUFBSSxJQUFJLEtBQUssZUFBZSxFQUFFO1lBQ25DLElBQUksSUFBSSxDQUFDLHVCQUF1QixFQUFFO2dCQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDakU7U0FDRjthQUFNLElBQUksSUFBSSxLQUFLLFVBQVUsRUFBRTtZQUM5Qix1RkFBdUY7WUFDdkYsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1NBQ3JEO0lBQ0gsQ0FBQztJQUVNLFdBQVc7UUFDaEIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3RCLENBQUM7OztZQS91QkYsU0FBUyxTQUFDO2dCQUNULFFBQVEsRUFBRSxXQUFXO2dCQUNyQixRQUFRLEVBQUUsVUFBVTtnQkFDcEIsSUFBSSxFQUFFO29CQUNKLEtBQUssRUFBRSxXQUFXO2lCQUNuQjtnQkFDRCxhQUFhLEVBQUUsaUJBQWlCLENBQUMsSUFBSTtnQkFDckMsZUFBZSxFQUFFLHVCQUF1QixDQUFDLE1BQU07Z0JBRS9DLHVvQkFBcUM7O2FBQ3RDOzs7O1lBdEVDLE1BQU07WUFETixVQUFVO1lBSlYsaUJBQWlCO1lBQ2pCLFNBQVM7Ozt3QkE4RVIsS0FBSzttQkFvQkwsS0FBSzt5QkFvQkwsS0FBSzt5QkFjTCxLQUFLOzJCQVlMLEtBQUs7NEJBWUwsS0FBSzt1QkFrQkwsS0FBSztrQkFrQkwsS0FBSztxQ0FjTCxLQUFLO3dCQVVMLE1BQU07c0JBQ04sTUFBTTswQkFDTixNQUFNOzZCQUNOLE1BQU07NEJBR04sTUFBTTt3QkFvQk4sWUFBWSxTQUFDLFdBQVciLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG4gIENvbXBvbmVudCxcclxuICBJbnB1dCxcclxuICBPdXRwdXQsXHJcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXHJcbiAgQ2hhbmdlRGV0ZWN0b3JSZWYsXHJcbiAgUmVuZGVyZXIyLFxyXG4gIEFmdGVyVmlld0luaXQsXHJcbiAgT25EZXN0cm95LFxyXG4gIEVsZW1lbnRSZWYsXHJcbiAgTmdab25lLFxyXG4gIFZpZXdDaGlsZHJlbixcclxuICBRdWVyeUxpc3QsXHJcbiAgRXZlbnRFbWl0dGVyLFxyXG4gIFZpZXdFbmNhcHN1bGF0aW9uLFxyXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xyXG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBTdWJzY3JpYmVyLCBTdWJqZWN0IH0gZnJvbSAncnhqcyc7XHJcbmltcG9ydCB7IGRlYm91bmNlVGltZSB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcclxuXHJcbmltcG9ydCB7XHJcbiAgTXR4U3BsaXRBcmVhLFxyXG4gIE10eFNwbGl0UG9pbnQsXHJcbiAgTXR4U3BsaXRTbmFwc2hvdCxcclxuICBNdHhTcGxpdEFyZWFTbmFwc2hvdCxcclxuICBNdHhTcGxpdE91dHB1dERhdGEsXHJcbiAgTXR4U3BsaXRPdXRwdXRBcmVhU2l6ZXMsXHJcbn0gZnJvbSAnLi9pbnRlcmZhY2UnO1xyXG5pbXBvcnQgeyBNdHhTcGxpdFBhbmVEaXJlY3RpdmUgfSBmcm9tICcuL3NwbGl0LXBhbmUuZGlyZWN0aXZlJztcclxuaW1wb3J0IHtcclxuICBnZXRJbnB1dFBvc2l0aXZlTnVtYmVyLFxyXG4gIGdldElucHV0Qm9vbGVhbixcclxuICBpc1VzZXJTaXplc1ZhbGlkLFxyXG4gIGdldEFyZWFNaW5TaXplLFxyXG4gIGdldEFyZWFNYXhTaXplLFxyXG4gIGdldFBvaW50RnJvbUV2ZW50LFxyXG4gIGdldEVsZW1lbnRQaXhlbFNpemUsXHJcbiAgZ2V0R3V0dGVyU2lkZUFic29ycHRpb25DYXBhY2l0eSxcclxuICB1cGRhdGVBcmVhU2l6ZSxcclxufSBmcm9tICcuL3V0aWxzJztcclxuXHJcbi8qKlxyXG4gKiBtdHgtc3BsaXRcclxuICpcclxuICpcclxuICogIFBFUkNFTlQgTU9ERSAoW3VuaXRdPVwiJ3BlcmNlbnQnXCIpXHJcbiAqICBfX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXHJcbiAqIHwgICAgICAgQSAgICAgICBbZzFdICAgICAgIEIgICAgICAgW2cyXSAgICAgICBDICAgICAgIFtnM10gICAgICAgRCAgICAgICBbZzRdICAgICAgIEUgICAgICAgfFxyXG4gKiB8LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLXxcclxuICogfCAgICAgICAyMCAgICAgICAgICAgICAgICAgMzAgICAgICAgICAgICAgICAgIDIwICAgICAgICAgICAgICAgICAxNSAgICAgICAgICAgICAgICAgMTUgICAgICB8IDwtLSBbc2l6ZV09XCJ4XCJcclxuICogfCAgICAgICAgICAgICAgIDEwcHggICAgICAgICAgICAgICAxMHB4ICAgICAgICAgICAgICAgMTBweCAgICAgICAgICAgICAgIDEwcHggICAgICAgICAgICAgICB8IDwtLSBbZ3V0dGVyU2l6ZV09XCIxMFwiXHJcbiAqIHxjYWxjKDIwJSAtIDhweCkgICAgY2FsYygzMCUgLSAxMnB4KSAgIGNhbGMoMjAlIC0gOHB4KSAgICBjYWxjKDE1JSAtIDZweCkgICAgY2FsYygxNSUgLSA2cHgpfCA8LS0gQ1NTIGZsZXgtYmFzaXMgcHJvcGVydHkgKHdpdGggZmxleC1ncm93JnNocmluayBhdCAwKVxyXG4gKiB8ICAgICAxNTJweCAgICAgICAgICAgICAgMjI4cHggICAgICAgICAgICAgIDE1MnB4ICAgICAgICAgICAgICAxMTRweCAgICAgICAgICAgICAgMTE0cHggICAgIHwgPC0tIGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoXHJcbiAqIHxfX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19ffFxyXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDgwMHB4ICAgICAgICAgPC0tIGVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoXHJcbiAqICBmbGV4LWJhc2lzID0gY2FsYyggeyBhcmVhLnNpemUgfSUgLSB7IGFyZWEuc2l6ZS8xMDAgKiBuYkd1dHRlcipndXR0ZXJTaXplIH1weCApO1xyXG4gKlxyXG4gKlxyXG4gKiAgUElYRUwgTU9ERSAoW3VuaXRdPVwiJ3BpeGVsJ1wiKVxyXG4gKiAgX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX1xyXG4gKiB8ICAgICAgIEEgICAgICAgW2cxXSAgICAgICBCICAgICAgIFtnMl0gICAgICAgQyAgICAgICBbZzNdICAgICAgIEQgICAgICAgW2c0XSAgICAgICBFICAgICAgIHxcclxuICogfC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS18XHJcbiAqIHwgICAgICAxMDAgICAgICAgICAgICAgICAgMjUwICAgICAgICAgICAgICAgICAqICAgICAgICAgICAgICAgICAxNTAgICAgICAgICAgICAgICAgMTAwICAgICAgfCA8LS0gW3NpemVdPVwieVwiXHJcbiAqIHwgICAgICAgICAgICAgICAxMHB4ICAgICAgICAgICAgICAgMTBweCAgICAgICAgICAgICAgIDEwcHggICAgICAgICAgICAgICAxMHB4ICAgICAgICAgICAgICAgfCA8LS0gW2d1dHRlclNpemVdPVwiMTBcIlxyXG4gKiB8ICAgMCAwIDEwMHB4ICAgICAgICAgIDAgMCAyNTBweCAgICAgICAgICAgMSAxIGF1dG8gICAgICAgICAgMCAwIDE1MHB4ICAgICAgICAgIDAgMCAxMDBweCAgIHwgPC0tIENTUyBmbGV4IHByb3BlcnR5IChmbGV4LWdyb3cvZmxleC1zaHJpbmsvZmxleC1iYXNpcylcclxuICogfCAgICAgMTAwcHggICAgICAgICAgICAgIDI1MHB4ICAgICAgICAgICAgICAyMDBweCAgICAgICAgICAgICAgMTUwcHggICAgICAgICAgICAgIDEwMHB4ICAgICB8IDwtLSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aFxyXG4gKiB8X19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX3xcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA4MDBweCAgICAgICAgIDwtLSBlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aFxyXG4gKlxyXG4gKi9cclxuXHJcbkBDb21wb25lbnQoe1xyXG4gIHNlbGVjdG9yOiAnbXR4LXNwbGl0JyxcclxuICBleHBvcnRBczogJ210eFNwbGl0JyxcclxuICBob3N0OiB7XHJcbiAgICBjbGFzczogJ210eC1zcGxpdCcsXHJcbiAgfSxcclxuICBlbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5Ob25lLFxyXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxyXG4gIHN0eWxlVXJsczogW2AuL3NwbGl0LmNvbXBvbmVudC5zY3NzYF0sXHJcbiAgdGVtcGxhdGVVcmw6ICcuL3NwbGl0LmNvbXBvbmVudC5odG1sJyxcclxufSlcclxuZXhwb3J0IGNsYXNzIE10eFNwbGl0Q29tcG9uZW50IGltcGxlbWVudHMgQWZ0ZXJWaWV3SW5pdCwgT25EZXN0cm95IHtcclxuICBwcml2YXRlIF9kaXJlY3Rpb246ICdob3Jpem9udGFsJyB8ICd2ZXJ0aWNhbCcgPSAnaG9yaXpvbnRhbCc7XHJcblxyXG4gIEBJbnB1dCgpIHNldCBkaXJlY3Rpb24odjogJ2hvcml6b250YWwnIHwgJ3ZlcnRpY2FsJykge1xyXG4gICAgdGhpcy5fZGlyZWN0aW9uID0gdiA9PT0gJ3ZlcnRpY2FsJyA/ICd2ZXJ0aWNhbCcgOiAnaG9yaXpvbnRhbCc7XHJcblxyXG4gICAgdGhpcy5yZW5kZXJlci5hZGRDbGFzcyh0aGlzLmVsUmVmLm5hdGl2ZUVsZW1lbnQsIGBtdHgtc3BsaXQtJHt0aGlzLl9kaXJlY3Rpb259YCk7XHJcbiAgICB0aGlzLnJlbmRlcmVyLnJlbW92ZUNsYXNzKFxyXG4gICAgICB0aGlzLmVsUmVmLm5hdGl2ZUVsZW1lbnQsXHJcbiAgICAgIGBtdHgtc3BsaXQtJHt0aGlzLl9kaXJlY3Rpb24gPT09ICd2ZXJ0aWNhbCcgPyAnaG9yaXpvbnRhbCcgOiAndmVydGljYWwnfWBcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5idWlsZChmYWxzZSwgZmFsc2UpO1xyXG4gIH1cclxuXHJcbiAgZ2V0IGRpcmVjdGlvbigpOiAnaG9yaXpvbnRhbCcgfCAndmVydGljYWwnIHtcclxuICAgIHJldHVybiB0aGlzLl9kaXJlY3Rpb247XHJcbiAgfVxyXG5cclxuICAvLy8vXHJcblxyXG4gIHByaXZhdGUgX3VuaXQ6ICdwZXJjZW50JyB8ICdwaXhlbCcgPSAncGVyY2VudCc7XHJcblxyXG4gIEBJbnB1dCgpIHNldCB1bml0KHY6ICdwZXJjZW50JyB8ICdwaXhlbCcpIHtcclxuICAgIHRoaXMuX3VuaXQgPSB2ID09PSAncGl4ZWwnID8gJ3BpeGVsJyA6ICdwZXJjZW50JztcclxuXHJcbiAgICB0aGlzLnJlbmRlcmVyLmFkZENsYXNzKHRoaXMuZWxSZWYubmF0aXZlRWxlbWVudCwgYG10eC1zcGxpdC0ke3RoaXMuX3VuaXR9YCk7XHJcbiAgICB0aGlzLnJlbmRlcmVyLnJlbW92ZUNsYXNzKFxyXG4gICAgICB0aGlzLmVsUmVmLm5hdGl2ZUVsZW1lbnQsXHJcbiAgICAgIGBtdHgtc3BsaXQtJHt0aGlzLl91bml0ID09PSAncGl4ZWwnID8gJ3BlcmNlbnQnIDogJ3BpeGVsJ31gXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuYnVpbGQoZmFsc2UsIHRydWUpO1xyXG4gIH1cclxuXHJcbiAgZ2V0IHVuaXQoKTogJ3BlcmNlbnQnIHwgJ3BpeGVsJyB7XHJcbiAgICByZXR1cm4gdGhpcy5fdW5pdDtcclxuICB9XHJcblxyXG4gIC8vLy9cclxuXHJcbiAgcHJpdmF0ZSBfZ3V0dGVyU2l6ZSA9IDE7XHJcblxyXG4gIEBJbnB1dCgpIHNldCBndXR0ZXJTaXplKHY6IG51bWJlcikge1xyXG4gICAgdGhpcy5fZ3V0dGVyU2l6ZSA9IGdldElucHV0UG9zaXRpdmVOdW1iZXIodiwgMTEpO1xyXG5cclxuICAgIHRoaXMuYnVpbGQoZmFsc2UsIGZhbHNlKTtcclxuICB9XHJcblxyXG4gIGdldCBndXR0ZXJTaXplKCk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gdGhpcy5fZ3V0dGVyU2l6ZTtcclxuICB9XHJcblxyXG4gIC8vLy9cclxuXHJcbiAgcHJpdmF0ZSBfZ3V0dGVyU3RlcCA9IDE7XHJcblxyXG4gIEBJbnB1dCgpIHNldCBndXR0ZXJTdGVwKHY6IG51bWJlcikge1xyXG4gICAgdGhpcy5fZ3V0dGVyU3RlcCA9IGdldElucHV0UG9zaXRpdmVOdW1iZXIodiwgMSk7XHJcbiAgfVxyXG5cclxuICBnZXQgZ3V0dGVyU3RlcCgpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIHRoaXMuX2d1dHRlclN0ZXA7XHJcbiAgfVxyXG5cclxuICAvLy8vXHJcblxyXG4gIHByaXZhdGUgX3Jlc3RyaWN0TW92ZSA9IGZhbHNlO1xyXG5cclxuICBASW5wdXQoKSBzZXQgcmVzdHJpY3RNb3ZlKHY6IGJvb2xlYW4pIHtcclxuICAgIHRoaXMuX3Jlc3RyaWN0TW92ZSA9IGdldElucHV0Qm9vbGVhbih2KTtcclxuICB9XHJcblxyXG4gIGdldCByZXN0cmljdE1vdmUoKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gdGhpcy5fcmVzdHJpY3RNb3ZlO1xyXG4gIH1cclxuXHJcbiAgLy8vL1xyXG5cclxuICBwcml2YXRlIF91c2VUcmFuc2l0aW9uID0gZmFsc2U7XHJcblxyXG4gIEBJbnB1dCgpIHNldCB1c2VUcmFuc2l0aW9uKHY6IGJvb2xlYW4pIHtcclxuICAgIHRoaXMuX3VzZVRyYW5zaXRpb24gPSBnZXRJbnB1dEJvb2xlYW4odik7XHJcblxyXG4gICAgaWYgKHRoaXMuX3VzZVRyYW5zaXRpb24pIHtcclxuICAgICAgdGhpcy5yZW5kZXJlci5hZGRDbGFzcyh0aGlzLmVsUmVmLm5hdGl2ZUVsZW1lbnQsICdtdHgtc3BsaXQtdHJhbnNpdGlvbicpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5yZW5kZXJlci5yZW1vdmVDbGFzcyh0aGlzLmVsUmVmLm5hdGl2ZUVsZW1lbnQsICdtdHgtc3BsaXQtdHJhbnNpdGlvbicpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0IHVzZVRyYW5zaXRpb24oKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gdGhpcy5fdXNlVHJhbnNpdGlvbjtcclxuICB9XHJcblxyXG4gIC8vLy9cclxuXHJcbiAgcHJpdmF0ZSBfZGlzYWJsZWQgPSBmYWxzZTtcclxuXHJcbiAgQElucHV0KCkgc2V0IGRpc2FibGVkKHY6IGJvb2xlYW4pIHtcclxuICAgIHRoaXMuX2Rpc2FibGVkID0gZ2V0SW5wdXRCb29sZWFuKHYpO1xyXG5cclxuICAgIGlmICh0aGlzLl9kaXNhYmxlZCkge1xyXG4gICAgICB0aGlzLnJlbmRlcmVyLmFkZENsYXNzKHRoaXMuZWxSZWYubmF0aXZlRWxlbWVudCwgJ210eC1zcGxpdC1kaXNhYmxlZCcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5yZW5kZXJlci5yZW1vdmVDbGFzcyh0aGlzLmVsUmVmLm5hdGl2ZUVsZW1lbnQsICdtdHgtc3BsaXQtZGlzYWJsZWQnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGdldCBkaXNhYmxlZCgpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB0aGlzLl9kaXNhYmxlZDtcclxuICB9XHJcblxyXG4gIC8vLy9cclxuXHJcbiAgcHJpdmF0ZSBfZGlyOiAnbHRyJyB8ICdydGwnID0gJ2x0cic7XHJcblxyXG4gIEBJbnB1dCgpIHNldCBkaXIodjogJ2x0cicgfCAncnRsJykge1xyXG4gICAgdGhpcy5fZGlyID0gdiA9PT0gJ3J0bCcgPyAncnRsJyA6ICdsdHInO1xyXG5cclxuICAgIHRoaXMucmVuZGVyZXIuc2V0QXR0cmlidXRlKHRoaXMuZWxSZWYubmF0aXZlRWxlbWVudCwgJ2RpcicsIHRoaXMuX2Rpcik7XHJcbiAgfVxyXG5cclxuICBnZXQgZGlyKCk6ICdsdHInIHwgJ3J0bCcge1xyXG4gICAgcmV0dXJuIHRoaXMuX2RpcjtcclxuICB9XHJcblxyXG4gIC8vLy9cclxuXHJcbiAgcHJpdmF0ZSBfZ3V0dGVyRGJsQ2xpY2tEdXJhdGlvbiA9IDA7XHJcblxyXG4gIEBJbnB1dCgpIHNldCBndXR0ZXJEYmxDbGlja0R1cmF0aW9uKHY6IG51bWJlcikge1xyXG4gICAgdGhpcy5fZ3V0dGVyRGJsQ2xpY2tEdXJhdGlvbiA9IGdldElucHV0UG9zaXRpdmVOdW1iZXIodiwgMCk7XHJcbiAgfVxyXG5cclxuICBnZXQgZ3V0dGVyRGJsQ2xpY2tEdXJhdGlvbigpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIHRoaXMuX2d1dHRlckRibENsaWNrRHVyYXRpb247XHJcbiAgfVxyXG5cclxuICAvLy8vXHJcblxyXG4gIEBPdXRwdXQoKSBkcmFnU3RhcnQgPSBuZXcgRXZlbnRFbWl0dGVyPE10eFNwbGl0T3V0cHV0RGF0YT4oZmFsc2UpO1xyXG4gIEBPdXRwdXQoKSBkcmFnRW5kID0gbmV3IEV2ZW50RW1pdHRlcjxNdHhTcGxpdE91dHB1dERhdGE+KGZhbHNlKTtcclxuICBAT3V0cHV0KCkgZ3V0dGVyQ2xpY2sgPSBuZXcgRXZlbnRFbWl0dGVyPE10eFNwbGl0T3V0cHV0RGF0YT4oZmFsc2UpO1xyXG4gIEBPdXRwdXQoKSBndXR0ZXJEYmxDbGljayA9IG5ldyBFdmVudEVtaXR0ZXI8TXR4U3BsaXRPdXRwdXREYXRhPihmYWxzZSk7XHJcblxyXG4gIHByaXZhdGUgdHJhbnNpdGlvbkVuZFN1YnNjcmliZXIhOiBTdWJzY3JpYmVyPE10eFNwbGl0T3V0cHV0QXJlYVNpemVzPjtcclxuICBAT3V0cHV0KCkgZ2V0IHRyYW5zaXRpb25FbmQoKTogT2JzZXJ2YWJsZTxNdHhTcGxpdE91dHB1dEFyZWFTaXplcz4ge1xyXG4gICAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlKHN1YnNjcmliZXIgPT4gKHRoaXMudHJhbnNpdGlvbkVuZFN1YnNjcmliZXIgPSBzdWJzY3JpYmVyKSkucGlwZShcclxuICAgICAgZGVib3VuY2VUaW1lPGFueT4oMjApXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBkcmFnUHJvZ3Jlc3NTdWJqZWN0OiBTdWJqZWN0PE10eFNwbGl0T3V0cHV0RGF0YT4gPSBuZXcgU3ViamVjdCgpO1xyXG4gIGRyYWdQcm9ncmVzcyQ6IE9ic2VydmFibGU8TXR4U3BsaXRPdXRwdXREYXRhPiA9IHRoaXMuZHJhZ1Byb2dyZXNzU3ViamVjdC5hc09ic2VydmFibGUoKTtcclxuXHJcbiAgLy8vL1xyXG5cclxuICBwcml2YXRlIGlzRHJhZ2dpbmcgPSBmYWxzZTtcclxuICBwcml2YXRlIGRyYWdMaXN0ZW5lcnM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW107XHJcbiAgcHJpdmF0ZSBzbmFwc2hvdDogTXR4U3BsaXRTbmFwc2hvdCB8IG51bGwgPSBudWxsO1xyXG4gIHByaXZhdGUgc3RhcnRQb2ludDogTXR4U3BsaXRQb2ludCB8IG51bGwgPSBudWxsO1xyXG4gIHByaXZhdGUgZW5kUG9pbnQ6IE10eFNwbGl0UG9pbnQgfCBudWxsID0gbnVsbDtcclxuXHJcbiAgcHVibGljIHJlYWRvbmx5IGRpc3BsYXllZEFyZWFzOiBBcnJheTxNdHhTcGxpdEFyZWE+ID0gW107XHJcbiAgcHJpdmF0ZSByZWFkb25seSBoaWRlZEFyZWFzOiBBcnJheTxNdHhTcGxpdEFyZWE+ID0gW107XHJcblxyXG4gIEBWaWV3Q2hpbGRyZW4oJ2d1dHRlckVscycpIHByaXZhdGUgZ3V0dGVyRWxzITogUXVlcnlMaXN0PEVsZW1lbnRSZWY+O1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIHByaXZhdGUgbmdab25lOiBOZ1pvbmUsXHJcbiAgICBwcml2YXRlIGVsUmVmOiBFbGVtZW50UmVmLFxyXG4gICAgcHJpdmF0ZSBjZFJlZjogQ2hhbmdlRGV0ZWN0b3JSZWYsXHJcbiAgICBwcml2YXRlIHJlbmRlcmVyOiBSZW5kZXJlcjJcclxuICApIHtcclxuICAgIC8vIFRvIGZvcmNlIGFkZGluZyBkZWZhdWx0IGNsYXNzLCBjb3VsZCBiZSBvdmVycmlkZSBieSB1c2VyIEBJbnB1dCgpIG9yIG5vdFxyXG4gICAgdGhpcy5kaXJlY3Rpb24gPSB0aGlzLl9kaXJlY3Rpb247XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgbmdBZnRlclZpZXdJbml0KCkge1xyXG4gICAgdGhpcy5uZ1pvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4ge1xyXG4gICAgICAvLyBUbyBhdm9pZCB0cmFuc2l0aW9uIGF0IGZpcnN0IHJlbmRlcmluZ1xyXG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMucmVuZGVyZXIuYWRkQ2xhc3ModGhpcy5lbFJlZi5uYXRpdmVFbGVtZW50LCAnbXR4LXNwbGl0LWluaXQnKSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2V0TmJHdXR0ZXJzKCk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXNwbGF5ZWRBcmVhcy5sZW5ndGggPT09IDAgPyAwIDogdGhpcy5kaXNwbGF5ZWRBcmVhcy5sZW5ndGggLSAxO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFkZEFyZWEoY29tcG9uZW50OiBNdHhTcGxpdFBhbmVEaXJlY3RpdmUpOiB2b2lkIHtcclxuICAgIGNvbnN0IG5ld0FyZWE6IE10eFNwbGl0QXJlYSA9IHtcclxuICAgICAgY29tcG9uZW50LFxyXG4gICAgICBvcmRlcjogMCxcclxuICAgICAgc2l6ZTogMCxcclxuICAgICAgbWluU2l6ZTogbnVsbCxcclxuICAgICAgbWF4U2l6ZTogbnVsbCxcclxuICAgIH07XHJcblxyXG4gICAgaWYgKGNvbXBvbmVudC52aXNpYmxlID09PSB0cnVlKSB7XHJcbiAgICAgIHRoaXMuZGlzcGxheWVkQXJlYXMucHVzaChuZXdBcmVhKTtcclxuXHJcbiAgICAgIHRoaXMuYnVpbGQodHJ1ZSwgdHJ1ZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLmhpZGVkQXJlYXMucHVzaChuZXdBcmVhKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHB1YmxpYyByZW1vdmVBcmVhKGNvbXBvbmVudDogTXR4U3BsaXRQYW5lRGlyZWN0aXZlKTogdm9pZCB7XHJcbiAgICBpZiAodGhpcy5kaXNwbGF5ZWRBcmVhcy5zb21lKGEgPT4gYS5jb21wb25lbnQgPT09IGNvbXBvbmVudCkpIHtcclxuICAgICAgY29uc3QgYXJlYSA9IHRoaXMuZGlzcGxheWVkQXJlYXMuZmluZChhID0+IGEuY29tcG9uZW50ID09PSBjb21wb25lbnQpIGFzIE10eFNwbGl0QXJlYTtcclxuICAgICAgdGhpcy5kaXNwbGF5ZWRBcmVhcy5zcGxpY2UodGhpcy5kaXNwbGF5ZWRBcmVhcy5pbmRleE9mKGFyZWEpLCAxKTtcclxuXHJcbiAgICAgIHRoaXMuYnVpbGQodHJ1ZSwgdHJ1ZSk7XHJcbiAgICB9IGVsc2UgaWYgKHRoaXMuaGlkZWRBcmVhcy5zb21lKGEgPT4gYS5jb21wb25lbnQgPT09IGNvbXBvbmVudCkpIHtcclxuICAgICAgY29uc3QgYXJlYSA9IHRoaXMuaGlkZWRBcmVhcy5maW5kKGEgPT4gYS5jb21wb25lbnQgPT09IGNvbXBvbmVudCkgYXMgTXR4U3BsaXRBcmVhO1xyXG4gICAgICB0aGlzLmhpZGVkQXJlYXMuc3BsaWNlKHRoaXMuaGlkZWRBcmVhcy5pbmRleE9mKGFyZWEpLCAxKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHB1YmxpYyB1cGRhdGVBcmVhKFxyXG4gICAgY29tcG9uZW50OiBNdHhTcGxpdFBhbmVEaXJlY3RpdmUsXHJcbiAgICByZXNldE9yZGVyczogYm9vbGVhbixcclxuICAgIHJlc2V0U2l6ZXM6IGJvb2xlYW5cclxuICApOiB2b2lkIHtcclxuICAgIGlmIChjb21wb25lbnQudmlzaWJsZSA9PT0gdHJ1ZSkge1xyXG4gICAgICB0aGlzLmJ1aWxkKHJlc2V0T3JkZXJzLCByZXNldFNpemVzKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHB1YmxpYyBzaG93QXJlYShjb21wb25lbnQ6IE10eFNwbGl0UGFuZURpcmVjdGl2ZSk6IHZvaWQge1xyXG4gICAgY29uc3QgYXJlYSA9IHRoaXMuaGlkZWRBcmVhcy5maW5kKGEgPT4gYS5jb21wb25lbnQgPT09IGNvbXBvbmVudCk7XHJcbiAgICBpZiAoYXJlYSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBhcmVhcyA9IHRoaXMuaGlkZWRBcmVhcy5zcGxpY2UodGhpcy5oaWRlZEFyZWFzLmluZGV4T2YoYXJlYSksIDEpO1xyXG4gICAgdGhpcy5kaXNwbGF5ZWRBcmVhcy5wdXNoKC4uLmFyZWFzKTtcclxuXHJcbiAgICB0aGlzLmJ1aWxkKHRydWUsIHRydWUpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGhpZGVBcmVhKGNvbXA6IE10eFNwbGl0UGFuZURpcmVjdGl2ZSk6IHZvaWQge1xyXG4gICAgY29uc3QgYXJlYSA9IHRoaXMuZGlzcGxheWVkQXJlYXMuZmluZChhID0+IGEuY29tcG9uZW50ID09PSBjb21wKTtcclxuICAgIGlmIChhcmVhID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGFyZWFzID0gdGhpcy5kaXNwbGF5ZWRBcmVhcy5zcGxpY2UodGhpcy5kaXNwbGF5ZWRBcmVhcy5pbmRleE9mKGFyZWEpLCAxKTtcclxuICAgIGFyZWFzLmZvckVhY2goX2FyZWEgPT4ge1xyXG4gICAgICBfYXJlYS5vcmRlciA9IDA7XHJcbiAgICAgIF9hcmVhLnNpemUgPSAwO1xyXG4gICAgfSk7XHJcbiAgICB0aGlzLmhpZGVkQXJlYXMucHVzaCguLi5hcmVhcyk7XHJcblxyXG4gICAgdGhpcy5idWlsZCh0cnVlLCB0cnVlKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBnZXRWaXNpYmxlQXJlYVNpemVzKCk6IE10eFNwbGl0T3V0cHV0QXJlYVNpemVzIHtcclxuICAgIHJldHVybiB0aGlzLmRpc3BsYXllZEFyZWFzLm1hcChhID0+IChhLnNpemUgPT09IG51bGwgPyAnKicgOiBhLnNpemUpKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBzZXRWaXNpYmxlQXJlYVNpemVzKHNpemVzOiBNdHhTcGxpdE91dHB1dEFyZWFTaXplcyk6IGJvb2xlYW4ge1xyXG4gICAgaWYgKHNpemVzLmxlbmd0aCAhPT0gdGhpcy5kaXNwbGF5ZWRBcmVhcy5sZW5ndGgpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGZvcm1hdGVkU2l6ZXMgPSBzaXplcy5tYXAocyA9PiBnZXRJbnB1dFBvc2l0aXZlTnVtYmVyKHMsIG51bGwpKSBhcyBudW1iZXJbXTtcclxuICAgIGNvbnN0IGlzVmFsaWQgPSBpc1VzZXJTaXplc1ZhbGlkKHRoaXMudW5pdCwgZm9ybWF0ZWRTaXplcyk7XHJcblxyXG4gICAgaWYgKGlzVmFsaWQgPT09IGZhbHNlKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBAdHMtaWdub3JlXHJcbiAgICB0aGlzLmRpc3BsYXllZEFyZWFzLmZvckVhY2goKGFyZWEsIGkpID0+IChhcmVhLmNvbXBvbmVudC5fc2l6ZSA9IGZvcm1hdGVkU2l6ZXNbaV0pKTtcclxuXHJcbiAgICB0aGlzLmJ1aWxkKGZhbHNlLCB0cnVlKTtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBidWlsZChyZXNldE9yZGVyczogYm9vbGVhbiwgcmVzZXRTaXplczogYm9vbGVhbik6IHZvaWQge1xyXG4gICAgdGhpcy5zdG9wRHJhZ2dpbmcoKTtcclxuXHJcbiAgICAvLyDCpCBBUkVBUyBPUkRFUlxyXG5cclxuICAgIGlmIChyZXNldE9yZGVycyA9PT0gdHJ1ZSkge1xyXG4gICAgICAvLyBJZiB1c2VyIHByb3ZpZGVkICdvcmRlcicgZm9yIGVhY2ggYXJlYSwgdXNlIGl0IHRvIHNvcnQgdGhlbS5cclxuICAgICAgaWYgKHRoaXMuZGlzcGxheWVkQXJlYXMuZXZlcnkoYSA9PiBhLmNvbXBvbmVudC5vcmRlciAhPT0gbnVsbCkpIHtcclxuICAgICAgICB0aGlzLmRpc3BsYXllZEFyZWFzLnNvcnQoXHJcbiAgICAgICAgICAoYSwgYikgPT4gKChhLmNvbXBvbmVudC5vcmRlciBhcyBudW1iZXIpIC0gKGIuY29tcG9uZW50Lm9yZGVyIGFzIG51bWJlcikpIGFzIG51bWJlclxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFRoZW4gc2V0IHJlYWwgb3JkZXIgd2l0aCBtdWx0aXBsZXMgb2YgMiwgbnVtYmVycyBiZXR3ZWVuIHdpbGwgYmUgdXNlZCBieSBndXR0ZXJzLlxyXG4gICAgICB0aGlzLmRpc3BsYXllZEFyZWFzLmZvckVhY2goKGFyZWEsIGkpID0+IHtcclxuICAgICAgICBhcmVhLm9yZGVyID0gaSAqIDI7XHJcbiAgICAgICAgYXJlYS5jb21wb25lbnQuc2V0U3R5bGVPcmRlcihhcmVhLm9yZGVyKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gwqQgQVJFQVMgU0laRVxyXG5cclxuICAgIGlmIChyZXNldFNpemVzID09PSB0cnVlKSB7XHJcbiAgICAgIGNvbnN0IHVzZVVzZXJTaXplcyA9IGlzVXNlclNpemVzVmFsaWQoXHJcbiAgICAgICAgdGhpcy51bml0LFxyXG4gICAgICAgIHRoaXMuZGlzcGxheWVkQXJlYXMubWFwKGEgPT4gYS5jb21wb25lbnQuc2l6ZSkgYXMgbnVtYmVyW11cclxuICAgICAgKTtcclxuXHJcbiAgICAgIHN3aXRjaCAodGhpcy51bml0KSB7XHJcbiAgICAgICAgY2FzZSAncGVyY2VudCc6IHtcclxuICAgICAgICAgIGNvbnN0IGRlZmF1bHRTaXplID0gMTAwIC8gdGhpcy5kaXNwbGF5ZWRBcmVhcy5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgdGhpcy5kaXNwbGF5ZWRBcmVhcy5mb3JFYWNoKGFyZWEgPT4ge1xyXG4gICAgICAgICAgICBhcmVhLnNpemUgPSB1c2VVc2VyU2l6ZXMgPyAoYXJlYS5jb21wb25lbnQuc2l6ZSBhcyBudW1iZXIpIDogZGVmYXVsdFNpemU7XHJcbiAgICAgICAgICAgIGFyZWEubWluU2l6ZSA9IGdldEFyZWFNaW5TaXplKGFyZWEpO1xyXG4gICAgICAgICAgICBhcmVhLm1heFNpemUgPSBnZXRBcmVhTWF4U2l6ZShhcmVhKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhc2UgJ3BpeGVsJzoge1xyXG4gICAgICAgICAgaWYgKHVzZVVzZXJTaXplcykge1xyXG4gICAgICAgICAgICB0aGlzLmRpc3BsYXllZEFyZWFzLmZvckVhY2goYXJlYSA9PiB7XHJcbiAgICAgICAgICAgICAgYXJlYS5zaXplID0gYXJlYS5jb21wb25lbnQuc2l6ZTtcclxuICAgICAgICAgICAgICBhcmVhLm1pblNpemUgPSBnZXRBcmVhTWluU2l6ZShhcmVhKTtcclxuICAgICAgICAgICAgICBhcmVhLm1heFNpemUgPSBnZXRBcmVhTWF4U2l6ZShhcmVhKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zdCB3aWxkY2FyZFNpemVBcmVhcyA9IHRoaXMuZGlzcGxheWVkQXJlYXMuZmlsdGVyKGEgPT4gYS5jb21wb25lbnQuc2l6ZSA9PT0gbnVsbCk7XHJcblxyXG4gICAgICAgICAgICAvLyBObyB3aWxkY2FyZCBhcmVhID4gTmVlZCB0byBzZWxlY3Qgb25lIGFyYml0cmFyaWx5ID4gZmlyc3RcclxuICAgICAgICAgICAgaWYgKHdpbGRjYXJkU2l6ZUFyZWFzLmxlbmd0aCA9PT0gMCAmJiB0aGlzLmRpc3BsYXllZEFyZWFzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICB0aGlzLmRpc3BsYXllZEFyZWFzLmZvckVhY2goKGFyZWEsIGkpID0+IHtcclxuICAgICAgICAgICAgICAgIGFyZWEuc2l6ZSA9IGkgPT09IDAgPyBudWxsIDogYXJlYS5jb21wb25lbnQuc2l6ZTtcclxuICAgICAgICAgICAgICAgIGFyZWEubWluU2l6ZSA9IGkgPT09IDAgPyBudWxsIDogZ2V0QXJlYU1pblNpemUoYXJlYSk7XHJcbiAgICAgICAgICAgICAgICBhcmVhLm1heFNpemUgPSBpID09PSAwID8gbnVsbCA6IGdldEFyZWFNYXhTaXplKGFyZWEpO1xyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIE1vcmUgdGhhbiBvbmUgd2lsZGNhcmQgYXJlYSA+IE5lZWQgdG8ga2VlcCBvbmx5IG9uZSBhcmJpdHJhcmx5ID4gZmlyc3RcclxuICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBvbmUtbGluZVxyXG4gICAgICAgICAgICBlbHNlIGlmICh3aWxkY2FyZFNpemVBcmVhcy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgICAgbGV0IGFscmVhZHlHb3RPbmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICB0aGlzLmRpc3BsYXllZEFyZWFzLmZvckVhY2goYXJlYSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYXJlYS5jb21wb25lbnQuc2l6ZSA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICBpZiAoYWxyZWFkeUdvdE9uZSA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBhcmVhLnNpemUgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGFyZWEubWluU2l6ZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgYXJlYS5tYXhTaXplID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBhbHJlYWR5R290T25lID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBhcmVhLnNpemUgPSAxMDA7XHJcbiAgICAgICAgICAgICAgICAgICAgYXJlYS5taW5TaXplID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBhcmVhLm1heFNpemUgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICBhcmVhLnNpemUgPSBhcmVhLmNvbXBvbmVudC5zaXplO1xyXG4gICAgICAgICAgICAgICAgICBhcmVhLm1pblNpemUgPSBnZXRBcmVhTWluU2l6ZShhcmVhKTtcclxuICAgICAgICAgICAgICAgICAgYXJlYS5tYXhTaXplID0gZ2V0QXJlYU1heFNpemUoYXJlYSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMucmVmcmVzaFN0eWxlU2l6ZXMoKTtcclxuICAgIHRoaXMuY2RSZWYubWFya0ZvckNoZWNrKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlZnJlc2hTdHlsZVNpemVzKCk6IHZvaWQge1xyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgLy8gUEVSQ0VOVCBNT0RFXHJcbiAgICBpZiAodGhpcy51bml0ID09PSAncGVyY2VudCcpIHtcclxuICAgICAgLy8gT25seSBvbmUgYXJlYSA+IGZsZXgtYmFzaXMgMTAwJVxyXG4gICAgICBpZiAodGhpcy5kaXNwbGF5ZWRBcmVhcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICB0aGlzLmRpc3BsYXllZEFyZWFzWzBdLmNvbXBvbmVudC5zZXRTdHlsZUZsZXgoMCwgMCwgYDEwMCVgLCBmYWxzZSwgZmFsc2UpO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIE11bHRpcGxlIGFyZWFzID4gdXNlIGVhY2ggcGVyY2VudCBiYXNpc1xyXG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG9uZS1saW5lXHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIGNvbnN0IHN1bUd1dHRlclNpemUgPSB0aGlzLmdldE5iR3V0dGVycygpICogdGhpcy5ndXR0ZXJTaXplO1xyXG5cclxuICAgICAgICB0aGlzLmRpc3BsYXllZEFyZWFzLmZvckVhY2goYXJlYSA9PiB7XHJcbiAgICAgICAgICBhcmVhLmNvbXBvbmVudC5zZXRTdHlsZUZsZXgoXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgIGBjYWxjKCAke2FyZWEuc2l6ZX0lIC0gJHsoKGFyZWEuc2l6ZSBhcyBudW1iZXIpIC8gMTAwKSAqIHN1bUd1dHRlclNpemV9cHggKWAsXHJcbiAgICAgICAgICAgIGFyZWEubWluU2l6ZSAhPT0gbnVsbCAmJiBhcmVhLm1pblNpemUgPT09IGFyZWEuc2l6ZSA/IHRydWUgOiBmYWxzZSxcclxuICAgICAgICAgICAgYXJlYS5tYXhTaXplICE9PSBudWxsICYmIGFyZWEubWF4U2l6ZSA9PT0gYXJlYS5zaXplID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXHJcbiAgICAvLyBQSVhFTCBNT0RFXHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG9uZS1saW5lXHJcbiAgICBlbHNlIGlmICh0aGlzLnVuaXQgPT09ICdwaXhlbCcpIHtcclxuICAgICAgdGhpcy5kaXNwbGF5ZWRBcmVhcy5mb3JFYWNoKGFyZWEgPT4ge1xyXG4gICAgICAgIC8vIEFyZWEgd2l0aCB3aWxkY2FyZCBzaXplXHJcbiAgICAgICAgaWYgKGFyZWEuc2l6ZSA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgaWYgKHRoaXMuZGlzcGxheWVkQXJlYXMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgIGFyZWEuY29tcG9uZW50LnNldFN0eWxlRmxleCgxLCAxLCBgMTAwJWAsIGZhbHNlLCBmYWxzZSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBhcmVhLmNvbXBvbmVudC5zZXRTdHlsZUZsZXgoMSwgMSwgYGF1dG9gLCBmYWxzZSwgZmFsc2UpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBBcmVhIHdpdGggcGl4ZWwgc2l6ZVxyXG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogb25lLWxpbmVcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgIC8vIE9ubHkgb25lIGFyZWEgPiBmbGV4LWJhc2lzIDEwMCVcclxuICAgICAgICAgIGlmICh0aGlzLmRpc3BsYXllZEFyZWFzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICBhcmVhLmNvbXBvbmVudC5zZXRTdHlsZUZsZXgoMCwgMCwgYDEwMCVgLCBmYWxzZSwgZmFsc2UpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gTXVsdGlwbGUgYXJlYXMgPiB1c2UgZWFjaCBwaXhlbCBiYXNpc1xyXG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBvbmUtbGluZVxyXG4gICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGFyZWEuY29tcG9uZW50LnNldFN0eWxlRmxleChcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgYCR7YXJlYS5zaXplfXB4YCxcclxuICAgICAgICAgICAgICBhcmVhLm1pblNpemUgIT09IG51bGwgJiYgYXJlYS5taW5TaXplID09PSBhcmVhLnNpemUgPyB0cnVlIDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgYXJlYS5tYXhTaXplICE9PSBudWxsICYmIGFyZWEubWF4U2l6ZSA9PT0gYXJlYS5zaXplID8gdHJ1ZSA6IGZhbHNlXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIF9jbGlja1RpbWVvdXQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xyXG5cclxuICBwdWJsaWMgY2xpY2tHdXR0ZXIoZXZlbnQ6IE1vdXNlRXZlbnQgfCBUb3VjaEV2ZW50LCBndXR0ZXJOdW06IG51bWJlcik6IHZvaWQge1xyXG4gICAgY29uc3QgdGVtcFBvaW50ID0gZ2V0UG9pbnRGcm9tRXZlbnQoZXZlbnQpIGFzIE10eFNwbGl0UG9pbnQ7XHJcblxyXG4gICAgLy8gQmUgc3VyZSBtb3VzZXVwL3RvdWNoZW5kIGhhcHBlbmVkIGF0IHNhbWUgcG9pbnQgYXMgbW91c2Vkb3duL3RvdWNoc3RhcnQgdG8gdHJpZ2dlciBjbGljay9kYmxjbGlja1xyXG4gICAgaWYgKHRoaXMuc3RhcnRQb2ludCAmJiB0aGlzLnN0YXJ0UG9pbnQueCA9PT0gdGVtcFBvaW50LnggJiYgdGhpcy5zdGFydFBvaW50LnkgPT09IHRlbXBQb2ludC55KSB7XHJcbiAgICAgIC8vIElmIHRpbWVvdXQgaW4gcHJvZ3Jlc3MgYW5kIG5ldyBjbGljayA+IGNsZWFyVGltZW91dCAmIGRibENsaWNrRXZlbnRcclxuICAgICAgaWYgKHRoaXMuX2NsaWNrVGltZW91dCAhPT0gbnVsbCkge1xyXG4gICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5fY2xpY2tUaW1lb3V0KTtcclxuICAgICAgICB0aGlzLl9jbGlja1RpbWVvdXQgPSBudWxsO1xyXG4gICAgICAgIHRoaXMubm90aWZ5KCdkYmxjbGljaycsIGd1dHRlck51bSk7XHJcbiAgICAgICAgdGhpcy5zdG9wRHJhZ2dpbmcoKTtcclxuICAgICAgfVxyXG4gICAgICAvLyBFbHNlIHN0YXJ0IHRpbWVvdXQgdG8gY2FsbCBjbGlja0V2ZW50IGF0IGVuZFxyXG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG9uZS1saW5lXHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIHRoaXMuX2NsaWNrVGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgIHRoaXMuX2NsaWNrVGltZW91dCA9IG51bGw7XHJcbiAgICAgICAgICB0aGlzLm5vdGlmeSgnY2xpY2snLCBndXR0ZXJOdW0pO1xyXG4gICAgICAgICAgdGhpcy5zdG9wRHJhZ2dpbmcoKTtcclxuICAgICAgICB9LCB0aGlzLmd1dHRlckRibENsaWNrRHVyYXRpb24pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgc3RhcnREcmFnZ2luZyhcclxuICAgIGV2ZW50OiBNb3VzZUV2ZW50IHwgVG91Y2hFdmVudCxcclxuICAgIGd1dHRlck9yZGVyOiBudW1iZXIsXHJcbiAgICBndXR0ZXJOdW06IG51bWJlclxyXG4gICk6IHZvaWQge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgIHRoaXMuc3RhcnRQb2ludCA9IGdldFBvaW50RnJvbUV2ZW50KGV2ZW50KTtcclxuICAgIGlmICh0aGlzLnN0YXJ0UG9pbnQgPT09IG51bGwgfHwgdGhpcy5kaXNhYmxlZCA9PT0gdHJ1ZSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5zbmFwc2hvdCA9IHtcclxuICAgICAgZ3V0dGVyTnVtLFxyXG4gICAgICBsYXN0U3RlcHBlZE9mZnNldDogMCxcclxuICAgICAgYWxsQXJlYXNTaXplUGl4ZWw6XHJcbiAgICAgICAgZ2V0RWxlbWVudFBpeGVsU2l6ZSh0aGlzLmVsUmVmLCB0aGlzLmRpcmVjdGlvbikgLSB0aGlzLmdldE5iR3V0dGVycygpICogdGhpcy5ndXR0ZXJTaXplLFxyXG4gICAgICBhbGxJbnZvbHZlZEFyZWFzU2l6ZVBlcmNlbnQ6IDEwMCxcclxuICAgICAgYXJlYXNCZWZvcmVHdXR0ZXI6IFtdLFxyXG4gICAgICBhcmVhc0FmdGVyR3V0dGVyOiBbXSxcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5kaXNwbGF5ZWRBcmVhcy5mb3JFYWNoKGFyZWEgPT4ge1xyXG4gICAgICBjb25zdCBhcmVhU25hcHNob3Q6IE10eFNwbGl0QXJlYVNuYXBzaG90ID0ge1xyXG4gICAgICAgIGFyZWEsXHJcbiAgICAgICAgc2l6ZVBpeGVsQXRTdGFydDogZ2V0RWxlbWVudFBpeGVsU2l6ZShhcmVhLmNvbXBvbmVudC5lbFJlZiwgdGhpcy5kaXJlY3Rpb24pLFxyXG4gICAgICAgIHNpemVQZXJjZW50QXRTdGFydDogKHRoaXMudW5pdCA9PT0gJ3BlcmNlbnQnID8gYXJlYS5zaXplIDogLTEpIGFzIG51bWJlciwgLy8gSWYgcGl4ZWwgbW9kZSwgYW55d2F5LCB3aWxsIG5vdCBiZSB1c2VkLlxyXG4gICAgICB9O1xyXG5cclxuICAgICAgaWYgKGFyZWEub3JkZXIgPCBndXR0ZXJPcmRlcikge1xyXG4gICAgICAgIGlmICh0aGlzLnJlc3RyaWN0TW92ZSA9PT0gdHJ1ZSkge1xyXG4gICAgICAgICAgKHRoaXMuc25hcHNob3QgYXMgTXR4U3BsaXRTbmFwc2hvdCkuYXJlYXNCZWZvcmVHdXR0ZXIgPSBbYXJlYVNuYXBzaG90XTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgKHRoaXMuc25hcHNob3QgYXMgTXR4U3BsaXRTbmFwc2hvdCkuYXJlYXNCZWZvcmVHdXR0ZXIudW5zaGlmdChhcmVhU25hcHNob3QpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIGlmIChhcmVhLm9yZGVyID4gZ3V0dGVyT3JkZXIpIHtcclxuICAgICAgICBpZiAodGhpcy5yZXN0cmljdE1vdmUgPT09IHRydWUpIHtcclxuICAgICAgICAgIGlmICgodGhpcy5zbmFwc2hvdCBhcyBNdHhTcGxpdFNuYXBzaG90KS5hcmVhc0FmdGVyR3V0dGVyLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAodGhpcy5zbmFwc2hvdCBhcyBNdHhTcGxpdFNuYXBzaG90KS5hcmVhc0FmdGVyR3V0dGVyID0gW2FyZWFTbmFwc2hvdF07XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICh0aGlzLnNuYXBzaG90IGFzIE10eFNwbGl0U25hcHNob3QpLmFyZWFzQWZ0ZXJHdXR0ZXIucHVzaChhcmVhU25hcHNob3QpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5zbmFwc2hvdC5hbGxJbnZvbHZlZEFyZWFzU2l6ZVBlcmNlbnQgPSBbXHJcbiAgICAgIC4uLnRoaXMuc25hcHNob3QuYXJlYXNCZWZvcmVHdXR0ZXIsXHJcbiAgICAgIC4uLnRoaXMuc25hcHNob3QuYXJlYXNBZnRlckd1dHRlcixcclxuICAgIF0ucmVkdWNlKCh0LCBhKSA9PiB0ICsgYS5zaXplUGVyY2VudEF0U3RhcnQsIDApO1xyXG5cclxuICAgIGlmIChcclxuICAgICAgdGhpcy5zbmFwc2hvdC5hcmVhc0JlZm9yZUd1dHRlci5sZW5ndGggPT09IDAgfHxcclxuICAgICAgdGhpcy5zbmFwc2hvdC5hcmVhc0FmdGVyR3V0dGVyLmxlbmd0aCA9PT0gMFxyXG4gICAgKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmRyYWdMaXN0ZW5lcnMucHVzaChcclxuICAgICAgdGhpcy5yZW5kZXJlci5saXN0ZW4oJ2RvY3VtZW50JywgJ21vdXNldXAnLCB0aGlzLnN0b3BEcmFnZ2luZy5iaW5kKHRoaXMpKVxyXG4gICAgKTtcclxuICAgIHRoaXMuZHJhZ0xpc3RlbmVycy5wdXNoKFxyXG4gICAgICB0aGlzLnJlbmRlcmVyLmxpc3RlbignZG9jdW1lbnQnLCAndG91Y2hlbmQnLCB0aGlzLnN0b3BEcmFnZ2luZy5iaW5kKHRoaXMpKVxyXG4gICAgKTtcclxuICAgIHRoaXMuZHJhZ0xpc3RlbmVycy5wdXNoKFxyXG4gICAgICB0aGlzLnJlbmRlcmVyLmxpc3RlbignZG9jdW1lbnQnLCAndG91Y2hjYW5jZWwnLCB0aGlzLnN0b3BEcmFnZ2luZy5iaW5kKHRoaXMpKVxyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLm5nWm9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB7XHJcbiAgICAgIHRoaXMuZHJhZ0xpc3RlbmVycy5wdXNoKFxyXG4gICAgICAgIHRoaXMucmVuZGVyZXIubGlzdGVuKCdkb2N1bWVudCcsICdtb3VzZW1vdmUnLCB0aGlzLmRyYWdFdmVudC5iaW5kKHRoaXMpKVxyXG4gICAgICApO1xyXG4gICAgICB0aGlzLmRyYWdMaXN0ZW5lcnMucHVzaChcclxuICAgICAgICB0aGlzLnJlbmRlcmVyLmxpc3RlbignZG9jdW1lbnQnLCAndG91Y2htb3ZlJywgdGhpcy5kcmFnRXZlbnQuYmluZCh0aGlzKSlcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuZGlzcGxheWVkQXJlYXMuZm9yRWFjaChhcmVhID0+IGFyZWEuY29tcG9uZW50LmxvY2tFdmVudHMoKSk7XHJcblxyXG4gICAgdGhpcy5pc0RyYWdnaW5nID0gdHJ1ZTtcclxuICAgIHRoaXMucmVuZGVyZXIuYWRkQ2xhc3ModGhpcy5lbFJlZi5uYXRpdmVFbGVtZW50LCAnbXR4LWRyYWdnaW5nJyk7XHJcbiAgICB0aGlzLnJlbmRlcmVyLmFkZENsYXNzKFxyXG4gICAgICB0aGlzLmd1dHRlckVscy50b0FycmF5KClbdGhpcy5zbmFwc2hvdC5ndXR0ZXJOdW0gLSAxXS5uYXRpdmVFbGVtZW50LFxyXG4gICAgICAnbXR4LWRyYWdnZWQnXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMubm90aWZ5KCdzdGFydCcsIHRoaXMuc25hcHNob3QuZ3V0dGVyTnVtKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZHJhZ0V2ZW50KGV2ZW50OiBNb3VzZUV2ZW50IHwgVG91Y2hFdmVudCk6IHZvaWQge1xyXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cclxuICAgIGlmICh0aGlzLl9jbGlja1RpbWVvdXQgIT09IG51bGwpIHtcclxuICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLl9jbGlja1RpbWVvdXQpO1xyXG4gICAgICB0aGlzLl9jbGlja1RpbWVvdXQgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLmlzRHJhZ2dpbmcgPT09IGZhbHNlKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmVuZFBvaW50ID0gZ2V0UG9pbnRGcm9tRXZlbnQoZXZlbnQpO1xyXG4gICAgaWYgKHRoaXMuZW5kUG9pbnQgPT09IG51bGwpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENhbGN1bGF0ZSBzdGVwcGVkT2Zmc2V0XHJcblxyXG4gICAgbGV0IG9mZnNldCA9XHJcbiAgICAgIHRoaXMuZGlyZWN0aW9uID09PSAnaG9yaXpvbnRhbCdcclxuICAgICAgICA/ICh0aGlzLnN0YXJ0UG9pbnQgYXMgTXR4U3BsaXRQb2ludCkueCAtIHRoaXMuZW5kUG9pbnQueFxyXG4gICAgICAgIDogKHRoaXMuc3RhcnRQb2ludCBhcyBNdHhTcGxpdFBvaW50KS55IC0gdGhpcy5lbmRQb2ludC55O1xyXG4gICAgaWYgKHRoaXMuZGlyID09PSAncnRsJykge1xyXG4gICAgICBvZmZzZXQgPSAtb2Zmc2V0O1xyXG4gICAgfVxyXG4gICAgY29uc3Qgc3RlcHBlZE9mZnNldCA9IE1hdGgucm91bmQob2Zmc2V0IC8gdGhpcy5ndXR0ZXJTdGVwKSAqIHRoaXMuZ3V0dGVyU3RlcDtcclxuXHJcbiAgICBpZiAoc3RlcHBlZE9mZnNldCA9PT0gKHRoaXMuc25hcHNob3QgYXMgTXR4U3BsaXRTbmFwc2hvdCkubGFzdFN0ZXBwZWRPZmZzZXQpIHtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgICh0aGlzLnNuYXBzaG90IGFzIE10eFNwbGl0U25hcHNob3QpLmxhc3RTdGVwcGVkT2Zmc2V0ID0gc3RlcHBlZE9mZnNldDtcclxuXHJcbiAgICAvLyBOZWVkIHRvIGtub3cgaWYgZWFjaCBndXR0ZXIgc2lkZSBhcmVhcyBjb3VsZCByZWFjdHMgdG8gc3RlcHBlZE9mZnNldFxyXG5cclxuICAgIGxldCBhcmVhc0JlZm9yZSA9IGdldEd1dHRlclNpZGVBYnNvcnB0aW9uQ2FwYWNpdHkoXHJcbiAgICAgIHRoaXMudW5pdCxcclxuICAgICAgKHRoaXMuc25hcHNob3QgYXMgTXR4U3BsaXRTbmFwc2hvdCkuYXJlYXNCZWZvcmVHdXR0ZXIsXHJcbiAgICAgIC1zdGVwcGVkT2Zmc2V0LFxyXG4gICAgICAodGhpcy5zbmFwc2hvdCBhcyBNdHhTcGxpdFNuYXBzaG90KS5hbGxBcmVhc1NpemVQaXhlbFxyXG4gICAgKTtcclxuICAgIGxldCBhcmVhc0FmdGVyID0gZ2V0R3V0dGVyU2lkZUFic29ycHRpb25DYXBhY2l0eShcclxuICAgICAgdGhpcy51bml0LFxyXG4gICAgICAodGhpcy5zbmFwc2hvdCBhcyBNdHhTcGxpdFNuYXBzaG90KS5hcmVhc0FmdGVyR3V0dGVyLFxyXG4gICAgICBzdGVwcGVkT2Zmc2V0LFxyXG4gICAgICAodGhpcy5zbmFwc2hvdCBhcyBNdHhTcGxpdFNuYXBzaG90KS5hbGxBcmVhc1NpemVQaXhlbFxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBFYWNoIGd1dHRlciBzaWRlIGFyZWFzIGNhbid0IGFic29yYiBhbGwgb2Zmc2V0XHJcbiAgICBpZiAoYXJlYXNCZWZvcmUucmVtYWluICE9PSAwICYmIGFyZWFzQWZ0ZXIucmVtYWluICE9PSAwKSB7XHJcbiAgICAgIGlmIChNYXRoLmFicyhhcmVhc0JlZm9yZS5yZW1haW4pID09PSBNYXRoLmFicyhhcmVhc0FmdGVyLnJlbWFpbikpIHtcclxuICAgICAgfSBlbHNlIGlmIChNYXRoLmFicyhhcmVhc0JlZm9yZS5yZW1haW4pID4gTWF0aC5hYnMoYXJlYXNBZnRlci5yZW1haW4pKSB7XHJcbiAgICAgICAgYXJlYXNBZnRlciA9IGdldEd1dHRlclNpZGVBYnNvcnB0aW9uQ2FwYWNpdHkoXHJcbiAgICAgICAgICB0aGlzLnVuaXQsXHJcbiAgICAgICAgICAodGhpcy5zbmFwc2hvdCBhcyBNdHhTcGxpdFNuYXBzaG90KS5hcmVhc0FmdGVyR3V0dGVyLFxyXG4gICAgICAgICAgc3RlcHBlZE9mZnNldCArIGFyZWFzQmVmb3JlLnJlbWFpbixcclxuICAgICAgICAgICh0aGlzLnNuYXBzaG90IGFzIE10eFNwbGl0U25hcHNob3QpLmFsbEFyZWFzU2l6ZVBpeGVsXHJcbiAgICAgICAgKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBhcmVhc0JlZm9yZSA9IGdldEd1dHRlclNpZGVBYnNvcnB0aW9uQ2FwYWNpdHkoXHJcbiAgICAgICAgICB0aGlzLnVuaXQsXHJcbiAgICAgICAgICAodGhpcy5zbmFwc2hvdCBhcyBNdHhTcGxpdFNuYXBzaG90KS5hcmVhc0JlZm9yZUd1dHRlcixcclxuICAgICAgICAgIC0oc3RlcHBlZE9mZnNldCAtIGFyZWFzQWZ0ZXIucmVtYWluKSxcclxuICAgICAgICAgICh0aGlzLnNuYXBzaG90IGFzIE10eFNwbGl0U25hcHNob3QpLmFsbEFyZWFzU2l6ZVBpeGVsXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gQXJlYXMgYmVmb3JlIGd1dHRlciBjYW4ndCBhYnNvcmJzIGFsbCBvZmZzZXQgPiBuZWVkIHRvIHJlY2FsY3VsYXRlIHNpemVzIGZvciBhcmVhcyBhZnRlciBndXR0ZXIuXHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG9uZS1saW5lXHJcbiAgICBlbHNlIGlmIChhcmVhc0JlZm9yZS5yZW1haW4gIT09IDApIHtcclxuICAgICAgYXJlYXNBZnRlciA9IGdldEd1dHRlclNpZGVBYnNvcnB0aW9uQ2FwYWNpdHkoXHJcbiAgICAgICAgdGhpcy51bml0LFxyXG4gICAgICAgICh0aGlzLnNuYXBzaG90IGFzIE10eFNwbGl0U25hcHNob3QpLmFyZWFzQWZ0ZXJHdXR0ZXIsXHJcbiAgICAgICAgc3RlcHBlZE9mZnNldCArIGFyZWFzQmVmb3JlLnJlbWFpbixcclxuICAgICAgICAodGhpcy5zbmFwc2hvdCBhcyBNdHhTcGxpdFNuYXBzaG90KS5hbGxBcmVhc1NpemVQaXhlbFxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gICAgLy8gQXJlYXMgYWZ0ZXIgZ3V0dGVyIGNhbid0IGFic29yYnMgYWxsIG9mZnNldCA+IG5lZWQgdG8gcmVjYWxjdWxhdGUgc2l6ZXMgZm9yIGFyZWFzIGJlZm9yZSBndXR0ZXIuXHJcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG9uZS1saW5lXHJcbiAgICBlbHNlIGlmIChhcmVhc0FmdGVyLnJlbWFpbiAhPT0gMCkge1xyXG4gICAgICBhcmVhc0JlZm9yZSA9IGdldEd1dHRlclNpZGVBYnNvcnB0aW9uQ2FwYWNpdHkoXHJcbiAgICAgICAgdGhpcy51bml0LFxyXG4gICAgICAgICh0aGlzLnNuYXBzaG90IGFzIE10eFNwbGl0U25hcHNob3QpLmFyZWFzQmVmb3JlR3V0dGVyLFxyXG4gICAgICAgIC0oc3RlcHBlZE9mZnNldCAtIGFyZWFzQWZ0ZXIucmVtYWluKSxcclxuICAgICAgICAodGhpcy5zbmFwc2hvdCBhcyBNdHhTcGxpdFNuYXBzaG90KS5hbGxBcmVhc1NpemVQaXhlbFxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnVuaXQgPT09ICdwZXJjZW50Jykge1xyXG4gICAgICAvLyBIYWNrIGJlY2F1c2Ugb2YgYnJvd3NlciBtZXNzaW5nIHVwIHdpdGggc2l6ZXMgdXNpbmcgY2FsYyhYJSAtIFlweCkgLT4gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcclxuICAgICAgLy8gSWYgbm90IHRoZXJlLCBwbGF5aW5nIHdpdGggZ3V0dGVycyBtYWtlcyB0b3RhbCBnb2luZyBkb3duIHRvIDk5Ljk5ODc1JSB0aGVuIDk5Ljk5Mjg2JSwgOTkuOTg5ODYlLC4uXHJcbiAgICAgIGNvbnN0IGFsbCA9IFsuLi5hcmVhc0JlZm9yZS5saXN0LCAuLi5hcmVhc0FmdGVyLmxpc3RdO1xyXG4gICAgICBjb25zdCBhcmVhVG9SZXNldCA9IGFsbC5maW5kKFxyXG4gICAgICAgIGEgPT5cclxuICAgICAgICAgIGEucGVyY2VudEFmdGVyQWJzb3JwdGlvbiAhPT0gMCAmJlxyXG4gICAgICAgICAgYS5wZXJjZW50QWZ0ZXJBYnNvcnB0aW9uICE9PSBhLmFyZWFTbmFwc2hvdC5hcmVhLm1pblNpemUgJiZcclxuICAgICAgICAgIGEucGVyY2VudEFmdGVyQWJzb3JwdGlvbiAhPT0gYS5hcmVhU25hcHNob3QuYXJlYS5tYXhTaXplXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBpZiAoYXJlYVRvUmVzZXQpIHtcclxuICAgICAgICBhcmVhVG9SZXNldC5wZXJjZW50QWZ0ZXJBYnNvcnB0aW9uID1cclxuICAgICAgICAgICh0aGlzLnNuYXBzaG90IGFzIE10eFNwbGl0U25hcHNob3QpLmFsbEludm9sdmVkQXJlYXNTaXplUGVyY2VudCAtXHJcbiAgICAgICAgICBhbGxcclxuICAgICAgICAgICAgLmZpbHRlcihhID0+IGEgIT09IGFyZWFUb1Jlc2V0KVxyXG4gICAgICAgICAgICAucmVkdWNlKCh0b3RhbCwgYSkgPT4gdG90YWwgKyBhLnBlcmNlbnRBZnRlckFic29ycHRpb24sIDApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gTm93IHdlIGtub3cgYXJlYXMgY291bGQgYWJzb3JiIHN0ZXBwZWRPZmZzZXQsIHRpbWUgdG8gcmVhbGx5IHVwZGF0ZSBzaXplc1xyXG5cclxuICAgIGFyZWFzQmVmb3JlLmxpc3QuZm9yRWFjaChpdGVtID0+IHVwZGF0ZUFyZWFTaXplKHRoaXMudW5pdCwgaXRlbSkpO1xyXG4gICAgYXJlYXNBZnRlci5saXN0LmZvckVhY2goaXRlbSA9PiB1cGRhdGVBcmVhU2l6ZSh0aGlzLnVuaXQsIGl0ZW0pKTtcclxuXHJcbiAgICB0aGlzLnJlZnJlc2hTdHlsZVNpemVzKCk7XHJcbiAgICB0aGlzLm5vdGlmeSgncHJvZ3Jlc3MnLCAodGhpcy5zbmFwc2hvdCBhcyBNdHhTcGxpdFNuYXBzaG90KS5ndXR0ZXJOdW0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzdG9wRHJhZ2dpbmcoZXZlbnQ/OiBFdmVudCk6IHZvaWQge1xyXG4gICAgaWYgKGV2ZW50KSB7XHJcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLmlzRHJhZ2dpbmcgPT09IGZhbHNlKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmRpc3BsYXllZEFyZWFzLmZvckVhY2goYXJlYSA9PiBhcmVhLmNvbXBvbmVudC51bmxvY2tFdmVudHMoKSk7XHJcblxyXG4gICAgd2hpbGUgKHRoaXMuZHJhZ0xpc3RlbmVycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNvbnN0IGZjdCA9IHRoaXMuZHJhZ0xpc3RlbmVycy5wb3AoKTtcclxuICAgICAgaWYgKGZjdCkge1xyXG4gICAgICAgIGZjdCgpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gV2FybmluZzogSGF2ZSB0byBiZSBiZWZvcmUgXCJub3RpZnkoJ2VuZCcpXCJcclxuICAgIC8vIGJlY2F1c2UgXCJub3RpZnkoJ2VuZCcpXCJcIiBjYW4gYmUgbGlua2VkIHRvIFwiW3NpemVdPSd4J1wiID4gXCJidWlsZCgpXCIgPiBcInN0b3BEcmFnZ2luZygpXCJcclxuICAgIHRoaXMuaXNEcmFnZ2luZyA9IGZhbHNlO1xyXG5cclxuICAgIC8vIElmIG1vdmVkIGZyb20gc3RhcnRpbmcgcG9pbnQsIG5vdGlmeSBlbmRcclxuICAgIGlmIChcclxuICAgICAgdGhpcy5lbmRQb2ludCAmJlxyXG4gICAgICAoKHRoaXMuc3RhcnRQb2ludCBhcyBNdHhTcGxpdFBvaW50KS54ICE9PSB0aGlzLmVuZFBvaW50LnggfHxcclxuICAgICAgICAodGhpcy5zdGFydFBvaW50IGFzIE10eFNwbGl0UG9pbnQpLnkgIT09IHRoaXMuZW5kUG9pbnQueSlcclxuICAgICkge1xyXG4gICAgICB0aGlzLm5vdGlmeSgnZW5kJywgKHRoaXMuc25hcHNob3QgYXMgTXR4U3BsaXRTbmFwc2hvdCkuZ3V0dGVyTnVtKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnJlbmRlcmVyLnJlbW92ZUNsYXNzKHRoaXMuZWxSZWYubmF0aXZlRWxlbWVudCwgJ210eC1kcmFnZ2luZycpO1xyXG4gICAgdGhpcy5yZW5kZXJlci5yZW1vdmVDbGFzcyhcclxuICAgICAgdGhpcy5ndXR0ZXJFbHMudG9BcnJheSgpWyh0aGlzLnNuYXBzaG90IGFzIE10eFNwbGl0U25hcHNob3QpLmd1dHRlck51bSAtIDFdLm5hdGl2ZUVsZW1lbnQsXHJcbiAgICAgICdtdHgtZHJhZ2dlZCdcclxuICAgICk7XHJcbiAgICB0aGlzLnNuYXBzaG90ID0gbnVsbDtcclxuXHJcbiAgICAvLyBOZWVkZWQgdG8gbGV0IChjbGljayk9XCJjbGlja0d1dHRlciguLi4pXCIgZXZlbnQgcnVuIGFuZCB2ZXJpZnkgaWYgbW91c2UgbW92ZWQgb3Igbm90XHJcbiAgICB0aGlzLm5nWm9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB7XHJcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgIHRoaXMuc3RhcnRQb2ludCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5lbmRQb2ludCA9IG51bGw7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgbm90aWZ5KFxyXG4gICAgdHlwZTogJ3N0YXJ0JyB8ICdwcm9ncmVzcycgfCAnZW5kJyB8ICdjbGljaycgfCAnZGJsY2xpY2snIHwgJ3RyYW5zaXRpb25FbmQnLFxyXG4gICAgZ3V0dGVyTnVtOiBudW1iZXJcclxuICApOiB2b2lkIHtcclxuICAgIGNvbnN0IHNpemVzID0gdGhpcy5nZXRWaXNpYmxlQXJlYVNpemVzKCk7XHJcblxyXG4gICAgaWYgKHR5cGUgPT09ICdzdGFydCcpIHtcclxuICAgICAgdGhpcy5kcmFnU3RhcnQuZW1pdCh7IGd1dHRlck51bSwgc2l6ZXMgfSk7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdlbmQnKSB7XHJcbiAgICAgIHRoaXMuZHJhZ0VuZC5lbWl0KHsgZ3V0dGVyTnVtLCBzaXplcyB9KTtcclxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2NsaWNrJykge1xyXG4gICAgICB0aGlzLmd1dHRlckNsaWNrLmVtaXQoeyBndXR0ZXJOdW0sIHNpemVzIH0pO1xyXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnZGJsY2xpY2snKSB7XHJcbiAgICAgIHRoaXMuZ3V0dGVyRGJsQ2xpY2suZW1pdCh7IGd1dHRlck51bSwgc2l6ZXMgfSk7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICd0cmFuc2l0aW9uRW5kJykge1xyXG4gICAgICBpZiAodGhpcy50cmFuc2l0aW9uRW5kU3Vic2NyaWJlcikge1xyXG4gICAgICAgIHRoaXMubmdab25lLnJ1bigoKSA9PiB0aGlzLnRyYW5zaXRpb25FbmRTdWJzY3JpYmVyLm5leHQoc2l6ZXMpKTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAncHJvZ3Jlc3MnKSB7XHJcbiAgICAgIC8vIFN0YXkgb3V0c2lkZSB6b25lIHRvIGFsbG93IHVzZXJzIGRvIHdoYXQgdGhleSB3YW50IGFib3V0IGNoYW5nZSBkZXRlY3Rpb24gbWVjaGFuaXNtLlxyXG4gICAgICB0aGlzLmRyYWdQcm9ncmVzc1N1YmplY3QubmV4dCh7IGd1dHRlck51bSwgc2l6ZXMgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgbmdPbkRlc3Ryb3koKTogdm9pZCB7XHJcbiAgICB0aGlzLnN0b3BEcmFnZ2luZygpO1xyXG4gIH1cclxufVxyXG4iXX0=