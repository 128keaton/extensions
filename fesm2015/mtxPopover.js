import { EventEmitter, Component, ChangeDetectionStrategy, ViewEncapsulation, Optional, ElementRef, NgZone, HostBinding, Input, Output, ViewChild, TemplateRef, Directive, ViewContainerRef, ChangeDetectorRef, HostListener, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayConfig, Overlay, OverlayModule } from '@angular/cdk/overlay';
import { isFakeMousedownFromScreenReader, A11yModule } from '@angular/cdk/a11y';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ESCAPE } from '@angular/cdk/keycodes';
import { Directionality } from '@angular/cdk/bidi';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TemplatePortal } from '@angular/cdk/portal';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Throws an exception for the case when popover trigger doesn't have a valid mtx-popover instance
 */
function throwMtxPopoverMissingError() {
    throw Error(`mtx-popover-trigger: must pass in an mtx-popover instance.

    Example:
      <mtx-popover #popover="mtxPopover"></mtx-popover>
      <button [mtxPopoverTriggerFor]="popover"></button>`);
}
/**
 * Throws an exception for the case when popover's mtxPopoverPositionX value isn't valid.
 * In other words, it doesn't match 'before' or 'after'.
 */
function throwMtxPopoverInvalidPositionX() {
    throw Error(`mtxPopoverPositionX value must be either 'before', 'center' or after'.
      Example: <mtx-popover mtxPopoverPositionX="before" #popover="mtxPopover"></mtx-popover>`);
}
/**
 * Throws an exception for the case when popover's mtxPopoverPositionY value isn't valid.
 * In other words, it doesn't match 'above' or 'below'.
 */
function throwMtxPopoverInvalidPositionY() {
    throw Error(`mtxPopoverPositionY value must be either 'above' or below'.
      Example: <mtx-popover mtxPopoverPositionY="above" #popover="mtxPopover"></mtx-popover>`);
}

/**
 * Below are all the animations for the md-popover component.
 * Animation duration and timing values are based on AngularJS Material.
 */
/**
 * This animation controls the popover panel's entry and exit from the page.
 *
 * When the popover panel is added to the DOM, it scales in and fades in its border.
 *
 * When the popover panel is removed from the DOM, it simply fades out after a brief
 * delay to display the ripple.
 */
const transformPopover = trigger('transformPopover', [
    state('enter', style({
        opacity: 1,
        transform: `scale(1)`,
    })),
    transition('void => *', [
        style({
            opacity: 0,
            transform: `scale(0)`,
        }),
        animate(`200ms cubic-bezier(0.25, 0.8, 0.25, 1)`),
    ]),
    transition('* => void', [animate('50ms 100ms linear', style({ opacity: 0 }))]),
]);

