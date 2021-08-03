import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild, ViewEncapsulation, ElementRef, ChangeDetectionStrategy, HostBinding, NgZone, Optional, } from '@angular/core';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ESCAPE } from '@angular/cdk/keycodes';
import { Directionality } from '@angular/cdk/bidi';
import { throwMtxPopoverInvalidPositionX, throwMtxPopoverInvalidPositionY } from './popover-errors';
import { transformPopover } from './popover-animations';
export class MtxPopover {
    constructor(_dir, _elementRef, zone) {
        this._dir = _dir;
        this._elementRef = _elementRef;
        this.zone = zone;
        this.role = 'dialog';
        /** Settings for popover, view setters and getters for more detail */
        this._xPosition = 'after';
        this._yPosition = 'below';
        this._triggerEvent = 'hover';
        this._scrollStrategy = 'reposition';
        this._enterDelay = 100;
        this._leaveDelay = 100;
        this._overlapTrigger = false;
        this._disableAnimation = false;
        this._panelOffsetX = 0;
        this._panelOffsetY = 0;
        this._closeOnPanelClick = false;
        this._closeOnBackdropClick = true;
        this._focusTrapEnabled = true;
        this._focusTrapAutoCaptureEnabled = true;
        this._arrowOffsetX = 20;
        this._arrowWidth = 16;
        /** Config object to be passed into the popover's ngClass */
        this._classList = {};
        // TODO: Write comment description
        /** */
        this.containerPositioning = false;
        /** Closing disabled on popover */
        this.closeDisabled = false;
        /** Emits the current animation state whenever it changes. */
        this._onAnimationStateChange = new EventEmitter();
        /** Event emitted when the popover is closed. */
        this.closed = new EventEmitter();
        this.setPositionClasses();
    }
    /** Position of the popover in the X axis. */
    get xPosition() {
        return this._xPosition;
    }
    set xPosition(value) {
        if (value !== 'before' && value !== 'after' && value !== 'center') {
            throwMtxPopoverInvalidPositionX();
        }
        this._xPosition = value;
        this.setPositionClasses();
    }
    /** Position of the popover in the Y axis. */
    get yPosition() {
        return this._yPosition;
    }
    set yPosition(value) {
        if (value !== 'above' && value !== 'below') {
            throwMtxPopoverInvalidPositionY();
        }
        this._yPosition = value;
        this.setPositionClasses();
    }
    /** Popover trigger event */
    get triggerEvent() {
        return this._triggerEvent;
    }
    set triggerEvent(value) {
        this._triggerEvent = value;
    }
    /** Popover scroll strategy */
    get scrollStrategy() {
        return this._scrollStrategy;
    }
    set scrollStrategy(value) {
        this._scrollStrategy = value;
    }
    /** Popover enter delay */
    get enterDelay() {
        return this._enterDelay;
    }
    set enterDelay(value) {
        this._enterDelay = value;
    }
    /** Popover leave delay */
    get leaveDelay() {
        return this._leaveDelay;
    }
    set leaveDelay(value) {
        this._leaveDelay = value;
    }
    /** Popover overlap trigger */
    get overlapTrigger() {
        return this._overlapTrigger;
    }
    set overlapTrigger(value) {
        this._overlapTrigger = value;
    }
    /** Popover target offset x */
    get xOffset() {
        return this._panelOffsetX;
    }
    set xOffset(value) {
        this._panelOffsetX = value;
    }
    /** Popover target offset y */
    get yOffset() {
        return this._panelOffsetY;
    }
    set yOffset(value) {
        this._panelOffsetY = value;
    }
    /** Popover arrow offset x */
    get arrowOffsetX() {
        return this._arrowOffsetX;
    }
    set arrowOffsetX(value) {
        this._arrowOffsetX = value;
    }
    /** Popover arrow width */
    get arrowWidth() {
        return this._arrowWidth;
    }
    set arrowWidth(value) {
        this._arrowWidth = value;
    }
    /** Popover close on container click */
    get closeOnPanelClick() {
        return this._closeOnPanelClick;
    }
    set closeOnPanelClick(value) {
        this._closeOnPanelClick = coerceBooleanProperty(value);
    }
    /** Popover close on backdrop click */
    get closeOnBackdropClick() {
        return this._closeOnBackdropClick;
    }
    set closeOnBackdropClick(value) {
        this._closeOnBackdropClick = coerceBooleanProperty(value);
    }
    /** Disable animations of popover and all child elements */
    get disableAnimation() {
        return this._disableAnimation;
    }
    set disableAnimation(value) {
        this._disableAnimation = coerceBooleanProperty(value);
    }
    /** Popover focus trap using cdkTrapFocus */
    get focusTrapEnabled() {
        return this._focusTrapEnabled;
    }
    set focusTrapEnabled(value) {
        this._focusTrapEnabled = coerceBooleanProperty(value);
    }
    /** Popover focus trap auto capture using cdkTrapFocusAutoCapture */
    get focusTrapAutoCaptureEnabled() {
        return this._focusTrapAutoCaptureEnabled;
    }
    set focusTrapAutoCaptureEnabled(value) {
        this._focusTrapAutoCaptureEnabled = coerceBooleanProperty(value);
    }
    /**
     * This method takes classes set on the host md-popover element and applies them on the
     * popover template that displays in the overlay container.  Otherwise, it's difficult
     * to style the containing popover from outside the component.
     * @param classes list of class names
     */
    set panelClass(classes) {
        if (classes && classes.length) {
            this._classList = classes.split(' ').reduce((obj, className) => {
                obj[className] = true;
                return obj;
            }, {});
            this._elementRef.nativeElement.className = '';
            this.setPositionClasses();
        }
    }
    /**
     * This method takes classes set on the host md-popover element and applies them on the
     * popover template that displays in the overlay container.  Otherwise, it's difficult
     * to style the containing popover from outside the component.
     * @deprecated Use `panelClass` instead.
     * @breaking-change 8.0.0
     */
    get classList() {
        return this.panelClass;
    }
    set classList(classes) {
        this.panelClass = classes;
    }
    ngOnDestroy() {
        this._emitCloseEvent();
        this.closed.complete();
    }
    /** Handle a keyboard event from the popover, delegating to the appropriate action. */
    _handleKeydown(event) {
        switch (event.keyCode) {
            case ESCAPE:
                this._emitCloseEvent();
                return;
        }
    }
    /**
     * This emits a close event to which the trigger is subscribed. When emitted, the
     * trigger will close the popover.
     */
    _emitCloseEvent() {
        this.closed.emit();
    }
    /** Close popover on click if closeOnPanelClick is true */
    onClick() {
        if (this.closeOnPanelClick) {
            this._emitCloseEvent();
        }
    }
    /**
     * TODO: Refactor when @angular/cdk includes feature I mentioned on github see link below.
     * https://github.com/angular/material2/pull/5493#issuecomment-313085323
     */
    /** Disables close of popover when leaving trigger element and mouse over the popover */
    onMouseOver() {
        if (this.triggerEvent === 'hover') {
            this.closeDisabled = true;
        }
    }
    /** Enables close of popover when mouse leaving popover element */
    onMouseLeave() {
        if (this.triggerEvent === 'hover') {
            this.closeDisabled = false;
            this._emitCloseEvent();
        }
    }
    // TODO: Refactor how styles are set and updated on the component, use best practices.
    // TODO: If arrow left and right positioning is requested, see if flex direction can be used to work with order.
    /** Sets the current styles for the popover to allow for dynamically changing settings */
    setCurrentStyles() {
        const left = this.xPosition === 'after'
            ? `${this.arrowOffsetX - this.arrowWidth / 2}px`
            : this.xPosition === 'center'
                ? `calc(50% - ${this.arrowWidth / 2}px)`
                : '';
        const right = this.xPosition === 'before' ? `${this.arrowOffsetX - this.arrowWidth / 2}px` : '';
        this.popoverArrowStyles = {
            left: this._dir.value === 'ltr' ? left : right,
            right: this._dir.value === 'ltr' ? right : left,
        };
    }
    /**
     * It's necessary to set position-based classes to ensure the popover panel animation
     * folds out from the correct direction.
     */
    setPositionClasses(posX = this.xPosition, posY = this.yPosition) {
        this._classList['mtx-popover-before'] = posX === 'before';
        this._classList['mtx-popover-center'] = posX === 'center';
        this._classList['mtx-popover-after'] = posX === 'after';
        this._classList['mtx-popover-above'] = posY === 'above';
        this._classList['mtx-popover-below'] = posY === 'below';
    }
}
MtxPopover.decorators = [
    { type: Component, args: [{
                selector: 'mtx-popover',
                template: "<ng-template>\r\n  <div class=\"mtx-popover-panel mat-elevation-z8\" role=\"dialog\"\r\n       [class.mtx-popover-overlap]=\"overlapTrigger\"\r\n       [ngClass]=\"_classList\"\r\n       [ngStyle]=\"popoverPanelStyles\"\r\n       (keydown)=\"_handleKeydown($event)\"\r\n       (click)=\"onClick()\"\r\n       (mouseover)=\"onMouseOver()\"\r\n       (mouseleave)=\"onMouseLeave()\"\r\n       [@.disabled]=\"disableAnimation\"\r\n       [@transformPopover]=\"'enter'\">\r\n    <div class=\"mtx-popover-direction-arrow\" [ngStyle]=\"popoverArrowStyles\" *ngIf=\"!overlapTrigger\">\r\n    </div>\r\n    <div class=\"mtx-popover-content\"\r\n         [ngStyle]=\"popoverContentStyles\"\r\n         [cdkTrapFocus]=\"focusTrapEnabled\"\r\n         [cdkTrapFocusAutoCapture]=\"focusTrapAutoCaptureEnabled\">\r\n      <ng-content></ng-content>\r\n    </div>\r\n  </div>\r\n</ng-template>\r\n",
                changeDetection: ChangeDetectionStrategy.OnPush,
                encapsulation: ViewEncapsulation.None,
                animations: [transformPopover],
                exportAs: 'mtxPopover',
                styles: [".mtx-popover-panel{max-height:calc(100vh - 48px);padding:8px;border-radius:4px}.mtx-popover-panel.mtx-popover-below{margin-top:10px}.mtx-popover-panel.mtx-popover-above{margin-bottom:10px}.mtx-popover-panel.mtx-popover-overlap{margin:0}.mtx-popover-direction-arrow{position:absolute;width:16px}.mtx-popover-direction-arrow:after,.mtx-popover-direction-arrow:before{position:absolute;display:inline-block;content:\"\"}.mtx-popover-direction-arrow:before{border:8px solid transparent}.mtx-popover-direction-arrow:after{border:7px solid transparent;left:1px}[dir=rtl] .mtx-popover-direction-arrow:after{right:1px;left:auto}.mtx-popover-below .mtx-popover-direction-arrow{top:0}.mtx-popover-below .mtx-popover-direction-arrow:after,.mtx-popover-below .mtx-popover-direction-arrow:before{bottom:0;border-top-width:0}.mtx-popover-above .mtx-popover-direction-arrow{bottom:0}.mtx-popover-above .mtx-popover-direction-arrow:after,.mtx-popover-above .mtx-popover-direction-arrow:before{top:0;border-bottom-width:0}"]
            },] }
];
/** @nocollapse */
MtxPopover.ctorParameters = () => [
    { type: Directionality, decorators: [{ type: Optional }] },
    { type: ElementRef },
    { type: NgZone }
];
MtxPopover.propDecorators = {
    role: [{ type: HostBinding, args: ['attr.role',] }],
    xPosition: [{ type: Input }],
    yPosition: [{ type: Input }],
    triggerEvent: [{ type: Input }],
    scrollStrategy: [{ type: Input }],
    enterDelay: [{ type: Input }],
    leaveDelay: [{ type: Input }],
    overlapTrigger: [{ type: Input }],
    xOffset: [{ type: Input }],
    yOffset: [{ type: Input }],
    arrowOffsetX: [{ type: Input }],
    arrowWidth: [{ type: Input }],
    closeOnPanelClick: [{ type: Input }],
    closeOnBackdropClick: [{ type: Input }],
    disableAnimation: [{ type: Input }],
    focusTrapEnabled: [{ type: Input }],
    focusTrapAutoCaptureEnabled: [{ type: Input }],
    panelClass: [{ type: Input, args: ['class',] }],
    classList: [{ type: Input }],
    closed: [{ type: Output }],
    templateRef: [{ type: ViewChild, args: [TemplateRef,] }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wb3Zlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL2V4dGVuc2lvbnMvcG9wb3Zlci9wb3BvdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFDTCxTQUFTLEVBQ1QsWUFBWSxFQUNaLEtBQUssRUFFTCxNQUFNLEVBQ04sV0FBVyxFQUNYLFNBQVMsRUFDVCxpQkFBaUIsRUFDakIsVUFBVSxFQUNWLHVCQUF1QixFQUN2QixXQUFXLEVBQ1gsTUFBTSxFQUNOLFFBQVEsR0FDVCxNQUFNLGVBQWUsQ0FBQztBQUV2QixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDL0MsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBUW5ELE9BQU8sRUFBRSwrQkFBK0IsRUFBRSwrQkFBK0IsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRXBHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBV3hELE1BQU0sT0FBTyxVQUFVO0lBME9yQixZQUNzQixJQUFvQixFQUNoQyxXQUF1QixFQUN4QixJQUFZO1FBRkMsU0FBSSxHQUFKLElBQUksQ0FBZ0I7UUFDaEMsZ0JBQVcsR0FBWCxXQUFXLENBQVk7UUFDeEIsU0FBSSxHQUFKLElBQUksQ0FBUTtRQTVPSyxTQUFJLEdBQUcsUUFBUSxDQUFDO1FBRTFDLHFFQUFxRTtRQUM3RCxlQUFVLEdBQXdCLE9BQU8sQ0FBQztRQUMxQyxlQUFVLEdBQXdCLE9BQU8sQ0FBQztRQUMxQyxrQkFBYSxHQUEyQixPQUFPLENBQUM7UUFDaEQsb0JBQWUsR0FBNkIsWUFBWSxDQUFDO1FBQ3pELGdCQUFXLEdBQUcsR0FBRyxDQUFDO1FBQ2xCLGdCQUFXLEdBQUcsR0FBRyxDQUFDO1FBQ2xCLG9CQUFlLEdBQUcsS0FBSyxDQUFDO1FB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QUFJLEtBQUssT0FBTyxDQUFDO0lBQzFELENBQUM7OztZQXRVRixTQUFTLFNBQUM7Z0JBQ1QsUUFBUSxFQUFFLGFBQWE7Z0JBQ3ZCLDgzQkFBNkI7Z0JBRTdCLGVBQWUsRUFBRSx1QkFBdUIsQ0FBQyxNQUFNO2dCQUMvQyxhQUFhLEVBQUUsaUJBQWlCLENBQUMsSUFBSTtnQkFDckMsVUFBVSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7Z0JBQzlCLFFBQVEsRUFBRSxZQUFZOzthQUN2Qjs7OztZQXBCUSxjQUFjLHVCQWdRbEIsUUFBUTtZQXpRWCxVQUFVO1lBR1YsTUFBTTs7O21CQTRCTCxXQUFXLFNBQUMsV0FBVzt3QkEyQ3ZCLEtBQUs7d0JBYUwsS0FBSzsyQkFhTCxLQUFLOzZCQVNMLEtBQUs7eUJBU0wsS0FBSzt5QkFTTCxLQUFLOzZCQVNMLEtBQUs7c0JBU0wsS0FBSztzQkFTTCxLQUFLOzJCQVNMLEtBQUs7eUJBU0wsS0FBSztnQ0FTTCxLQUFLO21DQVNMLEtBQUs7K0JBU0wsS0FBSzsrQkFTTCxLQUFLOzBDQVNMLEtBQUs7eUJBY0wsS0FBSyxTQUFDLE9BQU87d0JBb0JiLEtBQUs7cUJBU0wsTUFBTTswQkFFTixTQUFTLFNBQUMsV0FBVyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcbiAgQ29tcG9uZW50LFxyXG4gIEV2ZW50RW1pdHRlcixcclxuICBJbnB1dCxcclxuICBPbkRlc3Ryb3ksXHJcbiAgT3V0cHV0LFxyXG4gIFRlbXBsYXRlUmVmLFxyXG4gIFZpZXdDaGlsZCxcclxuICBWaWV3RW5jYXBzdWxhdGlvbixcclxuICBFbGVtZW50UmVmLFxyXG4gIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxyXG4gIEhvc3RCaW5kaW5nLFxyXG4gIE5nWm9uZSxcclxuICBPcHRpb25hbCxcclxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcclxuaW1wb3J0IHsgQW5pbWF0aW9uRXZlbnQgfSBmcm9tICdAYW5ndWxhci9hbmltYXRpb25zJztcclxuaW1wb3J0IHsgY29lcmNlQm9vbGVhblByb3BlcnR5IH0gZnJvbSAnQGFuZ3VsYXIvY2RrL2NvZXJjaW9uJztcclxuaW1wb3J0IHsgRVNDQVBFIH0gZnJvbSAnQGFuZ3VsYXIvY2RrL2tleWNvZGVzJztcclxuaW1wb3J0IHsgRGlyZWN0aW9uYWxpdHkgfSBmcm9tICdAYW5ndWxhci9jZGsvYmlkaSc7XHJcblxyXG5pbXBvcnQge1xyXG4gIE10eFBvcG92ZXJQb3NpdGlvblgsXHJcbiAgTXR4UG9wb3ZlclBvc2l0aW9uWSxcclxuICBNdHhQb3BvdmVyVHJpZ2dlckV2ZW50LFxyXG4gIE10eFBvcG92ZXJTY3JvbGxTdHJhdGVneSxcclxufSBmcm9tICcuL3BvcG92ZXItdHlwZXMnO1xyXG5pbXBvcnQgeyB0aHJvd010eFBvcG92ZXJJbnZhbGlkUG9zaXRpb25YLCB0aHJvd010eFBvcG92ZXJJbnZhbGlkUG9zaXRpb25ZIH0gZnJvbSAnLi9wb3BvdmVyLWVycm9ycyc7XHJcbmltcG9ydCB7IE10eFBvcG92ZXJQYW5lbCB9IGZyb20gJy4vcG9wb3Zlci1pbnRlcmZhY2VzJztcclxuaW1wb3J0IHsgdHJhbnNmb3JtUG9wb3ZlciB9IGZyb20gJy4vcG9wb3Zlci1hbmltYXRpb25zJztcclxuXHJcbkBDb21wb25lbnQoe1xyXG4gIHNlbGVjdG9yOiAnbXR4LXBvcG92ZXInLFxyXG4gIHRlbXBsYXRlVXJsOiAnLi9wb3BvdmVyLmh0bWwnLFxyXG4gIHN0eWxlVXJsczogWycuL3BvcG92ZXIuc2NzcyddLFxyXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxyXG4gIGVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmUsXHJcbiAgYW5pbWF0aW9uczogW3RyYW5zZm9ybVBvcG92ZXJdLFxyXG4gIGV4cG9ydEFzOiAnbXR4UG9wb3ZlcicsXHJcbn0pXHJcbmV4cG9ydCBjbGFzcyBNdHhQb3BvdmVyIGltcGxlbWVudHMgTXR4UG9wb3ZlclBhbmVsLCBPbkRlc3Ryb3kge1xyXG4gIEBIb3N0QmluZGluZygnYXR0ci5yb2xlJykgcm9sZSA9ICdkaWFsb2cnO1xyXG5cclxuICAvKiogU2V0dGluZ3MgZm9yIHBvcG92ZXIsIHZpZXcgc2V0dGVycyBhbmQgZ2V0dGVycyBmb3IgbW9yZSBkZXRhaWwgKi9cclxuICBwcml2YXRlIF94UG9zaXRpb246IE10eFBvcG92ZXJQb3NpdGlvblggPSAnYWZ0ZXInO1xyXG4gIHByaXZhdGUgX3lQb3NpdGlvbjogTXR4UG9wb3ZlclBvc2l0aW9uWSA9ICdiZWxvdyc7XHJcbiAgcHJpdmF0ZSBfdHJpZ2dlckV2ZW50OiBNdHhQb3BvdmVyVHJpZ2dlckV2ZW50ID0gJ2hvdmVyJztcclxuICBwcml2YXRlIF9zY3JvbGxTdHJhdGVneTogTXR4UG9wb3ZlclNjcm9sbFN0cmF0ZWd5ID0gJ3JlcG9zaXRpb24nO1xyXG4gIHByaXZhdGUgX2VudGVyRGVsYXkgPSAxMDA7XHJcbiAgcHJpdmF0ZSBfbGVhdmVEZWxheSA9IDEwMDtcclxuICBwcml2YXRlIF9vdmVybGFwVHJpZ2dlciA9IGZhbHNlO1xyXG4gIHByaXZhdGUgX2Rpc2FibGVBbmltYXRpb24gPSBmYWxzZTtcclxuICBwcml2YXRlIF9wYW5lbE9mZnNldFggPSAwO1xyXG4gIHByaXZhdGUgX3BhbmVsT2Zmc2V0WSA9IDA7XHJcbiAgcHJpdmF0ZSBfY2xvc2VPblBhbmVsQ2xpY2sgPSBmYWxzZTtcclxuICBwcml2YXRlIF9jbG9zZU9uQmFja2Ryb3BDbGljayA9IHRydWU7XHJcbiAgcHJpdmF0ZSBfZm9jdXNUcmFwRW5hYmxlZCA9IHRydWU7XHJcbiAgcHJpdmF0ZSBfZm9jdXNUcmFwQXV0b0NhcHR1cmVFbmFibGVkID0gdHJ1ZTtcclxuICBwcml2YXRlIF9hcnJvd09mZnNldFggPSAyMDtcclxuICBwcml2YXRlIF9hcnJvd1dpZHRoID0gMTY7XHJcblxyXG4gIC8qKiBDb25maWcgb2JqZWN0IHRvIGJlIHBhc3NlZCBpbnRvIHRoZSBwb3BvdmVyJ3MgbmdDbGFzcyAqL1xyXG4gIF9jbGFzc0xpc3Q6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9ID0ge307XHJcblxyXG4gIC8vIFRPRE86IFdyaXRlIGNvbW1lbnQgZGVzY3JpcHRpb25cclxuICAvKiogKi9cclxuICBwdWJsaWMgY29udGFpbmVyUG9zaXRpb25pbmcgPSBmYWxzZTtcclxuXHJcbiAgLyoqIENsb3NpbmcgZGlzYWJsZWQgb24gcG9wb3ZlciAqL1xyXG4gIHB1YmxpYyBjbG9zZURpc2FibGVkID0gZmFsc2U7XHJcblxyXG4gIC8qKiBDb25maWcgb2JqZWN0IHRvIGJlIHBhc3NlZCBpbnRvIHRoZSBwb3BvdmVyJ3MgYXJyb3cgbmdTdHlsZSAqL1xyXG4gIHB1YmxpYyBwb3BvdmVyUGFuZWxTdHlsZXMhOiB7fTtcclxuXHJcbiAgLyoqIENvbmZpZyBvYmplY3QgdG8gYmUgcGFzc2VkIGludG8gdGhlIHBvcG92ZXIncyBhcnJvdyBuZ1N0eWxlICovXHJcbiAgcHVibGljIHBvcG92ZXJBcnJvd1N0eWxlcyE6IHt9O1xyXG5cclxuICAvKiogQ29uZmlnIG9iamVjdCB0byBiZSBwYXNzZWQgaW50byB0aGUgcG9wb3ZlcidzIGNvbnRlbnQgbmdTdHlsZSAqL1xyXG4gIHB1YmxpYyBwb3BvdmVyQ29udGVudFN0eWxlcyE6IHt9O1xyXG5cclxuICAvKiogRW1pdHMgdGhlIGN1cnJlbnQgYW5pbWF0aW9uIHN0YXRlIHdoZW5ldmVyIGl0IGNoYW5nZXMuICovXHJcbiAgX29uQW5pbWF0aW9uU3RhdGVDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPEFuaW1hdGlvbkV2ZW50PigpO1xyXG5cclxuICAvKiogUG9zaXRpb24gb2YgdGhlIHBvcG92ZXIgaW4gdGhlIFggYXhpcy4gKi9cclxuICBASW5wdXQoKVxyXG4gIGdldCB4UG9zaXRpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5feFBvc2l0aW9uO1xyXG4gIH1cclxuICBzZXQgeFBvc2l0aW9uKHZhbHVlOiBNdHhQb3BvdmVyUG9zaXRpb25YKSB7XHJcbiAgICBpZiAodmFsdWUgIT09ICdiZWZvcmUnICYmIHZhbHVlICE9PSAnYWZ0ZXInICYmIHZhbHVlICE9PSAnY2VudGVyJykge1xyXG4gICAgICB0aHJvd010eFBvcG92ZXJJbnZhbGlkUG9zaXRpb25YKCk7XHJcbiAgICB9XHJcbiAgICB0aGlzLl94UG9zaXRpb24gPSB2YWx1ZTtcclxuICAgIHRoaXMuc2V0UG9zaXRpb25DbGFzc2VzKCk7XHJcbiAgfVxyXG5cclxuICAvKiogUG9zaXRpb24gb2YgdGhlIHBvcG92ZXIgaW4gdGhlIFkgYXhpcy4gKi9cclxuICBASW5wdXQoKVxyXG4gIGdldCB5UG9zaXRpb24oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5feVBvc2l0aW9uO1xyXG4gIH1cclxuICBzZXQgeVBvc2l0aW9uKHZhbHVlOiBNdHhQb3BvdmVyUG9zaXRpb25ZKSB7XHJcbiAgICBpZiAodmFsdWUgIT09ICdhYm92ZScgJiYgdmFsdWUgIT09ICdiZWxvdycpIHtcclxuICAgICAgdGhyb3dNdHhQb3BvdmVySW52YWxpZFBvc2l0aW9uWSgpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5feVBvc2l0aW9uID0gdmFsdWU7XHJcbiAgICB0aGlzLnNldFBvc2l0aW9uQ2xhc3NlcygpO1xyXG4gIH1cclxuXHJcbiAgLyoqIFBvcG92ZXIgdHJpZ2dlciBldmVudCAqL1xyXG4gIEBJbnB1dCgpXHJcbiAgZ2V0IHRyaWdnZXJFdmVudCgpOiBNdHhQb3BvdmVyVHJpZ2dlckV2ZW50IHtcclxuICAgIHJldHVybiB0aGlzLl90cmlnZ2VyRXZlbnQ7XHJcbiAgfVxyXG4gIHNldCB0cmlnZ2VyRXZlbnQodmFsdWU6IE10eFBvcG92ZXJUcmlnZ2VyRXZlbnQpIHtcclxuICAgIHRoaXMuX3RyaWdnZXJFdmVudCA9IHZhbHVlO1xyXG4gIH1cclxuXHJcbiAgLyoqIFBvcG92ZXIgc2Nyb2xsIHN0cmF0ZWd5ICovXHJcbiAgQElucHV0KClcclxuICBnZXQgc2Nyb2xsU3RyYXRlZ3koKTogTXR4UG9wb3ZlclNjcm9sbFN0cmF0ZWd5IHtcclxuICAgIHJldHVybiB0aGlzLl9zY3JvbGxTdHJhdGVneTtcclxuICB9XHJcbiAgc2V0IHNjcm9sbFN0cmF0ZWd5KHZhbHVlOiBNdHhQb3BvdmVyU2Nyb2xsU3RyYXRlZ3kpIHtcclxuICAgIHRoaXMuX3Njcm9sbFN0cmF0ZWd5ID0gdmFsdWU7XHJcbiAgfVxyXG5cclxuICAvKiogUG9wb3ZlciBlbnRlciBkZWxheSAqL1xyXG4gIEBJbnB1dCgpXHJcbiAgZ2V0IGVudGVyRGVsYXkoKTogbnVtYmVyIHtcclxuICAgIHJldHVybiB0aGlzLl9lbnRlckRlbGF5O1xyXG4gIH1cclxuICBzZXQgZW50ZXJEZWxheSh2YWx1ZTogbnVtYmVyKSB7XHJcbiAgICB0aGlzLl9lbnRlckRlbGF5ID0gdmFsdWU7XHJcbiAgfVxyXG5cclxuICAvKiogUG9wb3ZlciBsZWF2ZSBkZWxheSAqL1xyXG4gIEBJbnB1dCgpXHJcbiAgZ2V0IGxlYXZlRGVsYXkoKTogbnVtYmVyIHtcclxuICAgIHJldHVybiB0aGlzLl9sZWF2ZURlbGF5O1xyXG4gIH1cclxuICBzZXQgbGVhdmVEZWxheSh2YWx1ZTogbnVtYmVyKSB7XHJcbiAgICB0aGlzLl9sZWF2ZURlbGF5ID0gdmFsdWU7XHJcbiAgfVxyXG5cclxuICAvKiogUG9wb3ZlciBvdmVybGFwIHRyaWdnZXIgKi9cclxuICBASW5wdXQoKVxyXG4gIGdldCBvdmVybGFwVHJpZ2dlcigpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB0aGlzLl9vdmVybGFwVHJpZ2dlcjtcclxuICB9XHJcbiAgc2V0IG92ZXJsYXBUcmlnZ2VyKHZhbHVlOiBib29sZWFuKSB7XHJcbiAgICB0aGlzLl9vdmVybGFwVHJpZ2dlciA9IHZhbHVlO1xyXG4gIH1cclxuXHJcbiAgLyoqIFBvcG92ZXIgdGFyZ2V0IG9mZnNldCB4ICovXHJcbiAgQElucHV0KClcclxuICBnZXQgeE9mZnNldCgpOiBudW1iZXIge1xyXG4gICAgcmV0dXJuIHRoaXMuX3BhbmVsT2Zmc2V0WDtcclxuICB9XHJcbiAgc2V0IHhPZmZzZXQodmFsdWU6IG51bWJlcikge1xyXG4gICAgdGhpcy5fcGFuZWxPZmZzZXRYID0gdmFsdWU7XHJcbiAgfVxyXG5cclxuICAvKiogUG9wb3ZlciB0YXJnZXQgb2Zmc2V0IHkgKi9cclxuICBASW5wdXQoKVxyXG4gIGdldCB5T2Zmc2V0KCk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gdGhpcy5fcGFuZWxPZmZzZXRZO1xyXG4gIH1cclxuICBzZXQgeU9mZnNldCh2YWx1ZTogbnVtYmVyKSB7XHJcbiAgICB0aGlzLl9wYW5lbE9mZnNldFkgPSB2YWx1ZTtcclxuICB9XHJcblxyXG4gIC8qKiBQb3BvdmVyIGFycm93IG9mZnNldCB4ICovXHJcbiAgQElucHV0KClcclxuICBnZXQgYXJyb3dPZmZzZXRYKCk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gdGhpcy5fYXJyb3dPZmZzZXRYO1xyXG4gIH1cclxuICBzZXQgYXJyb3dPZmZzZXRYKHZhbHVlOiBudW1iZXIpIHtcclxuICAgIHRoaXMuX2Fycm93T2Zmc2V0WCA9IHZhbHVlO1xyXG4gIH1cclxuXHJcbiAgLyoqIFBvcG92ZXIgYXJyb3cgd2lkdGggKi9cclxuICBASW5wdXQoKVxyXG4gIGdldCBhcnJvd1dpZHRoKCk6IG51bWJlciB7XHJcbiAgICByZXR1cm4gdGhpcy5fYXJyb3dXaWR0aDtcclxuICB9XHJcbiAgc2V0IGFycm93V2lkdGgodmFsdWU6IG51bWJlcikge1xyXG4gICAgdGhpcy5fYXJyb3dXaWR0aCA9IHZhbHVlO1xyXG4gIH1cclxuXHJcbiAgLyoqIFBvcG92ZXIgY2xvc2Ugb24gY29udGFpbmVyIGNsaWNrICovXHJcbiAgQElucHV0KClcclxuICBnZXQgY2xvc2VPblBhbmVsQ2xpY2soKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gdGhpcy5fY2xvc2VPblBhbmVsQ2xpY2s7XHJcbiAgfVxyXG4gIHNldCBjbG9zZU9uUGFuZWxDbGljayh2YWx1ZTogYm9vbGVhbikge1xyXG4gICAgdGhpcy5fY2xvc2VPblBhbmVsQ2xpY2sgPSBjb2VyY2VCb29sZWFuUHJvcGVydHkodmFsdWUpO1xyXG4gIH1cclxuXHJcbiAgLyoqIFBvcG92ZXIgY2xvc2Ugb24gYmFja2Ryb3AgY2xpY2sgKi9cclxuICBASW5wdXQoKVxyXG4gIGdldCBjbG9zZU9uQmFja2Ryb3BDbGljaygpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB0aGlzLl9jbG9zZU9uQmFja2Ryb3BDbGljaztcclxuICB9XHJcbiAgc2V0IGNsb3NlT25CYWNrZHJvcENsaWNrKHZhbHVlOiBib29sZWFuKSB7XHJcbiAgICB0aGlzLl9jbG9zZU9uQmFja2Ryb3BDbGljayA9IGNvZXJjZUJvb2xlYW5Qcm9wZXJ0eSh2YWx1ZSk7XHJcbiAgfVxyXG5cclxuICAvKiogRGlzYWJsZSBhbmltYXRpb25zIG9mIHBvcG92ZXIgYW5kIGFsbCBjaGlsZCBlbGVtZW50cyAqL1xyXG4gIEBJbnB1dCgpXHJcbiAgZ2V0IGRpc2FibGVBbmltYXRpb24oKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gdGhpcy5fZGlzYWJsZUFuaW1hdGlvbjtcclxuICB9XHJcbiAgc2V0IGRpc2FibGVBbmltYXRpb24odmFsdWU6IGJvb2xlYW4pIHtcclxuICAgIHRoaXMuX2Rpc2FibGVBbmltYXRpb24gPSBjb2VyY2VCb29sZWFuUHJvcGVydHkodmFsdWUpO1xyXG4gIH1cclxuXHJcbiAgLyoqIFBvcG92ZXIgZm9jdXMgdHJhcCB1c2luZyBjZGtUcmFwRm9jdXMgKi9cclxuICBASW5wdXQoKVxyXG4gIGdldCBmb2N1c1RyYXBFbmFibGVkKCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHRoaXMuX2ZvY3VzVHJhcEVuYWJsZWQ7XHJcbiAgfVxyXG4gIHNldCBmb2N1c1RyYXBFbmFibGVkKHZhbHVlOiBib29sZWFuKSB7XHJcbiAgICB0aGlzLl9mb2N1c1RyYXBFbmFibGVkID0gY29lcmNlQm9vbGVhblByb3BlcnR5KHZhbHVlKTtcclxuICB9XHJcblxyXG4gIC8qKiBQb3BvdmVyIGZvY3VzIHRyYXAgYXV0byBjYXB0dXJlIHVzaW5nIGNka1RyYXBGb2N1c0F1dG9DYXB0dXJlICovXHJcbiAgQElucHV0KClcclxuICBnZXQgZm9jdXNUcmFwQXV0b0NhcHR1cmVFbmFibGVkKCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHRoaXMuX2ZvY3VzVHJhcEF1dG9DYXB0dXJlRW5hYmxlZDtcclxuICB9XHJcbiAgc2V0IGZvY3VzVHJhcEF1dG9DYXB0dXJlRW5hYmxlZCh2YWx1ZTogYm9vbGVhbikge1xyXG4gICAgdGhpcy5fZm9jdXNUcmFwQXV0b0NhcHR1cmVFbmFibGVkID0gY29lcmNlQm9vbGVhblByb3BlcnR5KHZhbHVlKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFRoaXMgbWV0aG9kIHRha2VzIGNsYXNzZXMgc2V0IG9uIHRoZSBob3N0IG1kLXBvcG92ZXIgZWxlbWVudCBhbmQgYXBwbGllcyB0aGVtIG9uIHRoZVxyXG4gICAqIHBvcG92ZXIgdGVtcGxhdGUgdGhhdCBkaXNwbGF5cyBpbiB0aGUgb3ZlcmxheSBjb250YWluZXIuICBPdGhlcndpc2UsIGl0J3MgZGlmZmljdWx0XHJcbiAgICogdG8gc3R5bGUgdGhlIGNvbnRhaW5pbmcgcG9wb3ZlciBmcm9tIG91dHNpZGUgdGhlIGNvbXBvbmVudC5cclxuICAgKiBAcGFyYW0gY2xhc3NlcyBsaXN0IG9mIGNsYXNzIG5hbWVzXHJcbiAgICovXHJcbiAgQElucHV0KCdjbGFzcycpXHJcbiAgc2V0IHBhbmVsQ2xhc3MoY2xhc3Nlczogc3RyaW5nKSB7XHJcbiAgICBpZiAoY2xhc3NlcyAmJiBjbGFzc2VzLmxlbmd0aCkge1xyXG4gICAgICB0aGlzLl9jbGFzc0xpc3QgPSBjbGFzc2VzLnNwbGl0KCcgJykucmVkdWNlKChvYmo6IGFueSwgY2xhc3NOYW1lOiBzdHJpbmcpID0+IHtcclxuICAgICAgICBvYmpbY2xhc3NOYW1lXSA9IHRydWU7XHJcbiAgICAgICAgcmV0dXJuIG9iajtcclxuICAgICAgfSwge30pO1xyXG5cclxuICAgICAgdGhpcy5fZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LmNsYXNzTmFtZSA9ICcnO1xyXG4gICAgICB0aGlzLnNldFBvc2l0aW9uQ2xhc3NlcygpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVGhpcyBtZXRob2QgdGFrZXMgY2xhc3NlcyBzZXQgb24gdGhlIGhvc3QgbWQtcG9wb3ZlciBlbGVtZW50IGFuZCBhcHBsaWVzIHRoZW0gb24gdGhlXHJcbiAgICogcG9wb3ZlciB0ZW1wbGF0ZSB0aGF0IGRpc3BsYXlzIGluIHRoZSBvdmVybGF5IGNvbnRhaW5lci4gIE90aGVyd2lzZSwgaXQncyBkaWZmaWN1bHRcclxuICAgKiB0byBzdHlsZSB0aGUgY29udGFpbmluZyBwb3BvdmVyIGZyb20gb3V0c2lkZSB0aGUgY29tcG9uZW50LlxyXG4gICAqIEBkZXByZWNhdGVkIFVzZSBgcGFuZWxDbGFzc2AgaW5zdGVhZC5cclxuICAgKiBAYnJlYWtpbmctY2hhbmdlIDguMC4wXHJcbiAgICovXHJcbiAgQElucHV0KClcclxuICBnZXQgY2xhc3NMaXN0KCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5wYW5lbENsYXNzO1xyXG4gIH1cclxuICBzZXQgY2xhc3NMaXN0KGNsYXNzZXM6IHN0cmluZykge1xyXG4gICAgdGhpcy5wYW5lbENsYXNzID0gY2xhc3NlcztcclxuICB9XHJcblxyXG4gIC8qKiBFdmVudCBlbWl0dGVkIHdoZW4gdGhlIHBvcG92ZXIgaXMgY2xvc2VkLiAqL1xyXG4gIEBPdXRwdXQoKSBjbG9zZWQgPSBuZXcgRXZlbnRFbWl0dGVyPHZvaWQ+KCk7XHJcblxyXG4gIEBWaWV3Q2hpbGQoVGVtcGxhdGVSZWYpIHRlbXBsYXRlUmVmITogVGVtcGxhdGVSZWY8YW55PjtcclxuXHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBAT3B0aW9uYWwoKSBwcml2YXRlIF9kaXI6IERpcmVjdGlvbmFsaXR5LFxyXG4gICAgcHJpdmF0ZSBfZWxlbWVudFJlZjogRWxlbWVudFJlZixcclxuICAgIHB1YmxpYyB6b25lOiBOZ1pvbmVcclxuICApIHtcclxuICAgIHRoaXMuc2V0UG9zaXRpb25DbGFzc2VzKCk7XHJcbiAgfVxyXG5cclxuICBuZ09uRGVzdHJveSgpIHtcclxuICAgIHRoaXMuX2VtaXRDbG9zZUV2ZW50KCk7XHJcbiAgICB0aGlzLmNsb3NlZC5jb21wbGV0ZSgpO1xyXG4gIH1cclxuXHJcbiAgLyoqIEhhbmRsZSBhIGtleWJvYXJkIGV2ZW50IGZyb20gdGhlIHBvcG92ZXIsIGRlbGVnYXRpbmcgdG8gdGhlIGFwcHJvcHJpYXRlIGFjdGlvbi4gKi9cclxuICBfaGFuZGxlS2V5ZG93bihldmVudDogS2V5Ym9hcmRFdmVudCkge1xyXG4gICAgc3dpdGNoIChldmVudC5rZXlDb2RlKSB7XHJcbiAgICAgIGNhc2UgRVNDQVBFOlxyXG4gICAgICAgIHRoaXMuX2VtaXRDbG9zZUV2ZW50KCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVGhpcyBlbWl0cyBhIGNsb3NlIGV2ZW50IHRvIHdoaWNoIHRoZSB0cmlnZ2VyIGlzIHN1YnNjcmliZWQuIFdoZW4gZW1pdHRlZCwgdGhlXHJcbiAgICogdHJpZ2dlciB3aWxsIGNsb3NlIHRoZSBwb3BvdmVyLlxyXG4gICAqL1xyXG4gIF9lbWl0Q2xvc2VFdmVudCgpOiB2b2lkIHtcclxuICAgIHRoaXMuY2xvc2VkLmVtaXQoKTtcclxuICB9XHJcblxyXG4gIC8qKiBDbG9zZSBwb3BvdmVyIG9uIGNsaWNrIGlmIGNsb3NlT25QYW5lbENsaWNrIGlzIHRydWUgKi9cclxuICBvbkNsaWNrKCkge1xyXG4gICAgaWYgKHRoaXMuY2xvc2VPblBhbmVsQ2xpY2spIHtcclxuICAgICAgdGhpcy5fZW1pdENsb3NlRXZlbnQoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFRPRE86IFJlZmFjdG9yIHdoZW4gQGFuZ3VsYXIvY2RrIGluY2x1ZGVzIGZlYXR1cmUgSSBtZW50aW9uZWQgb24gZ2l0aHViIHNlZSBsaW5rIGJlbG93LlxyXG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL21hdGVyaWFsMi9wdWxsLzU0OTMjaXNzdWVjb21tZW50LTMxMzA4NTMyM1xyXG4gICAqL1xyXG4gIC8qKiBEaXNhYmxlcyBjbG9zZSBvZiBwb3BvdmVyIHdoZW4gbGVhdmluZyB0cmlnZ2VyIGVsZW1lbnQgYW5kIG1vdXNlIG92ZXIgdGhlIHBvcG92ZXIgKi9cclxuICBvbk1vdXNlT3ZlcigpIHtcclxuICAgIGlmICh0aGlzLnRyaWdnZXJFdmVudCA9PT0gJ2hvdmVyJykge1xyXG4gICAgICB0aGlzLmNsb3NlRGlzYWJsZWQgPSB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuICAvKiogRW5hYmxlcyBjbG9zZSBvZiBwb3BvdmVyIHdoZW4gbW91c2UgbGVhdmluZyBwb3BvdmVyIGVsZW1lbnQgKi9cclxuICBvbk1vdXNlTGVhdmUoKSB7XHJcbiAgICBpZiAodGhpcy50cmlnZ2VyRXZlbnQgPT09ICdob3ZlcicpIHtcclxuICAgICAgdGhpcy5jbG9zZURpc2FibGVkID0gZmFsc2U7XHJcbiAgICAgIHRoaXMuX2VtaXRDbG9zZUV2ZW50KCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBUT0RPOiBSZWZhY3RvciBob3cgc3R5bGVzIGFyZSBzZXQgYW5kIHVwZGF0ZWQgb24gdGhlIGNvbXBvbmVudCwgdXNlIGJlc3QgcHJhY3RpY2VzLlxyXG4gIC8vIFRPRE86IElmIGFycm93IGxlZnQgYW5kIHJpZ2h0IHBvc2l0aW9uaW5nIGlzIHJlcXVlc3RlZCwgc2VlIGlmIGZsZXggZGlyZWN0aW9uIGNhbiBiZSB1c2VkIHRvIHdvcmsgd2l0aCBvcmRlci5cclxuICAvKiogU2V0cyB0aGUgY3VycmVudCBzdHlsZXMgZm9yIHRoZSBwb3BvdmVyIHRvIGFsbG93IGZvciBkeW5hbWljYWxseSBjaGFuZ2luZyBzZXR0aW5ncyAqL1xyXG4gIHNldEN1cnJlbnRTdHlsZXMoKSB7XHJcbiAgICBjb25zdCBsZWZ0ID1cclxuICAgICAgdGhpcy54UG9zaXRpb24gPT09ICdhZnRlcidcclxuICAgICAgICA/IGAke3RoaXMuYXJyb3dPZmZzZXRYIC0gdGhpcy5hcnJvd1dpZHRoIC8gMn1weGBcclxuICAgICAgICA6IHRoaXMueFBvc2l0aW9uID09PSAnY2VudGVyJ1xyXG4gICAgICAgID8gYGNhbGMoNTAlIC0gJHt0aGlzLmFycm93V2lkdGggLyAyfXB4KWBcclxuICAgICAgICA6ICcnO1xyXG4gICAgY29uc3QgcmlnaHQgPSB0aGlzLnhQb3NpdGlvbiA9PT0gJ2JlZm9yZScgPyBgJHt0aGlzLmFycm93T2Zmc2V0WCAtIHRoaXMuYXJyb3dXaWR0aCAvIDJ9cHhgIDogJyc7XHJcblxyXG4gICAgdGhpcy5wb3BvdmVyQXJyb3dTdHlsZXMgPSB7XHJcbiAgICAgIGxlZnQ6IHRoaXMuX2Rpci52YWx1ZSA9PT0gJ2x0cicgPyBsZWZ0IDogcmlnaHQsXHJcbiAgICAgIHJpZ2h0OiB0aGlzLl9kaXIudmFsdWUgPT09ICdsdHInID8gcmlnaHQgOiBsZWZ0LFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEl0J3MgbmVjZXNzYXJ5IHRvIHNldCBwb3NpdGlvbi1iYXNlZCBjbGFzc2VzIHRvIGVuc3VyZSB0aGUgcG9wb3ZlciBwYW5lbCBhbmltYXRpb25cclxuICAgKiBmb2xkcyBvdXQgZnJvbSB0aGUgY29ycmVjdCBkaXJlY3Rpb24uXHJcbiAgICovXHJcbiAgc2V0UG9zaXRpb25DbGFzc2VzKHBvc1ggPSB0aGlzLnhQb3NpdGlvbiwgcG9zWSA9IHRoaXMueVBvc2l0aW9uKTogdm9pZCB7XHJcbiAgICB0aGlzLl9jbGFzc0xpc3RbJ210eC1wb3BvdmVyLWJlZm9yZSddID0gcG9zWCA9PT0gJ2JlZm9yZSc7XHJcbiAgICB0aGlzLl9jbGFzc0xpc3RbJ210eC1wb3BvdmVyLWNlbnRlciddID0gcG9zWCA9PT0gJ2NlbnRlcic7XHJcbiAgICB0aGlzLl9jbGFzc0xpc3RbJ210eC1wb3BvdmVyLWFmdGVyJ10gPSBwb3NYID09PSAnYWZ0ZXInO1xyXG4gICAgdGhpcy5fY2xhc3NMaXN0WydtdHgtcG9wb3Zlci1hYm92ZSddID0gcG9zWSA9PT0gJ2Fib3ZlJztcclxuICAgIHRoaXMuX2NsYXNzTGlzdFsnbXR4LXBvcG92ZXItYmVsb3cnXSA9IHBvc1kgPT09ICdiZWxvdyc7XHJcbiAgfVxyXG59XHJcbiJdfQ==