class MtxPopover {
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

/**
 * This directive is intended to be used in conjunction with an mtx-popover tag. It is
 * responsible for toggling the display of the provided popover instance.
 */
class MtxPopoverTrigger {
    constructor(_overlay, _elementRef, _viewContainerRef, _dir, _changeDetectorRef) {
        this._overlay = _overlay;
        this._elementRef = _elementRef;
        this._viewContainerRef = _viewContainerRef;
        this._dir = _dir;
        this._changeDetectorRef = _changeDetectorRef;
        this.ariaHaspopup = true;
        this.popoverOpened$ = new Subject();
        this.popoverClosed$ = new Subject();
        this._overlayRef = null;
        this._popoverOpen = false;
        this._halt = false;
        // tracking input type is necessary so it's possible to only auto-focus
        // the first item of the list when the popover is opened via the keyboard
        this._openedByMouse = false;
        this._onDestroy = new Subject();
        /** Event emitted when the associated popover is opened. */
        this.popoverOpened = new EventEmitter();
        /** Event emitted when the associated popover is closed. */
        this.popoverClosed = new EventEmitter();
    }
    ngAfterViewInit() {
        this._checkPopover();
        this._setCurrentConfig();
        this.popover.closed.subscribe(() => this.closePopover());
    }
    ngOnDestroy() {
        this.destroyPopover();
    }
    _setCurrentConfig() {
        if (this.triggerEvent) {
            this.popover.triggerEvent = this.triggerEvent;
        }
        this.popover.setCurrentStyles();
    }
    /** Whether the popover is open. */
    get popoverOpen() {
        return this._popoverOpen;
    }
    onClick(event) {
        if (this.popover.triggerEvent === 'click') {
            this.togglePopover();
        }
    }
    onMouseEnter(event) {
        this._halt = false;
        if (this.popover.triggerEvent === 'hover') {
            this._mouseoverTimer = setTimeout(() => {
                this.openPopover();
            }, this.popover.enterDelay);
        }
    }
    onMouseLeave(event) {
        if (this.popover.triggerEvent === 'hover') {
            if (this._mouseoverTimer) {
                clearTimeout(this._mouseoverTimer);
                this._mouseoverTimer = null;
            }
            if (this._popoverOpen) {
                setTimeout(() => {
                    if (!this.popover.closeDisabled) {
                        this.closePopover();
                    }
                }, this.popover.leaveDelay);
            }
            else {
                this._halt = true;
            }
        }
    }
    /** Toggles the popover between the open and closed states. */
    togglePopover() {
        return this._popoverOpen ? this.closePopover() : this.openPopover();
    }
    /** Opens the popover. */
    openPopover() {
        if (!this._popoverOpen && !this._halt) {
            this._createOverlay().attach(this._portal);
            this._subscribeToBackdrop();
            this._subscribeToDetachments();
            this._initPopover();
        }
    }
    /** Closes the popover. */
    closePopover() {
        if (this._overlayRef) {
            this._overlayRef.detach();
            this._resetPopover();
        }
        this.destroyPopover();
    }
    /** Removes the popover from the DOM. */
    destroyPopover() {
        if (this._mouseoverTimer) {
            clearTimeout(this._mouseoverTimer);
            this._mouseoverTimer = null;
        }
        if (this._overlayRef) {
            this._overlayRef.dispose();
            this._overlayRef = null;
            this._cleanUpSubscriptions();
        }
        this._onDestroy.next();
        this._onDestroy.complete();
    }
    /** Focuses the popover trigger. */
    focus() {
        this._elementRef.nativeElement.focus();
    }
    /** The text direction of the containing app. */
    get dir() {
        return this._dir && this._dir.value === 'rtl' ? 'rtl' : 'ltr';
    }
    /**
     * This method ensures that the popover closes when the overlay backdrop is clicked.
     * We do not use first() here because doing so would not catch clicks from within
     * the popover, and it would fail to unsubscribe properly. Instead, we unsubscribe
     * explicitly when the popover is closed or destroyed.
     */
    _subscribeToBackdrop() {
        if (this._overlayRef) {
            /** Only subscribe to backdrop if trigger event is click */
            if (this.triggerEvent === 'click' && this.popover.closeOnBackdropClick === true) {
                this._overlayRef
                    .backdropClick()
                    .pipe(takeUntil(this.popoverClosed$), takeUntil(this._onDestroy))
                    .subscribe(() => {
                    this.popover._emitCloseEvent();
                });
            }
        }
    }
    _subscribeToDetachments() {
        if (this._overlayRef) {
            this._overlayRef
                .detachments()
                .pipe(takeUntil(this.popoverClosed$), takeUntil(this._onDestroy))
                .subscribe(() => {
                this._setPopoverClosed();
            });
        }
    }
    /**
     * This method sets the popover state to open and focuses the first item if
     * the popover was opened via the keyboard.
     */
    _initPopover() {
        this._setPopoverOpened();
    }
    /**
     * This method resets the popover when it's closed, most importantly restoring
     * focus to the popover trigger if the popover was opened via the keyboard.
     */
    _resetPopover() {
        this._setPopoverClosed();
        // Focus only needs to be reset to the host element if the popover was opened
        // by the keyboard and manually shifted to the first popover item.
        if (!this._openedByMouse) {
            this.focus();
        }
        this._openedByMouse = false;
    }
    /** set state rather than toggle to support triggers sharing a popover */
    _setPopoverOpened() {
        if (!this._popoverOpen) {
            this._popoverOpen = true;
            this.popoverOpened$.next();
            this.popoverOpened.emit();
        }
    }
    /** set state rather than toggle to support triggers sharing a popover */
    _setPopoverClosed() {
        if (this._popoverOpen) {
            this._popoverOpen = false;
            this.popoverClosed$.next();
            this.popoverClosed.emit();
        }
    }
    /**
     *  This method checks that a valid instance of MdPopover has been passed into
     *  mdPopoverTriggerFor. If not, an exception is thrown.
     */
    _checkPopover() {
        if (!this.popover) {
            throwMtxPopoverMissingError();
        }
    }
    /**
     *  This method creates the overlay from the provided popover's template and saves its
     *  OverlayRef so that it can be attached to the DOM when openPopover is called.
     */
    _createOverlay() {
        if (!this._overlayRef) {
            this._portal = new TemplatePortal(this.popover.templateRef, this._viewContainerRef);
            const config = this._getOverlayConfig();
            this._subscribeToPositions(config.positionStrategy);
            this._overlayRef = this._overlay.create(config);
        }
        return this._overlayRef;
    }
    /**
     * This method builds the configuration object needed to create the overlay, the OverlayConfig.
     * @returns OverlayConfig
     */
    _getOverlayConfig() {
        const overlayState = new OverlayConfig();
        overlayState.positionStrategy = this._getPosition();
        /** Display overlay backdrop if trigger event is click */
        if (this.triggerEvent === 'click') {
            overlayState.hasBackdrop = true;
            overlayState.backdropClass = 'cdk-overlay-transparent-backdrop';
        }
        overlayState.direction = this.dir;
        overlayState.scrollStrategy = this._getOverlayScrollStrategy(this.popover.scrollStrategy);
        return overlayState;
    }
    /**
     * This method returns the scroll strategy used by the cdk/overlay.
     */
    _getOverlayScrollStrategy(strategy) {
        switch (strategy) {
            case 'noop':
                return this._overlay.scrollStrategies.noop();
            case 'close':
                return this._overlay.scrollStrategies.close();
            case 'block':
                return this._overlay.scrollStrategies.block();
            case 'reposition':
            default:
                return this._overlay.scrollStrategies.reposition();
        }
    }
    /**
     * Listens to changes in the position of the overlay and sets the correct classes
     * on the popover based on the new position. This ensures the animation origin is always
     * correct, even if a fallback position is used for the overlay.
     */
    _subscribeToPositions(position) {
        this._positionSubscription = position.positionChanges.subscribe(change => {
            const posisionX = change.connectionPair.overlayX === 'start'
                ? 'after'
                : change.connectionPair.overlayX === 'end'
                    ? 'before'
                    : 'center';
            const posisionY = change.connectionPair.overlayY === 'top' ? 'below' : 'above';
            // required for ChangeDetectionStrategy.OnPush
            this._changeDetectorRef.markForCheck();
            this.popover.zone.run(() => {
                this.popover.xPosition = posisionX;
                this.popover.yPosition = posisionY;
                this.popover.setCurrentStyles();
                this.popover.setPositionClasses(posisionX, posisionY);
            });
        });
    }
    /**
     * This method builds the position strategy for the overlay, so the popover is properly connected
     * to the trigger.
     * @returns ConnectedPositionStrategy
     */
    _getPosition() {
        const [originX, origin2ndX, origin3rdX] = this.popover.xPosition === 'before'
            ? ['end', 'start', 'center']
            : this.popover.xPosition === 'after'
                ? ['start', 'end', 'center']
                : ['center', 'start', 'end'];
        const [overlayY, overlayFallbackY] = this.popover.yPosition === 'above' ? ['bottom', 'top'] : ['top', 'bottom'];
        /** Reverse overlayY and fallbackOverlayY when overlapTrigger is false */
        const originY = this.popover.overlapTrigger ? overlayY : overlayFallbackY;
        const originFallbackY = this.popover.overlapTrigger ? overlayFallbackY : overlayY;
        const overlayX = originX;
        const offsetX = this.popover.xOffset && !isNaN(Number(this.popover.xOffset))
            ? Number(this.popover.xOffset)
            : 0;
        const offsetY = this.popover.yOffset && !isNaN(Number(this.popover.yOffset))
            ? Number(this.popover.yOffset)
            : 0;
        /**
         * For overriding position element, when mtxPopoverTargetAt has a valid element reference.
         * Useful for sticking popover to parent element and offsetting arrow to trigger element.
         * If undefined defaults to the trigger element reference.
         */
        let element = this._elementRef;
        if (typeof this.targetElement !== 'undefined') {
            this.popover.containerPositioning = true;
            element = this.targetElement._elementRef;
        }
        return this._overlay
            .position()
            .flexibleConnectedTo(element)
            .withLockedPosition(true)
            .withPositions([
            {
                originX,
                originY,
                overlayX,
                overlayY,
                offsetY,
            },
            {
                originX: origin2ndX,
                originY,
                overlayX: origin2ndX,
                overlayY,
                offsetY,
            },
            {
                originX,
                originY: originFallbackY,
                overlayX,
                overlayY: overlayFallbackY,
                offsetY: -offsetY,
            },
            {
                originX: origin2ndX,
                originY: originFallbackY,
                overlayX: origin2ndX,
                overlayY: overlayFallbackY,
                offsetY: -offsetY,
            },
            {
                originX: origin3rdX,
                originY,
                overlayX: origin3rdX,
                overlayY,
                offsetY,
            },
            {
                originX: origin3rdX,
                originY: originFallbackY,
                overlayX: origin3rdX,
                overlayY: overlayFallbackY,
                offsetY: -offsetY,
            },
        ])
            .withDefaultOffsetX(offsetX)
            .withDefaultOffsetY(offsetY);
    }
    _cleanUpSubscriptions() {
        if (this._backdropSubscription) {
            this._backdropSubscription.unsubscribe();
        }
        if (this._positionSubscription) {
            this._positionSubscription.unsubscribe();
        }
        if (this._detachmentsSubscription) {
            this._detachmentsSubscription.unsubscribe();
        }
    }
    _handleMousedown(event) {
        if (event && !isFakeMousedownFromScreenReader(event)) {
            this._openedByMouse = true;
        }
    }
}
MtxPopoverTrigger.decorators = [
    { type: Directive, args: [{
                selector: '[mtxPopoverTriggerFor]',
                exportAs: 'mtxPopoverTrigger',
            },] }
];
/** @nocollapse */
MtxPopoverTrigger.ctorParameters = () => [
    { type: Overlay },
    { type: ElementRef },
    { type: ViewContainerRef },
    { type: Directionality, decorators: [{ type: Optional }] },
    { type: ChangeDetectorRef }
];
MtxPopoverTrigger.propDecorators = {
    ariaHaspopup: [{ type: HostBinding, args: ['attr.aria-haspopup',] }],
    popover: [{ type: Input, args: ['mtxPopoverTriggerFor',] }],
    targetElement: [{ type: Input, args: ['mtxPopoverTargetAt',] }],
    triggerEvent: [{ type: Input, args: ['mtxPopoverTriggerOn',] }],
    popoverOpened: [{ type: Output }],
    popoverClosed: [{ type: Output }],
    onClick: [{ type: HostListener, args: ['click', ['$event'],] }],
    onMouseEnter: [{ type: HostListener, args: ['mouseenter', ['$event'],] }],
    onMouseLeave: [{ type: HostListener, args: ['mouseleave', ['$event'],] }],
    _handleMousedown: [{ type: HostListener, args: ['mousedown', ['$event'],] }]
};

class MtxPopoverTarget {
    constructor(_elementRef) {
        this._elementRef = _elementRef;
    }
}
MtxPopoverTarget.decorators = [
    { type: Directive, args: [{
                selector: 'mtx-popover-target, [mtxPopoverTarget]',
                exportAs: 'mtxPopoverTarget',
            },] }
];
/** @nocollapse */
MtxPopoverTarget.ctorParameters = () => [
    { type: ElementRef }
];

class MtxPopoverModule {
}
MtxPopoverModule.decorators = [
    { type: NgModule, args: [{
                imports: [OverlayModule, CommonModule, A11yModule],
                exports: [MtxPopover, MtxPopoverTrigger, MtxPopoverTarget],
                declarations: [MtxPopover, MtxPopoverTrigger, MtxPopoverTarget],
            },] }
];

/**
 * Generated bundle index. Do not edit.
 */

export { MtxPopover, MtxPopoverModule, MtxPopoverTarget, MtxPopoverTrigger, transformPopover };
//# sourceMappingURL=mtxPopover.js.map
