import { AriaDescriber, FocusMonitor } from '@angular/cdk/a11y';
import { Directionality } from '@angular/cdk/bidi';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ESCAPE, hasModifierKey } from '@angular/cdk/keycodes';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Overlay, } from '@angular/cdk/overlay';
import { Platform, normalizePassiveListenerOptions } from '@angular/cdk/platform';
import { ComponentPortal } from '@angular/cdk/portal';
import { ScrollDispatcher } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Directive, ElementRef, Inject, InjectionToken, Input, NgZone, Optional, ViewContainerRef, ViewEncapsulation, TemplateRef, } from '@angular/core';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { mtxTooltipAnimations } from './tooltip-animations';
/** Time in ms to throttle repositioning after scroll events. */
export const SCROLL_THROTTLE_MS = 20;
/** CSS class that will be attached to the overlay panel. */
export const TOOLTIP_PANEL_CLASS = 'mtx-tooltip-panel';
/** Options used to bind passive event listeners. */
const passiveListenerOptions = normalizePassiveListenerOptions({ passive: true });
/**
 * Time between the user putting the pointer on a tooltip
 * trigger and the long press event being fired.
 */
const LONGPRESS_DELAY = 500;
/**
 * Creates an error to be thrown if the user supplied an invalid tooltip position.
 * @docs-private
 */
export function getMtxTooltipInvalidPositionError(position) {
    return Error(`Tooltip position "${position}" is invalid.`);
}
/** Injection token that determines the scroll handling while a tooltip is visible. */
export const MTX_TOOLTIP_SCROLL_STRATEGY = new InjectionToken('mtx-tooltip-scroll-strategy');
/** @docs-private */
export function MTX_TOOLTIP_SCROLL_STRATEGY_FACTORY(overlay) {
    return () => overlay.scrollStrategies.reposition({ scrollThrottle: SCROLL_THROTTLE_MS });
}
/** @docs-private */
export const MTX_TOOLTIP_SCROLL_STRATEGY_FACTORY_PROVIDER = {
    provide: MTX_TOOLTIP_SCROLL_STRATEGY,
    deps: [Overlay],
    useFactory: MTX_TOOLTIP_SCROLL_STRATEGY_FACTORY,
};
/** Injection token to be used to override the default options for `matTooltip`. */
export const MTX_TOOLTIP_DEFAULT_OPTIONS = new InjectionToken('mtx-tooltip-default-options', {
    providedIn: 'root',
    factory: MTX_TOOLTIP_DEFAULT_OPTIONS_FACTORY,
});
/** @docs-private */
export function MTX_TOOLTIP_DEFAULT_OPTIONS_FACTORY() {
    return {
        showDelay: 0,
        hideDelay: 0,
        touchendHideDelay: 1500,
    };
}
/**
 * Directive that attaches a material design tooltip to the host element. Animates the showing and
 * hiding of a tooltip provided position (defaults to below the element).
 *
 * https://material.io/design/components/tooltips.html
 */
export class MtxTooltip {
    constructor(_overlay, _elementRef, _scrollDispatcher, _viewContainerRef, _ngZone, _platform, _ariaDescriber, _focusMonitor, scrollStrategy, _dir, _defaultOptions) {
        this._overlay = _overlay;
        this._elementRef = _elementRef;
        this._scrollDispatcher = _scrollDispatcher;
        this._viewContainerRef = _viewContainerRef;
        this._ngZone = _ngZone;
        this._platform = _platform;
        this._ariaDescriber = _ariaDescriber;
        this._focusMonitor = _focusMonitor;
        this._dir = _dir;
        this._defaultOptions = _defaultOptions;
        this._position = 'below';
        this._disabled = false;
        this._viewInitialized = false;
        this._pointerExitEventsInitialized = false;
        /** The default delay in ms before showing the tooltip after show is called */
        this.showDelay = this._defaultOptions.showDelay;
        /** The default delay in ms before hiding the tooltip after hide is called */
        this.hideDelay = this._defaultOptions.hideDelay;
        /**
         * How touch gestures should be handled by the tooltip. On touch devices the tooltip directive
         * uses a long press gesture to show and hide, however it can conflict with the native browser
         * gestures. To work around the conflict, Angular Material disables native gestures on the
         * trigger, but that might not be desirable on particular elements (e.g. inputs and draggable
         * elements). The different values for this option configure the touch event handling as follows:
         * - `auto` - Enables touch gestures for all elements, but tries to avoid conflicts with native
         *   browser gestures on particular elements. In particular, it allows text selection on inputs
         *   and textareas, and preserves the native browser dragging on elements marked as `draggable`.
         * - `on` - Enables touch gestures for all elements and disables native
         *   browser gestures with no exceptions.
         * - `off` - Disables touch gestures. Note that this will prevent the tooltip from
         *   showing on touch devices.
         */
        this.touchGestures = 'auto';
        this._message = '';
        /** Manually-bound passive event listeners. */
        this._passiveListeners = [];
        /** Emits when the component is destroyed. */
        this._destroyed = new Subject();
        /**
         * Handles the keydown events on the host element.
         * Needs to be an arrow function so that we can use it in addEventListener.
         */
        this._handleKeydown = (event) => {
            if (this._isTooltipVisible() && event.keyCode === ESCAPE && !hasModifierKey(event)) {
                event.preventDefault();
                event.stopPropagation();
                this._ngZone.run(() => this.hide(0));
            }
        };
        this._scrollStrategy = scrollStrategy;
        if (_defaultOptions) {
            if (_defaultOptions.position) {
                this.position = _defaultOptions.position;
            }
            if (_defaultOptions.touchGestures) {
                this.touchGestures = _defaultOptions.touchGestures;
            }
        }
        _ngZone.runOutsideAngular(() => {
            _elementRef.nativeElement.addEventListener('keydown', this._handleKeydown);
        });
    }
    /** Allows the user to define the position of the tooltip relative to the parent element */
    get position() {
        return this._position;
    }
    set position(value) {
        if (value !== this._position) {
            this._position = value;
            if (this._overlayRef) {
                this._updatePosition();
                if (this._tooltipInstance) {
                    this._tooltipInstance.show(0);
                }
                this._overlayRef.updatePosition();
            }
        }
    }
    /** Disables the display of the tooltip. */
    get disabled() {
        return this._disabled;
    }
    set disabled(value) {
        this._disabled = coerceBooleanProperty(value);
        // If tooltip is disabled, hide immediately.
        if (this._disabled) {
            this.hide(0);
        }
        else {
            this._setupPointerEnterEventsIfNeeded();
        }
    }
    /** The message to be displayed in the tooltip */
    get message() {
        return this._message;
    }
    set message(value) {
        this._ariaDescriber.removeDescription(this._elementRef.nativeElement, this._message);
        // TODO: If the message is a TemplateRef, it's hard to support a11y.
        // If the message is not a string (e.g. number), convert it to a string and trim it.
        this._message = value instanceof TemplateRef ? value : value != null ? `${value}`.trim() : '';
        if (!this._message && this._isTooltipVisible()) {
            this.hide(0);
        }
        else {
            this._setupPointerEnterEventsIfNeeded();
            this._updateTooltipMessage();
            this._ngZone.runOutsideAngular(() => {
                // The `AriaDescriber` has some functionality that avoids adding a description if it's the
                // same as the `aria-label` of an element, however we can't know whether the tooltip trigger
                // has a data-bound `aria-label` or when it'll be set for the first time. We can avoid the
                // issue by deferring the description by a tick so Angular has time to set the `aria-label`.
                Promise.resolve().then(() => {
                    this._ariaDescriber.describe(this._elementRef.nativeElement, this.message);
                });
            });
        }
    }
    /** Classes to be passed to the tooltip. Supports the same syntax as `ngClass`. */
    get tooltipClass() {
        return this._tooltipClass;
    }
    set tooltipClass(value) {
        this._tooltipClass = value;
        if (this._tooltipInstance) {
            this._setTooltipClass(this._tooltipClass);
        }
    }
    ngAfterViewInit() {
        // This needs to happen after view init so the initial values for all inputs have been set.
        this._viewInitialized = true;
        this._setupPointerEnterEventsIfNeeded();
        this._focusMonitor
            .monitor(this._elementRef)
            .pipe(takeUntil(this._destroyed))
            .subscribe(origin => {
            // Note that the focus monitor runs outside the Angular zone.
            if (!origin) {
                this._ngZone.run(() => this.hide(0));
            }
            else if (origin === 'keyboard') {
                this._ngZone.run(() => this.show());
            }
        });
    }
    /**
     * Dispose the tooltip when destroyed.
     */
    ngOnDestroy() {
        const nativeElement = this._elementRef.nativeElement;
        clearTimeout(this._touchstartTimeout);
        if (this._overlayRef) {
            this._overlayRef.dispose();
            this._tooltipInstance = null;
        }
        // Clean up the event listeners set in the constructor
        nativeElement.removeEventListener('keydown', this._handleKeydown);
        this._passiveListeners.forEach(([event, listener]) => {
            nativeElement.removeEventListener(event, listener, passiveListenerOptions);
        });
        this._passiveListeners.length = 0;
        this._destroyed.next();
        this._destroyed.complete();
        this._ariaDescriber.removeDescription(nativeElement, this.message);
        this._focusMonitor.stopMonitoring(nativeElement);
    }
    /** Shows the tooltip after the delay in ms, defaults to tooltip-delay-show or 0ms if no input */
    show(delay = this.showDelay) {
        if (this.disabled ||
            !this.message ||
            (this._isTooltipVisible() &&
                !this._tooltipInstance._showTimeoutId &&
                !this._tooltipInstance._hideTimeoutId)) {
            return;
        }
        const overlayRef = this._createOverlay();
        this._detach();
        this._portal = this._portal || new ComponentPortal(TooltipComponent, this._viewContainerRef);
        this._tooltipInstance = overlayRef.attach(this._portal).instance;
        this._tooltipInstance
            .afterHidden()
            .pipe(takeUntil(this._destroyed))
            .subscribe(() => this._detach());
        this._setTooltipClass(this._tooltipClass);
        this._updateTooltipMessage();
        this._tooltipInstance.show(delay);
    }
    /** Hides the tooltip after the delay in ms, defaults to tooltip-delay-hide or 0ms if no input */
    hide(delay = this.hideDelay) {
        if (this._tooltipInstance) {
            this._tooltipInstance.hide(delay);
        }
    }
    /** Shows/hides the tooltip */
    toggle() {
        this._isTooltipVisible() ? this.hide() : this.show();
    }
    /** Returns true if the tooltip is currently visible to the user */
    _isTooltipVisible() {
        return !!this._tooltipInstance && this._tooltipInstance.isVisible();
    }
    /** Create the overlay config and position strategy */
    _createOverlay() {
        if (this._overlayRef) {
            return this._overlayRef;
        }
        const scrollableAncestors = this._scrollDispatcher.getAncestorScrollContainers(this._elementRef);
        // Create connected position strategy that listens for scroll events to reposition.
        const strategy = this._overlay
            .position()
            .flexibleConnectedTo(this._elementRef)
            .withTransformOriginOn('.mtx-tooltip')
            .withFlexibleDimensions(false)
            .withViewportMargin(8)
            .withScrollableContainers(scrollableAncestors);
        strategy.positionChanges.pipe(takeUntil(this._destroyed)).subscribe(change => {
            if (this._tooltipInstance) {
                if (change.scrollableViewProperties.isOverlayClipped && this._tooltipInstance.isVisible()) {
                    // After position changes occur and the overlay is clipped by
                    // a parent scrollable then close the tooltip.
                    this._ngZone.run(() => this.hide(0));
                }
            }
        });
        this._overlayRef = this._overlay.create({
            direction: this._dir,
            positionStrategy: strategy,
            panelClass: TOOLTIP_PANEL_CLASS,
            scrollStrategy: this._scrollStrategy(),
        });
        this._updatePosition();
        this._overlayRef
            .detachments()
            .pipe(takeUntil(this._destroyed))
            .subscribe(() => this._detach());
        return this._overlayRef;
    }
    /** Detaches the currently-attached tooltip. */
    _detach() {
        if (this._overlayRef && this._overlayRef.hasAttached()) {
            this._overlayRef.detach();
        }
        this._tooltipInstance = null;
    }
    /** Updates the position of the current tooltip. */
    _updatePosition() {
        const position = this._overlayRef.getConfig()
            .positionStrategy;
        const origin = this._getOrigin();
        const overlay = this._getOverlayPosition();
        position.withPositions([
            Object.assign(Object.assign({}, origin.main), overlay.main),
            Object.assign(Object.assign({}, origin.fallback), overlay.fallback),
        ]);
    }
    /**
     * Returns the origin position and a fallback position based on the user's position preference.
     * The fallback position is the inverse of the origin (e.g. `'below' -> 'above'`).
     */
    _getOrigin() {
        const isLtr = !this._dir || this._dir.value === 'ltr';
        const position = this.position;
        let originPosition;
        if (position === 'above' || position === 'below') {
            originPosition = { originX: 'center', originY: position === 'above' ? 'top' : 'bottom' };
        }
        else if (position === 'before' ||
            (position === 'left' && isLtr) ||
            (position === 'right' && !isLtr)) {
            originPosition = { originX: 'start', originY: 'center' };
        }
        else if (position === 'after' ||
            (position === 'right' && isLtr) ||
            (position === 'left' && !isLtr)) {
            originPosition = { originX: 'end', originY: 'center' };
        }
        else {
            throw getMtxTooltipInvalidPositionError(position);
        }
        const { x, y } = this._invertPosition(originPosition.originX, originPosition.originY);
        return {
            main: originPosition,
            fallback: { originX: x, originY: y },
        };
    }
    /** Returns the overlay position and a fallback position based on the user's preference */
    _getOverlayPosition() {
        const isLtr = !this._dir || this._dir.value === 'ltr';
        const position = this.position;
        let overlayPosition;
        if (position === 'above') {
            overlayPosition = { overlayX: 'center', overlayY: 'bottom' };
        }
        else if (position === 'below') {
            overlayPosition = { overlayX: 'center', overlayY: 'top' };
        }
        else if (position === 'before' ||
            (position === 'left' && isLtr) ||
            (position === 'right' && !isLtr)) {
            overlayPosition = { overlayX: 'end', overlayY: 'center' };
        }
        else if (position === 'after' ||
            (position === 'right' && isLtr) ||
            (position === 'left' && !isLtr)) {
            overlayPosition = { overlayX: 'start', overlayY: 'center' };
        }
        else {
            throw getMtxTooltipInvalidPositionError(position);
        }
        const { x, y } = this._invertPosition(overlayPosition.overlayX, overlayPosition.overlayY);
        return {
            main: overlayPosition,
            fallback: { overlayX: x, overlayY: y },
        };
    }
    /** Updates the tooltip message and repositions the overlay according to the new message length */
    _updateTooltipMessage() {
        // Must wait for the message to be painted to the tooltip so that the overlay can properly
        // calculate the correct positioning based on the size of the text.
        if (this._tooltipInstance) {
            this._tooltipInstance.message = this.message;
            this._tooltipInstance._markForCheck();
            this._ngZone.onMicrotaskEmpty
                .asObservable()
                .pipe(take(1), takeUntil(this._destroyed))
                .subscribe(() => {
                if (this._tooltipInstance) {
                    this._overlayRef.updatePosition();
                }
            });
        }
    }
    /** Updates the tooltip class */
    _setTooltipClass(tooltipClass) {
        if (this._tooltipInstance) {
            this._tooltipInstance.tooltipClass = tooltipClass;
            this._tooltipInstance._markForCheck();
        }
    }
    /** Inverts an overlay position. */
    _invertPosition(x, y) {
        if (this.position === 'above' || this.position === 'below') {
            if (y === 'top') {
                y = 'bottom';
            }
            else if (y === 'bottom') {
                y = 'top';
            }
        }
        else {
            if (x === 'end') {
                x = 'start';
            }
            else if (x === 'start') {
                x = 'end';
            }
        }
        return { x, y };
    }
    /** Binds the pointer events to the tooltip trigger. */
    _setupPointerEnterEventsIfNeeded() {
        // Optimization: Defer hooking up events if there's no message or the tooltip is disabled.
        if (this._disabled ||
            !this.message ||
            !this._viewInitialized ||
            this._passiveListeners.length) {
            return;
        }
        // The mouse events shouldn't be bound on mobile devices, because they can prevent the
        // first tap from firing its click event or can cause the tooltip to open for clicks.
        if (this._platformSupportsMouseEvents()) {
            this._passiveListeners.push([
                'mouseenter',
                () => {
                    this._setupPointerExitEventsIfNeeded();
                    this.show();
                },
            ]);
        }
        else if (this.touchGestures !== 'off') {
            this._disableNativeGesturesIfNecessary();
            this._passiveListeners.push([
                'touchstart',
                () => {
                    // Note that it's important that we don't `preventDefault` here,
                    // because it can prevent click events from firing on the element.
                    this._setupPointerExitEventsIfNeeded();
                    clearTimeout(this._touchstartTimeout);
                    this._touchstartTimeout = setTimeout(() => this.show(), LONGPRESS_DELAY);
                },
            ]);
        }
        this._addListeners(this._passiveListeners);
    }
    _setupPointerExitEventsIfNeeded() {
        if (this._pointerExitEventsInitialized) {
            return;
        }
        this._pointerExitEventsInitialized = true;
        const exitListeners = [];
        if (this._platformSupportsMouseEvents()) {
            exitListeners.push(['mouseleave', () => this.hide()]);
        }
        else if (this.touchGestures !== 'off') {
            this._disableNativeGesturesIfNecessary();
            const touchendListener = () => {
                clearTimeout(this._touchstartTimeout);
                this.hide(this._defaultOptions.touchendHideDelay);
            };
            exitListeners.push(['touchend', touchendListener], ['touchcancel', touchendListener]);
        }
        this._addListeners(exitListeners);
        this._passiveListeners.push(...exitListeners);
    }
    _addListeners(listeners) {
        listeners.forEach(([event, listener]) => {
            this._elementRef.nativeElement.addEventListener(event, listener, passiveListenerOptions);
        });
    }
    _platformSupportsMouseEvents() {
        return !this._platform.IOS && !this._platform.ANDROID;
    }
    /** Disables the native browser gestures, based on how the tooltip has been configured. */
    _disableNativeGesturesIfNecessary() {
        const gestures = this.touchGestures;
        if (gestures !== 'off') {
            const element = this._elementRef.nativeElement;
            const style = element.style;
            // If gestures are set to `auto`, we don't disable text selection on inputs and
            // textareas, because it prevents the user from typing into them on iOS Safari.
            if (gestures === 'on' || (element.nodeName !== 'INPUT' && element.nodeName !== 'TEXTAREA')) {
                style.userSelect = style.msUserSelect = style.webkitUserSelect = style.MozUserSelect =
                    'none';
            }
            // If we have `auto` gestures and the element uses native HTML dragging,
            // we don't set `-webkit-user-drag` because it prevents the native behavior.
            if (gestures === 'on' || !element.draggable) {
                style.webkitUserDrag = 'none';
            }
            style.touchAction = 'none';
            style.webkitTapHighlightColor = 'transparent';
        }
    }
}
MtxTooltip.decorators = [
    { type: Directive, args: [{
                selector: '[mtxTooltip]',
                exportAs: 'mtxTooltip',
                host: {
                    class: 'mtx-tooltip-trigger',
                },
            },] }
];
/** @nocollapse */
MtxTooltip.ctorParameters = () => [
    { type: Overlay },
    { type: ElementRef },
    { type: ScrollDispatcher },
    { type: ViewContainerRef },
    { type: NgZone },
    { type: Platform },
    { type: AriaDescriber },
    { type: FocusMonitor },
    { type: undefined, decorators: [{ type: Inject, args: [MTX_TOOLTIP_SCROLL_STRATEGY,] }] },
    { type: Directionality, decorators: [{ type: Optional }] },
    { type: undefined, decorators: [{ type: Optional }, { type: Inject, args: [MTX_TOOLTIP_DEFAULT_OPTIONS,] }] }
];
MtxTooltip.propDecorators = {
    position: [{ type: Input, args: ['mtxTooltipPosition',] }],
    disabled: [{ type: Input, args: ['mtxTooltipDisabled',] }],
    showDelay: [{ type: Input, args: ['mtxTooltipShowDelay',] }],
    hideDelay: [{ type: Input, args: ['mtxTooltipHideDelay',] }],
    touchGestures: [{ type: Input, args: ['mtxTooltipTouchGestures',] }],
    message: [{ type: Input, args: ['mtxTooltip',] }],
    tooltipClass: [{ type: Input, args: ['mtxTooltipClass',] }]
};
/**
 * Internal component that wraps the tooltip's content.
 * @docs-private
 */
export class TooltipComponent {
    constructor(_changeDetectorRef, _breakpointObserver) {
        this._changeDetectorRef = _changeDetectorRef;
        this._breakpointObserver = _breakpointObserver;
        /** Property watched by the animation framework to show or hide the tooltip */
        this._visibility = 'initial';
        /** Whether interactions on the page should close the tooltip */
        this._closeOnInteraction = false;
        /** Subject for notifying that the tooltip has been hidden from the view */
        this._onHide = new Subject();
        /** Stream that emits whether the user has a handset-sized display.  */
        this._isHandset = this._breakpointObserver.observe(Breakpoints.Handset);
    }
    _isTemplateRef(obj) {
        return obj instanceof TemplateRef;
    }
    /**
     * Shows the tooltip with an animation originating from the provided origin
     * @param delay Amount of milliseconds to the delay showing the tooltip.
     */
    show(delay) {
        // Cancel the delayed hide if it is scheduled
        if (this._hideTimeoutId) {
            clearTimeout(this._hideTimeoutId);
            this._hideTimeoutId = null;
        }
        // Body interactions should cancel the tooltip if there is a delay in showing.
        this._closeOnInteraction = true;
        this._showTimeoutId = setTimeout(() => {
            this._visibility = 'visible';
            this._showTimeoutId = null;
            // Mark for check so if any parent component has set the
            // ChangeDetectionStrategy to OnPush it will be checked anyways
            this._markForCheck();
        }, delay);
    }
    /**
     * Begins the animation to hide the tooltip after the provided delay in ms.
     * @param delay Amount of milliseconds to delay showing the tooltip.
     */
    hide(delay) {
        // Cancel the delayed show if it is scheduled
        if (this._showTimeoutId) {
            clearTimeout(this._showTimeoutId);
            this._showTimeoutId = null;
        }
        this._hideTimeoutId = setTimeout(() => {
            this._visibility = 'hidden';
            this._hideTimeoutId = null;
            // Mark for check so if any parent component has set the
            // ChangeDetectionStrategy to OnPush it will be checked anyways
            this._markForCheck();
        }, delay);
    }
    /** Returns an observable that notifies when the tooltip has been hidden from view. */
    afterHidden() {
        return this._onHide.asObservable();
    }
    /** Whether the tooltip is being displayed. */
    isVisible() {
        return this._visibility === 'visible';
    }
    ngOnDestroy() {
        this._onHide.complete();
    }
    _animationStart() {
        this._closeOnInteraction = false;
    }
    _animationDone(event) {
        const toState = event.toState;
        if (toState === 'hidden' && !this.isVisible()) {
            this._onHide.next();
        }
        if (toState === 'visible' || toState === 'hidden') {
            this._closeOnInteraction = true;
        }
    }
    /**
     * Interactions on the HTML body should close the tooltip immediately as defined in the
     * material design spec.
     * https://material.io/design/components/tooltips.html#behavior
     */
    _handleBodyInteraction() {
        if (this._closeOnInteraction) {
            this.hide(0);
        }
    }
    /**
     * Marks that the tooltip needs to be checked in the next change detection run.
     * Mainly used for rendering the initial text before positioning a tooltip, which
     * can be problematic in components with OnPush change detection.
     */
    _markForCheck() {
        this._changeDetectorRef.markForCheck();
    }
}
TooltipComponent.decorators = [
    { type: Component, args: [{
                selector: 'mtx-tooltip-component',
                template: "<div class=\"mtx-tooltip\"\n     [ngClass]=\"tooltipClass\"\n     [class.mtx-tooltip-handset]=\"(_isHandset | async)?.matches\"\n     [@state]=\"_visibility\"\n     (@state.start)=\"_animationStart()\"\n     (@state.done)=\"_animationDone($event)\">\n  <ng-template [ngIf]=\"_isTemplateRef(message)\" [ngIfElse]=\"msgStrTpl\">\n    <ng-template [ngTemplateOutlet]=\"$any(message)\"></ng-template>\n  </ng-template>\n  <ng-template #msgStrTpl>{{message}}</ng-template>\n</div>\n",
                encapsulation: ViewEncapsulation.None,
                changeDetection: ChangeDetectionStrategy.OnPush,
                animations: [mtxTooltipAnimations.tooltipState],
                host: {
                    // Forces the element to have a layout in IE and Edge. This fixes issues where the element
                    // won't be rendered if the animations are disabled or there is no web animations polyfill.
                    '[style.zoom]': '_visibility === "visible" ? 1 : null',
                    '(body:click)': 'this._handleBodyInteraction()',
                    'aria-hidden': 'true',
                },
                styles: [".mtx-tooltip-panel{pointer-events:none!important}.mtx-tooltip{color:#fff;border-radius:4px;margin:14px;max-width:250px;padding-left:8px;padding-right:8px;overflow:hidden;text-overflow:ellipsis}.cdk-high-contrast-active .mtx-tooltip{outline:1px solid}.mtx-tooltip-handset{margin:24px;padding-left:16px;padding-right:16px}"]
            },] }
];
/** @nocollapse */
TooltipComponent.ctorParameters = () => [
    { type: ChangeDetectorRef },
    { type: BreakpointObserver }
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHRpcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL2V4dGVuc2lvbnMvdG9vbHRpcC90b29sdGlwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDaEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ25ELE9BQU8sRUFBZ0IscUJBQXFCLEVBQWUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RixPQUFPLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxXQUFXLEVBQW1CLE1BQU0scUJBQXFCLENBQUM7QUFDdkYsT0FBTyxFQUlMLE9BQU8sR0FLUixNQUFNLHNCQUFzQixDQUFDO0FBQzlCLE9BQU8sRUFBRSxRQUFRLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDdEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDMUQsT0FBTyxFQUNMLHVCQUF1QixFQUN2QixpQkFBaUIsRUFDakIsU0FBUyxFQUNULFNBQVMsRUFDVCxVQUFVLEVBQ1YsTUFBTSxFQUNOLGNBQWMsRUFDZCxLQUFLLEVBQ0wsTUFBTSxFQUVOLFFBQVEsRUFDUixnQkFBZ0IsRUFDaEIsaUJBQWlCLEVBRWpCLFdBQVcsR0FDWixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQWMsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQzNDLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFakQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFjNUQsZ0VBQWdFO0FB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UUFDcEIsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNkO0lBQ0gsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxhQUFhO1FBQ1gsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3pDLENBQUM7OztZQTdJRixTQUFTLFNBQUM7Z0JBQ1QsUUFBUSxFQUFFLHVCQUF1QjtnQkFDakMseWVBQTJCO2dCQUUzQixhQUFhLEVBQUUsaUJBQWlCLENBQUMsSUFBSTtnQkFDckMsZUFBZSxFQUFFLHVCQUF1QixDQUFDLE1BQU07Z0JBQy9DLFVBQVUsRUFBRSxDQUFDLG9CQUFvQixDQUFDLFlBQVksQ0FBQztnQkFDL0MsSUFBSSxFQUFFO29CQUNKLDBGQUEwRjtvQkFDMUYsMkZBQTJGO29CQUMzRixjQUFjLEVBQUUsc0NBQXNDO29CQUN0RCxjQUFjLEVBQUUsK0JBQStCO29CQUMvQyxhQUFhLEVBQUUsTUFBTTtpQkFDdEI7O2FBQ0Y7Ozs7WUFucUJDLGlCQUFpQjtZQWhCVixrQkFBa0IiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBbmltYXRpb25FdmVudCB9IGZyb20gJ0Bhbmd1bGFyL2FuaW1hdGlvbnMnO1xuaW1wb3J0IHsgQXJpYURlc2NyaWJlciwgRm9jdXNNb25pdG9yIH0gZnJvbSAnQGFuZ3VsYXIvY2RrL2ExMXknO1xuaW1wb3J0IHsgRGlyZWN0aW9uYWxpdHkgfSBmcm9tICdAYW5ndWxhci9jZGsvYmlkaSc7XG5pbXBvcnQgeyBCb29sZWFuSW5wdXQsIGNvZXJjZUJvb2xlYW5Qcm9wZXJ0eSwgTnVtYmVySW5wdXQgfSBmcm9tICdAYW5ndWxhci9jZGsvY29lcmNpb24nO1xuaW1wb3J0IHsgRVNDQVBFLCBoYXNNb2RpZmllcktleSB9IGZyb20gJ0Bhbmd1bGFyL2Nkay9rZXljb2Rlcyc7XG5pbXBvcnQgeyBCcmVha3BvaW50T2JzZXJ2ZXIsIEJyZWFrcG9pbnRzLCBCcmVha3BvaW50U3RhdGUgfSBmcm9tICdAYW5ndWxhci9jZGsvbGF5b3V0JztcbmltcG9ydCB7XG4gIEZsZXhpYmxlQ29ubmVjdGVkUG9zaXRpb25TdHJhdGVneSxcbiAgSG9yaXpvbnRhbENvbm5lY3Rpb25Qb3MsXG4gIE9yaWdpbkNvbm5lY3Rpb25Qb3NpdGlvbixcbiAgT3ZlcmxheSxcbiAgT3ZlcmxheUNvbm5lY3Rpb25Qb3NpdGlvbixcbiAgT3ZlcmxheVJlZixcbiAgU2Nyb2xsU3RyYXRlZ3ksXG4gIFZlcnRpY2FsQ29ubmVjdGlvblBvcyxcbn0gZnJvbSAnQGFuZ3VsYXIvY2RrL292ZXJsYXknO1xuaW1wb3J0IHsgUGxhdGZvcm0sIG5vcm1hbGl6ZVBhc3NpdmVMaXN0ZW5lck9wdGlvbnMgfSBmcm9tICdAYW5ndWxhci9jZGsvcGxhdGZvcm0nO1xuaW1wb3J0IHsgQ29tcG9uZW50UG9ydGFsIH0gZnJvbSAnQGFuZ3VsYXIvY2RrL3BvcnRhbCc7XG5pbXBvcnQgeyBTY3JvbGxEaXNwYXRjaGVyIH0gZnJvbSAnQGFuZ3VsYXIvY2RrL3Njcm9sbGluZyc7XG5pbXBvcnQge1xuICBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneSxcbiAgQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gIENvbXBvbmVudCxcbiAgRGlyZWN0aXZlLFxuICBFbGVtZW50UmVmLFxuICBJbmplY3QsXG4gIEluamVjdGlvblRva2VuLFxuICBJbnB1dCxcbiAgTmdab25lLFxuICBPbkRlc3Ryb3ksXG4gIE9wdGlvbmFsLFxuICBWaWV3Q29udGFpbmVyUmVmLFxuICBWaWV3RW5jYXBzdWxhdGlvbixcbiAgQWZ0ZXJWaWV3SW5pdCxcbiAgVGVtcGxhdGVSZWYsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgdGFrZSwgdGFrZVVudGlsIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQgeyBtdHhUb29sdGlwQW5pbWF0aW9ucyB9IGZyb20gJy4vdG9vbHRpcC1hbmltYXRpb25zJztcblxuLyoqIFBvc3NpYmxlIHBvc2l0aW9ucyBmb3IgYSB0b29sdGlwLiAqL1xuZXhwb3J0IHR5cGUgVG9vbHRpcFBvc2l0aW9uID0gJ2xlZnQnIHwgJ3JpZ2h0JyB8ICdhYm92ZScgfCAnYmVsb3cnIHwgJ2JlZm9yZScgfCAnYWZ0ZXInO1xuXG4vKipcbiAqIE9wdGlvbnMgZm9yIGhvdyB0aGUgdG9vbHRpcCB0cmlnZ2VyIHNob3VsZCBoYW5kbGUgdG91Y2ggZ2VzdHVyZXMuXG4gKiBTZWUgYE10eFRvb2x0aXAudG91Y2hHZXN0dXJlc2AgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKi9cbmV4cG9ydCB0eXBlIFRvb2x0aXBUb3VjaEdlc3R1cmVzID0gJ2F1dG8nIHwgJ29uJyB8ICdvZmYnO1xuXG4vKiogUG9zc2libGUgdmlzaWJpbGl0eSBzdGF0ZXMgb2YgYSB0b29sdGlwLiAqL1xuZXhwb3J0IHR5cGUgVG9vbHRpcFZpc2liaWxpdHkgPSAnaW5pdGlhbCcgfCAndmlzaWJsZScgfCAnaGlkZGVuJztcblxuLyoqIFRpbWUgaW4gbXMgdG8gdGhyb3R0bGUgcmVwb3NpdGlvbmluZyBhZnRlciBzY3JvbGwgZXZlbnRzLiAqL1xuZXhwb3J0IGNvbnN0IFNDUk9MTF9USFJPVFRMRV9NUyA9IDIwO1xuXG4vKiogQ1NTIGNsYXNzIHRoYXQgd2lsbCBiZSBhdHRhY2hlZCB0byB0aGUgb3ZlcmxheSBwYW5lbC4gKi9cbmV4cG9ydCBjb25zdCBUT09MVElQX1BBTkVMX0NMQVNTID0gJ210eC10b29sdGlwLXBhbmVsJztcblxuLyoqIE9wdGlvbnMgdXNlZCB0byBiaW5kIHBhc3NpdmUgZXZlbnQgbGlzdGVuZXJzLiAqL1xuY29uc3QgcGFzc2l2ZUxpc3RlbmVyT3B0aW9ucyA9IG5vcm1hbGl6ZVBhc3NpdmVMaXN0ZW5lck9wdGlvbnMoeyBwYXNzaXZlOiB0cnVlIH0pO1xuXG4vKipcbiAqIFRpbWUgYmV0d2VlbiB0aGUgdXNlciBwdXR0aW5nIHRoZSBwb2ludGVyIG9uIGEgdG9vbHRpcFxuICogdHJpZ2dlciBhbmQgdGhlIGxvbmcgcHJlc3MgZXZlbnQgYmVpbmcgZmlyZWQuXG4gKi9cbmNvbnN0IExPTkdQUkVTU19ERUxBWSA9IDUwMDtcblxuLyoqXG4gKiBDcmVhdGVzIGFuIGVycm9yIHRvIGJlIHRocm93biBpZiB0aGUgdXNlciBzdXBwbGllZCBhbiBpbnZhbGlkIHRvb2x0aXAgcG9zaXRpb24uXG4gKiBAZG9jcy1wcml2YXRlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRNdHhUb29sdGlwSW52YWxpZFBvc2l0aW9uRXJyb3IocG9zaXRpb246IHN0cmluZykge1xuICByZXR1cm4gRXJyb3IoYFRvb2x0aXAgcG9zaXRpb24gXCIke3Bvc2l0aW9ufVwiIGlzIGludmFsaWQuYCk7XG59XG5cbi8qKiBJbmplY3Rpb24gdG9rZW4gdGhhdCBkZXRlcm1pbmVzIHRoZSBzY3JvbGwgaGFuZGxpbmcgd2hpbGUgYSB0b29sdGlwIGlzIHZpc2libGUuICovXG5leHBvcnQgY29uc3QgTVRYX1RPT0xUSVBfU0NST0xMX1NUUkFURUdZID0gbmV3IEluamVjdGlvblRva2VuPCgpID0+IFNjcm9sbFN0cmF0ZWd5PihcbiAgJ210eC10b29sdGlwLXNjcm9sbC1zdHJhdGVneSdcbik7XG5cbi8qKiBAZG9jcy1wcml2YXRlICovXG5leHBvcnQgZnVuY3Rpb24gTVRYX1RPT0xUSVBfU0NST0xMX1NUUkFURUdZX0ZBQ1RPUlkob3ZlcmxheTogT3ZlcmxheSk6ICgpID0+IFNjcm9sbFN0cmF0ZWd5IHtcbiAgcmV0dXJuICgpID0+IG92ZXJsYXkuc2Nyb2xsU3RyYXRlZ2llcy5yZXBvc2l0aW9uKHsgc2Nyb2xsVGhyb3R0bGU6IFNDUk9MTF9USFJPVFRMRV9NUyB9KTtcbn1cblxuLyoqIEBkb2NzLXByaXZhdGUgKi9cbmV4cG9ydCBjb25zdCBNVFhfVE9PTFRJUF9TQ1JPTExfU1RSQVRFR1lfRkFDVE9SWV9QUk9WSURFUiA9IHtcbiAgcHJvdmlkZTogTVRYX1RPT0xUSVBfU0NST0xMX1NUUkFURUdZLFxuICBkZXBzOiBbT3ZlcmxheV0sXG4gIHVzZUZhY3Rvcnk6IE1UWF9UT09MVElQX1NDUk9MTF9TVFJBVEVHWV9GQUNUT1JZLFxufTtcblxuLyoqIERlZmF1bHQgYG10eFRvb2x0aXBgIG9wdGlvbnMgdGhhdCBjYW4gYmUgb3ZlcnJpZGRlbi4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTXR4VG9vbHRpcERlZmF1bHRPcHRpb25zIHtcbiAgc2hvd0RlbGF5OiBudW1iZXI7XG4gIGhpZGVEZWxheTogbnVtYmVyO1xuICB0b3VjaGVuZEhpZGVEZWxheTogbnVtYmVyO1xuICB0b3VjaEdlc3R1cmVzPzogVG9vbHRpcFRvdWNoR2VzdHVyZXM7XG4gIHBvc2l0aW9uPzogVG9vbHRpcFBvc2l0aW9uO1xufVxuXG4vKiogSW5qZWN0aW9uIHRva2VuIHRvIGJlIHVzZWQgdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3IgYG1hdFRvb2x0aXBgLiAqL1xuZXhwb3J0IGNvbnN0IE1UWF9UT09MVElQX0RFRkFVTFRfT1BUSU9OUyA9IG5ldyBJbmplY3Rpb25Ub2tlbjxNdHhUb29sdGlwRGVmYXVsdE9wdGlvbnM+KFxuICAnbXR4LXRvb2x0aXAtZGVmYXVsdC1vcHRpb25zJyxcbiAge1xuICAgIHByb3ZpZGVkSW46ICdyb290JyxcbiAgICBmYWN0b3J5OiBNVFhfVE9PTFRJUF9ERUZBVUxUX09QVElPTlNfRkFDVE9SWSxcbiAgfVxuKTtcblxuLyoqIEBkb2NzLXByaXZhdGUgKi9cbmV4cG9ydCBmdW5jdGlvbiBNVFhfVE9PTFRJUF9ERUZBVUxUX09QVElPTlNfRkFDVE9SWSgpOiBNdHhUb29sdGlwRGVmYXVsdE9wdGlvbnMge1xuICByZXR1cm4ge1xuICAgIHNob3dEZWxheTogMCxcbiAgICBoaWRlRGVsYXk6IDAsXG4gICAgdG91Y2hlbmRIaWRlRGVsYXk6IDE1MDAsXG4gIH07XG59XG5cbi8qKlxuICogRGlyZWN0aXZlIHRoYXQgYXR0YWNoZXMgYSBtYXRlcmlhbCBkZXNpZ24gdG9vbHRpcCB0byB0aGUgaG9zdCBlbGVtZW50LiBBbmltYXRlcyB0aGUgc2hvd2luZyBhbmRcbiAqIGhpZGluZyBvZiBhIHRvb2x0aXAgcHJvdmlkZWQgcG9zaXRpb24gKGRlZmF1bHRzIHRvIGJlbG93IHRoZSBlbGVtZW50KS5cbiAqXG4gKiBodHRwczovL21hdGVyaWFsLmlvL2Rlc2lnbi9jb21wb25lbnRzL3Rvb2x0aXBzLmh0bWxcbiAqL1xuQERpcmVjdGl2ZSh7XG4gIHNlbGVjdG9yOiAnW210eFRvb2x0aXBdJyxcbiAgZXhwb3J0QXM6ICdtdHhUb29sdGlwJyxcbiAgaG9zdDoge1xuICAgIGNsYXNzOiAnbXR4LXRvb2x0aXAtdHJpZ2dlcicsXG4gIH0sXG59KVxuZXhwb3J0IGNsYXNzIE10eFRvb2x0aXAgaW1wbGVtZW50cyBPbkRlc3Ryb3ksIEFmdGVyVmlld0luaXQge1xuICBfb3ZlcmxheVJlZiE6IE92ZXJsYXlSZWYgfCBudWxsO1xuICBfdG9vbHRpcEluc3RhbmNlITogVG9vbHRpcENvbXBvbmVudCB8IG51bGw7XG5cbiAgcHJpdmF0ZSBfcG9ydGFsITogQ29tcG9uZW50UG9ydGFsPFRvb2x0aXBDb21wb25lbnQ+O1xuICBwcml2YXRlIF9wb3NpdGlvbjogVG9vbHRpcFBvc2l0aW9uID0gJ2JlbG93JztcbiAgcHJpdmF0ZSBfZGlzYWJsZWQ6IGJvb2xlYW4gPSBmYWxzZTtcbiAgcHJpdmF0ZSBfdG9vbHRpcENsYXNzITogc3RyaW5nIHwgc3RyaW5nW10gfCBTZXQ8c3RyaW5nPiB8IHsgW2tleTogc3RyaW5nXTogYW55IH07XG4gIHByaXZhdGUgX3Njcm9sbFN0cmF0ZWd5OiAoKSA9PiBTY3JvbGxTdHJhdGVneTtcbiAgcHJpdmF0ZSBfdmlld0luaXRpYWxpemVkID0gZmFsc2U7XG4gIHByaXZhdGUgX3BvaW50ZXJFeGl0RXZlbnRzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuICAvKiogQWxsb3dzIHRoZSB1c2VyIHRvIGRlZmluZSB0aGUgcG9zaXRpb24gb2YgdGhlIHRvb2x0aXAgcmVsYXRpdmUgdG8gdGhlIHBhcmVudCBlbGVtZW50ICovXG4gIEBJbnB1dCgnbXR4VG9vbHRpcFBvc2l0aW9uJylcbiAgZ2V0IHBvc2l0aW9uKCk6IFRvb2x0aXBQb3NpdGlvbiB7XG4gICAgcmV0dXJuIHRoaXMuX3Bvc2l0aW9uO1xuICB9XG4gIHNldCBwb3NpdGlvbih2YWx1ZTogVG9vbHRpcFBvc2l0aW9uKSB7XG4gICAgaWYgKHZhbHVlICE9PSB0aGlzLl9wb3NpdGlvbikge1xuICAgICAgdGhpcy5fcG9zaXRpb24gPSB2YWx1ZTtcblxuICAgICAgaWYgKHRoaXMuX292ZXJsYXlSZWYpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlUG9zaXRpb24oKTtcblxuICAgICAgICBpZiAodGhpcy5fdG9vbHRpcEluc3RhbmNlKSB7XG4gICAgICAgICAgdGhpcy5fdG9vbHRpcEluc3RhbmNlIS5zaG93KDApO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fb3ZlcmxheVJlZi51cGRhdGVQb3NpdGlvbigpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKiBEaXNhYmxlcyB0aGUgZGlzcGxheSBvZiB0aGUgdG9vbHRpcC4gKi9cbiAgQElucHV0KCdtdHhUb29sdGlwRGlzYWJsZWQnKVxuICBnZXQgZGlzYWJsZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX2Rpc2FibGVkO1xuICB9XG4gIHNldCBkaXNhYmxlZCh2YWx1ZSkge1xuICAgIHRoaXMuX2Rpc2FibGVkID0gY29lcmNlQm9vbGVhblByb3BlcnR5KHZhbHVlKTtcblxuICAgIC8vIElmIHRvb2x0aXAgaXMgZGlzYWJsZWQsIGhpZGUgaW1tZWRpYXRlbHkuXG4gICAgaWYgKHRoaXMuX2Rpc2FibGVkKSB7XG4gICAgICB0aGlzLmhpZGUoMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3NldHVwUG9pbnRlckVudGVyRXZlbnRzSWZOZWVkZWQoKTtcbiAgICB9XG4gIH1cblxuICAvKiogVGhlIGRlZmF1bHQgZGVsYXkgaW4gbXMgYmVmb3JlIHNob3dpbmcgdGhlIHRvb2x0aXAgYWZ0ZXIgc2hvdyBpcyBjYWxsZWQgKi9cbiAgQElucHV0KCdtdHhUb29sdGlwU2hvd0RlbGF5Jykgc2hvd0RlbGF5OiBudW1iZXIgPSB0aGlzLl9kZWZhdWx0T3B0aW9ucy5zaG93RGVsYXk7XG5cbiAgLyoqIFRoZSBkZWZhdWx0IGRlbGF5IGluIG1zIGJlZm9yZSBoaWRpbmcgdGhlIHRvb2x0aXAgYWZ0ZXIgaGlkZSBpcyBjYWxsZWQgKi9cbiAgQElucHV0KCdtdHhUb29sdGlwSGlkZURlbGF5JykgaGlkZURlbGF5OiBudW1iZXIgPSB0aGlzLl9kZWZhdWx0T3B0aW9ucy5oaWRlRGVsYXk7XG5cbiAgLyoqXG4gICAqIEhvdyB0b3VjaCBnZXN0dXJlcyBzaG91bGQgYmUgaGFuZGxlZCBieSB0aGUgdG9vbHRpcC4gT24gdG91Y2ggZGV2aWNlcyB0aGUgdG9vbHRpcCBkaXJlY3RpdmVcbiAgICogdXNlcyBhIGxvbmcgcHJlc3MgZ2VzdHVyZSB0byBzaG93IGFuZCBoaWRlLCBob3dldmVyIGl0IGNhbiBjb25mbGljdCB3aXRoIHRoZSBuYXRpdmUgYnJvd3NlclxuICAgKiBnZXN0dXJlcy4gVG8gd29yayBhcm91bmQgdGhlIGNvbmZsaWN0LCBBbmd1bGFyIE1hdGVyaWFsIGRpc2FibGVzIG5hdGl2ZSBnZXN0dXJlcyBvbiB0aGVcbiAgICogdHJpZ2dlciwgYnV0IHRoYXQgbWlnaHQgbm90IGJlIGRlc2lyYWJsZSBvbiBwYXJ0aWN1bGFyIGVsZW1lbnRzIChlLmcuIGlucHV0cyBhbmQgZHJhZ2dhYmxlXG4gICAqIGVsZW1lbnRzKS4gVGhlIGRpZmZlcmVudCB2YWx1ZXMgZm9yIHRoaXMgb3B0aW9uIGNvbmZpZ3VyZSB0aGUgdG91Y2ggZXZlbnQgaGFuZGxpbmcgYXMgZm9sbG93czpcbiAgICogLSBgYXV0b2AgLSBFbmFibGVzIHRvdWNoIGdlc3R1cmVzIGZvciBhbGwgZWxlbWVudHMsIGJ1dCB0cmllcyB0byBhdm9pZCBjb25mbGljdHMgd2l0aCBuYXRpdmVcbiAgICogICBicm93c2VyIGdlc3R1cmVzIG9uIHBhcnRpY3VsYXIgZWxlbWVudHMuIEluIHBhcnRpY3VsYXIsIGl0IGFsbG93cyB0ZXh0IHNlbGVjdGlvbiBvbiBpbnB1dHNcbiAgICogICBhbmQgdGV4dGFyZWFzLCBhbmQgcHJlc2VydmVzIHRoZSBuYXRpdmUgYnJvd3NlciBkcmFnZ2luZyBvbiBlbGVtZW50cyBtYXJrZWQgYXMgYGRyYWdnYWJsZWAuXG4gICAqIC0gYG9uYCAtIEVuYWJsZXMgdG91Y2ggZ2VzdHVyZXMgZm9yIGFsbCBlbGVtZW50cyBhbmQgZGlzYWJsZXMgbmF0aXZlXG4gICAqICAgYnJvd3NlciBnZXN0dXJlcyB3aXRoIG5vIGV4Y2VwdGlvbnMuXG4gICAqIC0gYG9mZmAgLSBEaXNhYmxlcyB0b3VjaCBnZXN0dXJlcy4gTm90ZSB0aGF0IHRoaXMgd2lsbCBwcmV2ZW50IHRoZSB0b29sdGlwIGZyb21cbiAgICogICBzaG93aW5nIG9uIHRvdWNoIGRldmljZXMuXG4gICAqL1xuICBASW5wdXQoJ210eFRvb2x0aXBUb3VjaEdlc3R1cmVzJykgdG91Y2hHZXN0dXJlczogVG9vbHRpcFRvdWNoR2VzdHVyZXMgPSAnYXV0byc7XG5cbiAgLyoqIFRoZSBtZXNzYWdlIHRvIGJlIGRpc3BsYXllZCBpbiB0aGUgdG9vbHRpcCAqL1xuICBASW5wdXQoJ210eFRvb2x0aXAnKVxuICBnZXQgbWVzc2FnZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fbWVzc2FnZTtcbiAgfVxuICBzZXQgbWVzc2FnZSh2YWx1ZTogc3RyaW5nIHwgVGVtcGxhdGVSZWY8YW55Pikge1xuICAgIHRoaXMuX2FyaWFEZXNjcmliZXIucmVtb3ZlRGVzY3JpcHRpb24odGhpcy5fZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LCB0aGlzLl9tZXNzYWdlIGFzIHN0cmluZyk7XG5cbiAgICAvLyBUT0RPOiBJZiB0aGUgbWVzc2FnZSBpcyBhIFRlbXBsYXRlUmVmLCBpdCdzIGhhcmQgdG8gc3VwcG9ydCBhMTF5LlxuICAgIC8vIElmIHRoZSBtZXNzYWdlIGlzIG5vdCBhIHN0cmluZyAoZS5nLiBudW1iZXIpLCBjb252ZXJ0IGl0IHRvIGEgc3RyaW5nIGFuZCB0cmltIGl0LlxuICAgIHRoaXMuX21lc3NhZ2UgPSB2YWx1ZSBpbnN0YW5jZW9mIFRlbXBsYXRlUmVmID8gdmFsdWUgOiB2YWx1ZSAhPSBudWxsID8gYCR7dmFsdWV9YC50cmltKCkgOiAnJztcblxuICAgIGlmICghdGhpcy5fbWVzc2FnZSAmJiB0aGlzLl9pc1Rvb2x0aXBWaXNpYmxlKCkpIHtcbiAgICAgIHRoaXMuaGlkZSgwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fc2V0dXBQb2ludGVyRW50ZXJFdmVudHNJZk5lZWRlZCgpO1xuICAgICAgdGhpcy5fdXBkYXRlVG9vbHRpcE1lc3NhZ2UoKTtcbiAgICAgIHRoaXMuX25nWm9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB7XG4gICAgICAgIC8vIFRoZSBgQXJpYURlc2NyaWJlcmAgaGFzIHNvbWUgZnVuY3Rpb25hbGl0eSB0aGF0IGF2b2lkcyBhZGRpbmcgYSBkZXNjcmlwdGlvbiBpZiBpdCdzIHRoZVxuICAgICAgICAvLyBzYW1lIGFzIHRoZSBgYXJpYS1sYWJlbGAgb2YgYW4gZWxlbWVudCwgaG93ZXZlciB3ZSBjYW4ndCBrbm93IHdoZXRoZXIgdGhlIHRvb2x0aXAgdHJpZ2dlclxuICAgICAgICAvLyBoYXMgYSBkYXRhLWJvdW5kIGBhcmlhLWxhYmVsYCBvciB3aGVuIGl0J2xsIGJlIHNldCBmb3IgdGhlIGZpcnN0IHRpbWUuIFdlIGNhbiBhdm9pZCB0aGVcbiAgICAgICAgLy8gaXNzdWUgYnkgZGVmZXJyaW5nIHRoZSBkZXNjcmlwdGlvbiBieSBhIHRpY2sgc28gQW5ndWxhciBoYXMgdGltZSB0byBzZXQgdGhlIGBhcmlhLWxhYmVsYC5cbiAgICAgICAgUHJvbWlzZS5yZXNvbHZlKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgdGhpcy5fYXJpYURlc2NyaWJlci5kZXNjcmliZSh0aGlzLl9lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQsIHRoaXMubWVzc2FnZSBhcyBzdHJpbmcpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICBwcml2YXRlIF9tZXNzYWdlOiBzdHJpbmcgfCBUZW1wbGF0ZVJlZjxhbnk+ID0gJyc7XG5cbiAgLyoqIENsYXNzZXMgdG8gYmUgcGFzc2VkIHRvIHRoZSB0b29sdGlwLiBTdXBwb3J0cyB0aGUgc2FtZSBzeW50YXggYXMgYG5nQ2xhc3NgLiAqL1xuICBASW5wdXQoJ210eFRvb2x0aXBDbGFzcycpXG4gIGdldCB0b29sdGlwQ2xhc3MoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3Rvb2x0aXBDbGFzcztcbiAgfVxuICBzZXQgdG9vbHRpcENsYXNzKHZhbHVlOiBzdHJpbmcgfCBzdHJpbmdbXSB8IFNldDxzdHJpbmc+IHwgeyBba2V5OiBzdHJpbmddOiBhbnkgfSkge1xuICAgIHRoaXMuX3Rvb2x0aXBDbGFzcyA9IHZhbHVlO1xuICAgIGlmICh0aGlzLl90b29sdGlwSW5zdGFuY2UpIHtcbiAgICAgIHRoaXMuX3NldFRvb2x0aXBDbGFzcyh0aGlzLl90b29sdGlwQ2xhc3MpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBNYW51YWxseS1ib3VuZCBwYXNzaXZlIGV2ZW50IGxpc3RlbmVycy4gKi9cbiAgcHJpdmF0ZSByZWFkb25seSBfcGFzc2l2ZUxpc3RlbmVyczogKHJlYWRvbmx5IFtcbiAgICBzdHJpbmcsXG4gICAgRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdFxuICBdKVtdID0gW107XG5cbiAgLyoqIFRpbWVyIHN0YXJ0ZWQgYXQgdGhlIGxhc3QgYHRvdWNoc3RhcnRgIGV2ZW50LiAqL1xuICBwcml2YXRlIF90b3VjaHN0YXJ0VGltZW91dCE6IG51bWJlcjtcblxuICAvKiogRW1pdHMgd2hlbiB0aGUgY29tcG9uZW50IGlzIGRlc3Ryb3llZC4gKi9cbiAgcHJpdmF0ZSByZWFkb25seSBfZGVzdHJveWVkID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIF9vdmVybGF5OiBPdmVybGF5LFxuICAgIHByaXZhdGUgX2VsZW1lbnRSZWY6IEVsZW1lbnRSZWY8SFRNTEVsZW1lbnQ+LFxuICAgIHByaXZhdGUgX3Njcm9sbERpc3BhdGNoZXI6IFNjcm9sbERpc3BhdGNoZXIsXG4gICAgcHJpdmF0ZSBfdmlld0NvbnRhaW5lclJlZjogVmlld0NvbnRhaW5lclJlZixcbiAgICBwcml2YXRlIF9uZ1pvbmU6IE5nWm9uZSxcbiAgICBwcml2YXRlIF9wbGF0Zm9ybTogUGxhdGZvcm0sXG4gICAgcHJpdmF0ZSBfYXJpYURlc2NyaWJlcjogQXJpYURlc2NyaWJlcixcbiAgICBwcml2YXRlIF9mb2N1c01vbml0b3I6IEZvY3VzTW9uaXRvcixcbiAgICBASW5qZWN0KE1UWF9UT09MVElQX1NDUk9MTF9TVFJBVEVHWSkgc2Nyb2xsU3RyYXRlZ3k6IGFueSxcbiAgICBAT3B0aW9uYWwoKSBwcml2YXRlIF9kaXI6IERpcmVjdGlvbmFsaXR5LFxuICAgIEBPcHRpb25hbCgpXG4gICAgQEluamVjdChNVFhfVE9PTFRJUF9ERUZBVUxUX09QVElPTlMpXG4gICAgcHJpdmF0ZSBfZGVmYXVsdE9wdGlvbnM6IE10eFRvb2x0aXBEZWZhdWx0T3B0aW9uc1xuICApIHtcbiAgICB0aGlzLl9zY3JvbGxTdHJhdGVneSA9IHNjcm9sbFN0cmF0ZWd5O1xuXG4gICAgaWYgKF9kZWZhdWx0T3B0aW9ucykge1xuICAgICAgaWYgKF9kZWZhdWx0T3B0aW9ucy5wb3NpdGlvbikge1xuICAgICAgICB0aGlzLnBvc2l0aW9uID0gX2RlZmF1bHRPcHRpb25zLnBvc2l0aW9uO1xuICAgICAgfVxuXG4gICAgICBpZiAoX2RlZmF1bHRPcHRpb25zLnRvdWNoR2VzdHVyZXMpIHtcbiAgICAgICAgdGhpcy50b3VjaEdlc3R1cmVzID0gX2RlZmF1bHRPcHRpb25zLnRvdWNoR2VzdHVyZXM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgX25nWm9uZS5ydW5PdXRzaWRlQW5ndWxhcigoKSA9PiB7XG4gICAgICBfZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLl9oYW5kbGVLZXlkb3duKTtcbiAgICB9KTtcbiAgfVxuXG4gIG5nQWZ0ZXJWaWV3SW5pdCgpIHtcbiAgICAvLyBUaGlzIG5lZWRzIHRvIGhhcHBlbiBhZnRlciB2aWV3IGluaXQgc28gdGhlIGluaXRpYWwgdmFsdWVzIGZvciBhbGwgaW5wdXRzIGhhdmUgYmVlbiBzZXQuXG4gICAgdGhpcy5fdmlld0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB0aGlzLl9zZXR1cFBvaW50ZXJFbnRlckV2ZW50c0lmTmVlZGVkKCk7XG5cbiAgICB0aGlzLl9mb2N1c01vbml0b3JcbiAgICAgIC5tb25pdG9yKHRoaXMuX2VsZW1lbnRSZWYpXG4gICAgICAucGlwZSh0YWtlVW50aWwodGhpcy5fZGVzdHJveWVkKSlcbiAgICAgIC5zdWJzY3JpYmUob3JpZ2luID0+IHtcbiAgICAgICAgLy8gTm90ZSB0aGF0IHRoZSBmb2N1cyBtb25pdG9yIHJ1bnMgb3V0c2lkZSB0aGUgQW5ndWxhciB6b25lLlxuICAgICAgICBpZiAoIW9yaWdpbikge1xuICAgICAgICAgIHRoaXMuX25nWm9uZS5ydW4oKCkgPT4gdGhpcy5oaWRlKDApKTtcbiAgICAgICAgfSBlbHNlIGlmIChvcmlnaW4gPT09ICdrZXlib2FyZCcpIHtcbiAgICAgICAgICB0aGlzLl9uZ1pvbmUucnVuKCgpID0+IHRoaXMuc2hvdygpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRGlzcG9zZSB0aGUgdG9vbHRpcCB3aGVuIGRlc3Ryb3llZC5cbiAgICovXG4gIG5nT25EZXN0cm95KCkge1xuICAgIGNvbnN0IG5hdGl2ZUVsZW1lbnQgPSB0aGlzLl9lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQ7XG5cbiAgICBjbGVhclRpbWVvdXQodGhpcy5fdG91Y2hzdGFydFRpbWVvdXQpO1xuXG4gICAgaWYgKHRoaXMuX292ZXJsYXlSZWYpIHtcbiAgICAgIHRoaXMuX292ZXJsYXlSZWYuZGlzcG9zZSgpO1xuICAgICAgdGhpcy5fdG9vbHRpcEluc3RhbmNlID0gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBDbGVhbiB1cCB0aGUgZXZlbnQgbGlzdGVuZXJzIHNldCBpbiB0aGUgY29uc3RydWN0b3JcbiAgICBuYXRpdmVFbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLl9oYW5kbGVLZXlkb3duKTtcbiAgICB0aGlzLl9wYXNzaXZlTGlzdGVuZXJzLmZvckVhY2goKFtldmVudCwgbGlzdGVuZXJdKSA9PiB7XG4gICAgICBuYXRpdmVFbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyLCBwYXNzaXZlTGlzdGVuZXJPcHRpb25zKTtcbiAgICB9KTtcbiAgICB0aGlzLl9wYXNzaXZlTGlzdGVuZXJzLmxlbmd0aCA9IDA7XG5cbiAgICB0aGlzLl9kZXN0cm95ZWQubmV4dCgpO1xuICAgIHRoaXMuX2Rlc3Ryb3llZC5jb21wbGV0ZSgpO1xuXG4gICAgdGhpcy5fYXJpYURlc2NyaWJlci5yZW1vdmVEZXNjcmlwdGlvbihuYXRpdmVFbGVtZW50LCB0aGlzLm1lc3NhZ2UgYXMgc3RyaW5nKTtcbiAgICB0aGlzLl9mb2N1c01vbml0b3Iuc3RvcE1vbml0b3JpbmcobmF0aXZlRWxlbWVudCk7XG4gIH1cblxuICAvKiogU2hvd3MgdGhlIHRvb2x0aXAgYWZ0ZXIgdGhlIGRlbGF5IGluIG1zLCBkZWZhdWx0cyB0byB0b29sdGlwLWRlbGF5LXNob3cgb3IgMG1zIGlmIG5vIGlucHV0ICovXG4gIHNob3coZGVsYXk6IG51bWJlciA9IHRoaXMuc2hvd0RlbGF5KTogdm9pZCB7XG4gICAgaWYgKFxuICAgICAgdGhpcy5kaXNhYmxlZCB8fFxuICAgICAgIXRoaXMubWVzc2FnZSB8fFxuICAgICAgKHRoaXMuX2lzVG9vbHRpcFZpc2libGUoKSAmJlxuICAgICAgICAhdGhpcy5fdG9vbHRpcEluc3RhbmNlIS5fc2hvd1RpbWVvdXRJZCAmJlxuICAgICAgICAhdGhpcy5fdG9vbHRpcEluc3RhbmNlIS5faGlkZVRpbWVvdXRJZClcbiAgICApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBvdmVybGF5UmVmID0gdGhpcy5fY3JlYXRlT3ZlcmxheSgpO1xuICAgIHRoaXMuX2RldGFjaCgpO1xuICAgIHRoaXMuX3BvcnRhbCA9IHRoaXMuX3BvcnRhbCB8fCBuZXcgQ29tcG9uZW50UG9ydGFsKFRvb2x0aXBDb21wb25lbnQsIHRoaXMuX3ZpZXdDb250YWluZXJSZWYpO1xuICAgIHRoaXMuX3Rvb2x0aXBJbnN0YW5jZSA9IG92ZXJsYXlSZWYuYXR0YWNoKHRoaXMuX3BvcnRhbCkuaW5zdGFuY2U7XG4gICAgdGhpcy5fdG9vbHRpcEluc3RhbmNlXG4gICAgICAuYWZ0ZXJIaWRkZW4oKVxuICAgICAgLnBpcGUodGFrZVVudGlsKHRoaXMuX2Rlc3Ryb3llZCkpXG4gICAgICAuc3Vic2NyaWJlKCgpID0+IHRoaXMuX2RldGFjaCgpKTtcbiAgICB0aGlzLl9zZXRUb29sdGlwQ2xhc3ModGhpcy5fdG9vbHRpcENsYXNzKTtcbiAgICB0aGlzLl91cGRhdGVUb29sdGlwTWVzc2FnZSgpO1xuICAgIHRoaXMuX3Rvb2x0aXBJbnN0YW5jZSEuc2hvdyhkZWxheSk7XG4gIH1cblxuICAvKiogSGlkZXMgdGhlIHRvb2x0aXAgYWZ0ZXIgdGhlIGRlbGF5IGluIG1zLCBkZWZhdWx0cyB0byB0b29sdGlwLWRlbGF5LWhpZGUgb3IgMG1zIGlmIG5vIGlucHV0ICovXG4gIGhpZGUoZGVsYXk6IG51bWJlciA9IHRoaXMuaGlkZURlbGF5KTogdm9pZCB7XG4gICAgaWYgKHRoaXMuX3Rvb2x0aXBJbnN0YW5jZSkge1xuICAgICAgdGhpcy5fdG9vbHRpcEluc3RhbmNlLmhpZGUoZGVsYXkpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBTaG93cy9oaWRlcyB0aGUgdG9vbHRpcCAqL1xuICB0b2dnbGUoKTogdm9pZCB7XG4gICAgdGhpcy5faXNUb29sdGlwVmlzaWJsZSgpID8gdGhpcy5oaWRlKCkgOiB0aGlzLnNob3coKTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIHRydWUgaWYgdGhlIHRvb2x0aXAgaXMgY3VycmVudGx5IHZpc2libGUgdG8gdGhlIHVzZXIgKi9cbiAgX2lzVG9vbHRpcFZpc2libGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhdGhpcy5fdG9vbHRpcEluc3RhbmNlICYmIHRoaXMuX3Rvb2x0aXBJbnN0YW5jZS5pc1Zpc2libGUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIHRoZSBrZXlkb3duIGV2ZW50cyBvbiB0aGUgaG9zdCBlbGVtZW50LlxuICAgKiBOZWVkcyB0byBiZSBhbiBhcnJvdyBmdW5jdGlvbiBzbyB0aGF0IHdlIGNhbiB1c2UgaXQgaW4gYWRkRXZlbnRMaXN0ZW5lci5cbiAgICovXG4gIHByaXZhdGUgX2hhbmRsZUtleWRvd24gPSAoZXZlbnQ6IEtleWJvYXJkRXZlbnQpID0+IHtcbiAgICBpZiAodGhpcy5faXNUb29sdGlwVmlzaWJsZSgpICYmIGV2ZW50LmtleUNvZGUgPT09IEVTQ0FQRSAmJiAhaGFzTW9kaWZpZXJLZXkoZXZlbnQpKSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICB0aGlzLl9uZ1pvbmUucnVuKCgpID0+IHRoaXMuaGlkZSgwKSk7XG4gICAgfVxuICB9O1xuXG4gIC8qKiBDcmVhdGUgdGhlIG92ZXJsYXkgY29uZmlnIGFuZCBwb3NpdGlvbiBzdHJhdGVneSAqL1xuICBwcml2YXRlIF9jcmVhdGVPdmVybGF5KCk6IE92ZXJsYXlSZWYge1xuICAgIGlmICh0aGlzLl9vdmVybGF5UmVmKSB7XG4gICAgICByZXR1cm4gdGhpcy5fb3ZlcmxheVJlZjtcbiAgICB9XG5cbiAgICBjb25zdCBzY3JvbGxhYmxlQW5jZXN0b3JzID0gdGhpcy5fc2Nyb2xsRGlzcGF0Y2hlci5nZXRBbmNlc3RvclNjcm9sbENvbnRhaW5lcnMoXG4gICAgICB0aGlzLl9lbGVtZW50UmVmXG4gICAgKTtcblxuICAgIC8vIENyZWF0ZSBjb25uZWN0ZWQgcG9zaXRpb24gc3RyYXRlZ3kgdGhhdCBsaXN0ZW5zIGZvciBzY3JvbGwgZXZlbnRzIHRvIHJlcG9zaXRpb24uXG4gICAgY29uc3Qgc3RyYXRlZ3kgPSB0aGlzLl9vdmVybGF5XG4gICAgICAucG9zaXRpb24oKVxuICAgICAgLmZsZXhpYmxlQ29ubmVjdGVkVG8odGhpcy5fZWxlbWVudFJlZilcbiAgICAgIC53aXRoVHJhbnNmb3JtT3JpZ2luT24oJy5tdHgtdG9vbHRpcCcpXG4gICAgICAud2l0aEZsZXhpYmxlRGltZW5zaW9ucyhmYWxzZSlcbiAgICAgIC53aXRoVmlld3BvcnRNYXJnaW4oOClcbiAgICAgIC53aXRoU2Nyb2xsYWJsZUNvbnRhaW5lcnMoc2Nyb2xsYWJsZUFuY2VzdG9ycyk7XG5cbiAgICBzdHJhdGVneS5wb3NpdGlvbkNoYW5nZXMucGlwZSh0YWtlVW50aWwodGhpcy5fZGVzdHJveWVkKSkuc3Vic2NyaWJlKGNoYW5nZSA9PiB7XG4gICAgICBpZiAodGhpcy5fdG9vbHRpcEluc3RhbmNlKSB7XG4gICAgICAgIGlmIChjaGFuZ2Uuc2Nyb2xsYWJsZVZpZXdQcm9wZXJ0aWVzLmlzT3ZlcmxheUNsaXBwZWQgJiYgdGhpcy5fdG9vbHRpcEluc3RhbmNlLmlzVmlzaWJsZSgpKSB7XG4gICAgICAgICAgLy8gQWZ0ZXIgcG9zaXRpb24gY2hhbmdlcyBvY2N1ciBhbmQgdGhlIG92ZXJsYXkgaXMgY2xpcHBlZCBieVxuICAgICAgICAgIC8vIGEgcGFyZW50IHNjcm9sbGFibGUgdGhlbiBjbG9zZSB0aGUgdG9vbHRpcC5cbiAgICAgICAgICB0aGlzLl9uZ1pvbmUucnVuKCgpID0+IHRoaXMuaGlkZSgwKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuX292ZXJsYXlSZWYgPSB0aGlzLl9vdmVybGF5LmNyZWF0ZSh7XG4gICAgICBkaXJlY3Rpb246IHRoaXMuX2RpcixcbiAgICAgIHBvc2l0aW9uU3RyYXRlZ3k6IHN0cmF0ZWd5LFxuICAgICAgcGFuZWxDbGFzczogVE9PTFRJUF9QQU5FTF9DTEFTUyxcbiAgICAgIHNjcm9sbFN0cmF0ZWd5OiB0aGlzLl9zY3JvbGxTdHJhdGVneSgpLFxuICAgIH0pO1xuXG4gICAgdGhpcy5fdXBkYXRlUG9zaXRpb24oKTtcblxuICAgIHRoaXMuX292ZXJsYXlSZWZcbiAgICAgIC5kZXRhY2htZW50cygpXG4gICAgICAucGlwZSh0YWtlVW50aWwodGhpcy5fZGVzdHJveWVkKSlcbiAgICAgIC5zdWJzY3JpYmUoKCkgPT4gdGhpcy5fZGV0YWNoKCkpO1xuXG4gICAgcmV0dXJuIHRoaXMuX292ZXJsYXlSZWY7XG4gIH1cblxuICAvKiogRGV0YWNoZXMgdGhlIGN1cnJlbnRseS1hdHRhY2hlZCB0b29sdGlwLiAqL1xuICBwcml2YXRlIF9kZXRhY2goKSB7XG4gICAgaWYgKHRoaXMuX292ZXJsYXlSZWYgJiYgdGhpcy5fb3ZlcmxheVJlZi5oYXNBdHRhY2hlZCgpKSB7XG4gICAgICB0aGlzLl9vdmVybGF5UmVmLmRldGFjaCgpO1xuICAgIH1cblxuICAgIHRoaXMuX3Rvb2x0aXBJbnN0YW5jZSA9IG51bGw7XG4gIH1cblxuICAvKiogVXBkYXRlcyB0aGUgcG9zaXRpb24gb2YgdGhlIGN1cnJlbnQgdG9vbHRpcC4gKi9cbiAgcHJpdmF0ZSBfdXBkYXRlUG9zaXRpb24oKSB7XG4gICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLl9vdmVybGF5UmVmIS5nZXRDb25maWcoKVxuICAgICAgLnBvc2l0aW9uU3RyYXRlZ3kgYXMgRmxleGlibGVDb25uZWN0ZWRQb3NpdGlvblN0cmF0ZWd5O1xuICAgIGNvbnN0IG9yaWdpbiA9IHRoaXMuX2dldE9yaWdpbigpO1xuICAgIGNvbnN0IG92ZXJsYXkgPSB0aGlzLl9nZXRPdmVybGF5UG9zaXRpb24oKTtcblxuICAgIHBvc2l0aW9uLndpdGhQb3NpdGlvbnMoW1xuICAgICAgeyAuLi5vcmlnaW4ubWFpbiwgLi4ub3ZlcmxheS5tYWluIH0sXG4gICAgICB7IC4uLm9yaWdpbi5mYWxsYmFjaywgLi4ub3ZlcmxheS5mYWxsYmFjayB9LFxuICAgIF0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIG9yaWdpbiBwb3NpdGlvbiBhbmQgYSBmYWxsYmFjayBwb3NpdGlvbiBiYXNlZCBvbiB0aGUgdXNlcidzIHBvc2l0aW9uIHByZWZlcmVuY2UuXG4gICAqIFRoZSBmYWxsYmFjayBwb3NpdGlvbiBpcyB0aGUgaW52ZXJzZSBvZiB0aGUgb3JpZ2luIChlLmcuIGAnYmVsb3cnIC0+ICdhYm92ZSdgKS5cbiAgICovXG4gIF9nZXRPcmlnaW4oKTogeyBtYWluOiBPcmlnaW5Db25uZWN0aW9uUG9zaXRpb247IGZhbGxiYWNrOiBPcmlnaW5Db25uZWN0aW9uUG9zaXRpb24gfSB7XG4gICAgY29uc3QgaXNMdHIgPSAhdGhpcy5fZGlyIHx8IHRoaXMuX2Rpci52YWx1ZSA9PT0gJ2x0cic7XG4gICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uO1xuICAgIGxldCBvcmlnaW5Qb3NpdGlvbjogT3JpZ2luQ29ubmVjdGlvblBvc2l0aW9uO1xuXG4gICAgaWYgKHBvc2l0aW9uID09PSAnYWJvdmUnIHx8IHBvc2l0aW9uID09PSAnYmVsb3cnKSB7XG4gICAgICBvcmlnaW5Qb3NpdGlvbiA9IHsgb3JpZ2luWDogJ2NlbnRlcicsIG9yaWdpblk6IHBvc2l0aW9uID09PSAnYWJvdmUnID8gJ3RvcCcgOiAnYm90dG9tJyB9O1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICBwb3NpdGlvbiA9PT0gJ2JlZm9yZScgfHxcbiAgICAgIChwb3NpdGlvbiA9PT0gJ2xlZnQnICYmIGlzTHRyKSB8fFxuICAgICAgKHBvc2l0aW9uID09PSAncmlnaHQnICYmICFpc0x0cilcbiAgICApIHtcbiAgICAgIG9yaWdpblBvc2l0aW9uID0geyBvcmlnaW5YOiAnc3RhcnQnLCBvcmlnaW5ZOiAnY2VudGVyJyB9O1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICBwb3NpdGlvbiA9PT0gJ2FmdGVyJyB8fFxuICAgICAgKHBvc2l0aW9uID09PSAncmlnaHQnICYmIGlzTHRyKSB8fFxuICAgICAgKHBvc2l0aW9uID09PSAnbGVmdCcgJiYgIWlzTHRyKVxuICAgICkge1xuICAgICAgb3JpZ2luUG9zaXRpb24gPSB7IG9yaWdpblg6ICdlbmQnLCBvcmlnaW5ZOiAnY2VudGVyJyB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBnZXRNdHhUb29sdGlwSW52YWxpZFBvc2l0aW9uRXJyb3IocG9zaXRpb24pO1xuICAgIH1cblxuICAgIGNvbnN0IHsgeCwgeSB9ID0gdGhpcy5faW52ZXJ0UG9zaXRpb24ob3JpZ2luUG9zaXRpb24ub3JpZ2luWCwgb3JpZ2luUG9zaXRpb24ub3JpZ2luWSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbWFpbjogb3JpZ2luUG9zaXRpb24sXG4gICAgICBmYWxsYmFjazogeyBvcmlnaW5YOiB4LCBvcmlnaW5ZOiB5IH0sXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBSZXR1cm5zIHRoZSBvdmVybGF5IHBvc2l0aW9uIGFuZCBhIGZhbGxiYWNrIHBvc2l0aW9uIGJhc2VkIG9uIHRoZSB1c2VyJ3MgcHJlZmVyZW5jZSAqL1xuICBfZ2V0T3ZlcmxheVBvc2l0aW9uKCk6IHsgbWFpbjogT3ZlcmxheUNvbm5lY3Rpb25Qb3NpdGlvbjsgZmFsbGJhY2s6IE92ZXJsYXlDb25uZWN0aW9uUG9zaXRpb24gfSB7XG4gICAgY29uc3QgaXNMdHIgPSAhdGhpcy5fZGlyIHx8IHRoaXMuX2Rpci52YWx1ZSA9PT0gJ2x0cic7XG4gICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uO1xuICAgIGxldCBvdmVybGF5UG9zaXRpb246IE92ZXJsYXlDb25uZWN0aW9uUG9zaXRpb247XG5cbiAgICBpZiAocG9zaXRpb24gPT09ICdhYm92ZScpIHtcbiAgICAgIG92ZXJsYXlQb3NpdGlvbiA9IHsgb3ZlcmxheVg6ICdjZW50ZXInLCBvdmVybGF5WTogJ2JvdHRvbScgfTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAnYmVsb3cnKSB7XG4gICAgICBvdmVybGF5UG9zaXRpb24gPSB7IG92ZXJsYXlYOiAnY2VudGVyJywgb3ZlcmxheVk6ICd0b3AnIH07XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIHBvc2l0aW9uID09PSAnYmVmb3JlJyB8fFxuICAgICAgKHBvc2l0aW9uID09PSAnbGVmdCcgJiYgaXNMdHIpIHx8XG4gICAgICAocG9zaXRpb24gPT09ICdyaWdodCcgJiYgIWlzTHRyKVxuICAgICkge1xuICAgICAgb3ZlcmxheVBvc2l0aW9uID0geyBvdmVybGF5WDogJ2VuZCcsIG92ZXJsYXlZOiAnY2VudGVyJyB9O1xuICAgIH0gZWxzZSBpZiAoXG4gICAgICBwb3NpdGlvbiA9PT0gJ2FmdGVyJyB8fFxuICAgICAgKHBvc2l0aW9uID09PSAncmlnaHQnICYmIGlzTHRyKSB8fFxuICAgICAgKHBvc2l0aW9uID09PSAnbGVmdCcgJiYgIWlzTHRyKVxuICAgICkge1xuICAgICAgb3ZlcmxheVBvc2l0aW9uID0geyBvdmVybGF5WDogJ3N0YXJ0Jywgb3ZlcmxheVk6ICdjZW50ZXInIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IGdldE10eFRvb2x0aXBJbnZhbGlkUG9zaXRpb25FcnJvcihwb3NpdGlvbik7XG4gICAgfVxuXG4gICAgY29uc3QgeyB4LCB5IH0gPSB0aGlzLl9pbnZlcnRQb3NpdGlvbihvdmVybGF5UG9zaXRpb24ub3ZlcmxheVgsIG92ZXJsYXlQb3NpdGlvbi5vdmVybGF5WSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbWFpbjogb3ZlcmxheVBvc2l0aW9uLFxuICAgICAgZmFsbGJhY2s6IHsgb3ZlcmxheVg6IHgsIG92ZXJsYXlZOiB5IH0sXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBVcGRhdGVzIHRoZSB0b29sdGlwIG1lc3NhZ2UgYW5kIHJlcG9zaXRpb25zIHRoZSBvdmVybGF5IGFjY29yZGluZyB0byB0aGUgbmV3IG1lc3NhZ2UgbGVuZ3RoICovXG4gIHByaXZhdGUgX3VwZGF0ZVRvb2x0aXBNZXNzYWdlKCkge1xuICAgIC8vIE11c3Qgd2FpdCBmb3IgdGhlIG1lc3NhZ2UgdG8gYmUgcGFpbnRlZCB0byB0aGUgdG9vbHRpcCBzbyB0aGF0IHRoZSBvdmVybGF5IGNhbiBwcm9wZXJseVxuICAgIC8vIGNhbGN1bGF0ZSB0aGUgY29ycmVjdCBwb3NpdGlvbmluZyBiYXNlZCBvbiB0aGUgc2l6ZSBvZiB0aGUgdGV4dC5cbiAgICBpZiAodGhpcy5fdG9vbHRpcEluc3RhbmNlKSB7XG4gICAgICB0aGlzLl90b29sdGlwSW5zdGFuY2UubWVzc2FnZSA9IHRoaXMubWVzc2FnZTtcbiAgICAgIHRoaXMuX3Rvb2x0aXBJbnN0YW5jZS5fbWFya0ZvckNoZWNrKCk7XG5cbiAgICAgIHRoaXMuX25nWm9uZS5vbk1pY3JvdGFza0VtcHR5XG4gICAgICAgIC5hc09ic2VydmFibGUoKVxuICAgICAgICAucGlwZSh0YWtlKDEpLCB0YWtlVW50aWwodGhpcy5fZGVzdHJveWVkKSlcbiAgICAgICAgLnN1YnNjcmliZSgoKSA9PiB7XG4gICAgICAgICAgaWYgKHRoaXMuX3Rvb2x0aXBJbnN0YW5jZSkge1xuICAgICAgICAgICAgdGhpcy5fb3ZlcmxheVJlZiEudXBkYXRlUG9zaXRpb24oKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBVcGRhdGVzIHRoZSB0b29sdGlwIGNsYXNzICovXG4gIHByaXZhdGUgX3NldFRvb2x0aXBDbGFzcyh0b29sdGlwQ2xhc3M6IHN0cmluZyB8IHN0cmluZ1tdIHwgU2V0PHN0cmluZz4gfCB7IFtrZXk6IHN0cmluZ106IGFueSB9KSB7XG4gICAgaWYgKHRoaXMuX3Rvb2x0aXBJbnN0YW5jZSkge1xuICAgICAgdGhpcy5fdG9vbHRpcEluc3RhbmNlLnRvb2x0aXBDbGFzcyA9IHRvb2x0aXBDbGFzcztcbiAgICAgIHRoaXMuX3Rvb2x0aXBJbnN0YW5jZS5fbWFya0ZvckNoZWNrKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEludmVydHMgYW4gb3ZlcmxheSBwb3NpdGlvbi4gKi9cbiAgcHJpdmF0ZSBfaW52ZXJ0UG9zaXRpb24oeDogSG9yaXpvbnRhbENvbm5lY3Rpb25Qb3MsIHk6IFZlcnRpY2FsQ29ubmVjdGlvblBvcykge1xuICAgIGlmICh0aGlzLnBvc2l0aW9uID09PSAnYWJvdmUnIHx8IHRoaXMucG9zaXRpb24gPT09ICdiZWxvdycpIHtcbiAgICAgIGlmICh5ID09PSAndG9wJykge1xuICAgICAgICB5ID0gJ2JvdHRvbSc7XG4gICAgICB9IGVsc2UgaWYgKHkgPT09ICdib3R0b20nKSB7XG4gICAgICAgIHkgPSAndG9wJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHggPT09ICdlbmQnKSB7XG4gICAgICAgIHggPSAnc3RhcnQnO1xuICAgICAgfSBlbHNlIGlmICh4ID09PSAnc3RhcnQnKSB7XG4gICAgICAgIHggPSAnZW5kJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4geyB4LCB5IH07XG4gIH1cblxuICAvKiogQmluZHMgdGhlIHBvaW50ZXIgZXZlbnRzIHRvIHRoZSB0b29sdGlwIHRyaWdnZXIuICovXG4gIHByaXZhdGUgX3NldHVwUG9pbnRlckVudGVyRXZlbnRzSWZOZWVkZWQoKSB7XG4gICAgLy8gT3B0aW1pemF0aW9uOiBEZWZlciBob29raW5nIHVwIGV2ZW50cyBpZiB0aGVyZSdzIG5vIG1lc3NhZ2Ugb3IgdGhlIHRvb2x0aXAgaXMgZGlzYWJsZWQuXG4gICAgaWYgKFxuICAgICAgdGhpcy5fZGlzYWJsZWQgfHxcbiAgICAgICF0aGlzLm1lc3NhZ2UgfHxcbiAgICAgICF0aGlzLl92aWV3SW5pdGlhbGl6ZWQgfHxcbiAgICAgIHRoaXMuX3Bhc3NpdmVMaXN0ZW5lcnMubGVuZ3RoXG4gICAgKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVGhlIG1vdXNlIGV2ZW50cyBzaG91bGRuJ3QgYmUgYm91bmQgb24gbW9iaWxlIGRldmljZXMsIGJlY2F1c2UgdGhleSBjYW4gcHJldmVudCB0aGVcbiAgICAvLyBmaXJzdCB0YXAgZnJvbSBmaXJpbmcgaXRzIGNsaWNrIGV2ZW50IG9yIGNhbiBjYXVzZSB0aGUgdG9vbHRpcCB0byBvcGVuIGZvciBjbGlja3MuXG4gICAgaWYgKHRoaXMuX3BsYXRmb3JtU3VwcG9ydHNNb3VzZUV2ZW50cygpKSB7XG4gICAgICB0aGlzLl9wYXNzaXZlTGlzdGVuZXJzLnB1c2goW1xuICAgICAgICAnbW91c2VlbnRlcicsXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICB0aGlzLl9zZXR1cFBvaW50ZXJFeGl0RXZlbnRzSWZOZWVkZWQoKTtcbiAgICAgICAgICB0aGlzLnNob3coKTtcbiAgICAgICAgfSxcbiAgICAgIF0pO1xuICAgIH0gZWxzZSBpZiAodGhpcy50b3VjaEdlc3R1cmVzICE9PSAnb2ZmJykge1xuICAgICAgdGhpcy5fZGlzYWJsZU5hdGl2ZUdlc3R1cmVzSWZOZWNlc3NhcnkoKTtcblxuICAgICAgdGhpcy5fcGFzc2l2ZUxpc3RlbmVycy5wdXNoKFtcbiAgICAgICAgJ3RvdWNoc3RhcnQnLFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgLy8gTm90ZSB0aGF0IGl0J3MgaW1wb3J0YW50IHRoYXQgd2UgZG9uJ3QgYHByZXZlbnREZWZhdWx0YCBoZXJlLFxuICAgICAgICAgIC8vIGJlY2F1c2UgaXQgY2FuIHByZXZlbnQgY2xpY2sgZXZlbnRzIGZyb20gZmlyaW5nIG9uIHRoZSBlbGVtZW50LlxuICAgICAgICAgIHRoaXMuX3NldHVwUG9pbnRlckV4aXRFdmVudHNJZk5lZWRlZCgpO1xuICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLl90b3VjaHN0YXJ0VGltZW91dCk7XG4gICAgICAgICAgdGhpcy5fdG91Y2hzdGFydFRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHRoaXMuc2hvdygpLCBMT05HUFJFU1NfREVMQVkpIGFzIGFueTtcbiAgICAgICAgfSxcbiAgICAgIF0pO1xuICAgIH1cblxuICAgIHRoaXMuX2FkZExpc3RlbmVycyh0aGlzLl9wYXNzaXZlTGlzdGVuZXJzKTtcbiAgfVxuXG4gIHByaXZhdGUgX3NldHVwUG9pbnRlckV4aXRFdmVudHNJZk5lZWRlZCgpIHtcbiAgICBpZiAodGhpcy5fcG9pbnRlckV4aXRFdmVudHNJbml0aWFsaXplZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9wb2ludGVyRXhpdEV2ZW50c0luaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIGNvbnN0IGV4aXRMaXN0ZW5lcnM6IChyZWFkb25seSBbc3RyaW5nLCBFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0XSlbXSA9IFtdO1xuICAgIGlmICh0aGlzLl9wbGF0Zm9ybVN1cHBvcnRzTW91c2VFdmVudHMoKSkge1xuICAgICAgZXhpdExpc3RlbmVycy5wdXNoKFsnbW91c2VsZWF2ZScsICgpID0+IHRoaXMuaGlkZSgpXSk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnRvdWNoR2VzdHVyZXMgIT09ICdvZmYnKSB7XG4gICAgICB0aGlzLl9kaXNhYmxlTmF0aXZlR2VzdHVyZXNJZk5lY2Vzc2FyeSgpO1xuICAgICAgY29uc3QgdG91Y2hlbmRMaXN0ZW5lciA9ICgpID0+IHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3RvdWNoc3RhcnRUaW1lb3V0KTtcbiAgICAgICAgdGhpcy5oaWRlKHRoaXMuX2RlZmF1bHRPcHRpb25zLnRvdWNoZW5kSGlkZURlbGF5KTtcbiAgICAgIH07XG5cbiAgICAgIGV4aXRMaXN0ZW5lcnMucHVzaChbJ3RvdWNoZW5kJywgdG91Y2hlbmRMaXN0ZW5lcl0sIFsndG91Y2hjYW5jZWwnLCB0b3VjaGVuZExpc3RlbmVyXSk7XG4gICAgfVxuXG4gICAgdGhpcy5fYWRkTGlzdGVuZXJzKGV4aXRMaXN0ZW5lcnMpO1xuICAgIHRoaXMuX3Bhc3NpdmVMaXN0ZW5lcnMucHVzaCguLi5leGl0TGlzdGVuZXJzKTtcbiAgfVxuXG4gIHByaXZhdGUgX2FkZExpc3RlbmVycyhcbiAgICBsaXN0ZW5lcnM6IFJlYWRvbmx5QXJyYXk8cmVhZG9ubHkgW3N0cmluZywgRXZlbnRMaXN0ZW5lck9yRXZlbnRMaXN0ZW5lck9iamVjdF0+XG4gICkge1xuICAgIGxpc3RlbmVycy5mb3JFYWNoKChbZXZlbnQsIGxpc3RlbmVyXSkgPT4ge1xuICAgICAgdGhpcy5fZWxlbWVudFJlZi5uYXRpdmVFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyLCBwYXNzaXZlTGlzdGVuZXJPcHRpb25zKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgX3BsYXRmb3JtU3VwcG9ydHNNb3VzZUV2ZW50cygpIHtcbiAgICByZXR1cm4gIXRoaXMuX3BsYXRmb3JtLklPUyAmJiAhdGhpcy5fcGxhdGZvcm0uQU5EUk9JRDtcbiAgfVxuXG4gIC8qKiBEaXNhYmxlcyB0aGUgbmF0aXZlIGJyb3dzZXIgZ2VzdHVyZXMsIGJhc2VkIG9uIGhvdyB0aGUgdG9vbHRpcCBoYXMgYmVlbiBjb25maWd1cmVkLiAqL1xuICBwcml2YXRlIF9kaXNhYmxlTmF0aXZlR2VzdHVyZXNJZk5lY2Vzc2FyeSgpIHtcbiAgICBjb25zdCBnZXN0dXJlcyA9IHRoaXMudG91Y2hHZXN0dXJlcztcblxuICAgIGlmIChnZXN0dXJlcyAhPT0gJ29mZicpIHtcbiAgICAgIGNvbnN0IGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQ7XG4gICAgICBjb25zdCBzdHlsZSA9IGVsZW1lbnQuc3R5bGU7XG5cbiAgICAgIC8vIElmIGdlc3R1cmVzIGFyZSBzZXQgdG8gYGF1dG9gLCB3ZSBkb24ndCBkaXNhYmxlIHRleHQgc2VsZWN0aW9uIG9uIGlucHV0cyBhbmRcbiAgICAgIC8vIHRleHRhcmVhcywgYmVjYXVzZSBpdCBwcmV2ZW50cyB0aGUgdXNlciBmcm9tIHR5cGluZyBpbnRvIHRoZW0gb24gaU9TIFNhZmFyaS5cbiAgICAgIGlmIChnZXN0dXJlcyA9PT0gJ29uJyB8fCAoZWxlbWVudC5ub2RlTmFtZSAhPT0gJ0lOUFVUJyAmJiBlbGVtZW50Lm5vZGVOYW1lICE9PSAnVEVYVEFSRUEnKSkge1xuICAgICAgICBzdHlsZS51c2VyU2VsZWN0ID0gKHN0eWxlIGFzIGFueSkubXNVc2VyU2VsZWN0ID0gc3R5bGUud2Via2l0VXNlclNlbGVjdCA9IChzdHlsZSBhcyBhbnkpLk1velVzZXJTZWxlY3QgPVxuICAgICAgICAgICdub25lJztcbiAgICAgIH1cblxuICAgICAgLy8gSWYgd2UgaGF2ZSBgYXV0b2AgZ2VzdHVyZXMgYW5kIHRoZSBlbGVtZW50IHVzZXMgbmF0aXZlIEhUTUwgZHJhZ2dpbmcsXG4gICAgICAvLyB3ZSBkb24ndCBzZXQgYC13ZWJraXQtdXNlci1kcmFnYCBiZWNhdXNlIGl0IHByZXZlbnRzIHRoZSBuYXRpdmUgYmVoYXZpb3IuXG4gICAgICBpZiAoZ2VzdHVyZXMgPT09ICdvbicgfHwgIWVsZW1lbnQuZHJhZ2dhYmxlKSB7XG4gICAgICAgIChzdHlsZSBhcyBhbnkpLndlYmtpdFVzZXJEcmFnID0gJ25vbmUnO1xuICAgICAgfVxuXG4gICAgICBzdHlsZS50b3VjaEFjdGlvbiA9ICdub25lJztcbiAgICAgIHN0eWxlLndlYmtpdFRhcEhpZ2hsaWdodENvbG9yID0gJ3RyYW5zcGFyZW50JztcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgbmdBY2NlcHRJbnB1dFR5cGVfZGlzYWJsZWQ6IEJvb2xlYW5JbnB1dDtcbiAgc3RhdGljIG5nQWNjZXB0SW5wdXRUeXBlX2hpZGVEZWxheTogTnVtYmVySW5wdXQ7XG4gIHN0YXRpYyBuZ0FjY2VwdElucHV0VHlwZV9zaG93RGVsYXk6IE51bWJlcklucHV0O1xufVxuXG4vKipcbiAqIEludGVybmFsIGNvbXBvbmVudCB0aGF0IHdyYXBzIHRoZSB0b29sdGlwJ3MgY29udGVudC5cbiAqIEBkb2NzLXByaXZhdGVcbiAqL1xuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnbXR4LXRvb2x0aXAtY29tcG9uZW50JyxcbiAgdGVtcGxhdGVVcmw6ICd0b29sdGlwLmh0bWwnLFxuICBzdHlsZVVybHM6IFsndG9vbHRpcC5zY3NzJ10sXG4gIGVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmUsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxuICBhbmltYXRpb25zOiBbbXR4VG9vbHRpcEFuaW1hdGlvbnMudG9vbHRpcFN0YXRlXSxcbiAgaG9zdDoge1xuICAgIC8vIEZvcmNlcyB0aGUgZWxlbWVudCB0byBoYXZlIGEgbGF5b3V0IGluIElFIGFuZCBFZGdlLiBUaGlzIGZpeGVzIGlzc3VlcyB3aGVyZSB0aGUgZWxlbWVudFxuICAgIC8vIHdvbid0IGJlIHJlbmRlcmVkIGlmIHRoZSBhbmltYXRpb25zIGFyZSBkaXNhYmxlZCBvciB0aGVyZSBpcyBubyB3ZWIgYW5pbWF0aW9ucyBwb2x5ZmlsbC5cbiAgICAnW3N0eWxlLnpvb21dJzogJ192aXNpYmlsaXR5ID09PSBcInZpc2libGVcIiA/IDEgOiBudWxsJyxcbiAgICAnKGJvZHk6Y2xpY2spJzogJ3RoaXMuX2hhbmRsZUJvZHlJbnRlcmFjdGlvbigpJyxcbiAgICAnYXJpYS1oaWRkZW4nOiAndHJ1ZScsXG4gIH0sXG59KVxuZXhwb3J0IGNsYXNzIFRvb2x0aXBDb21wb25lbnQgaW1wbGVtZW50cyBPbkRlc3Ryb3kge1xuICAvKiogTWVzc2FnZSB0byBkaXNwbGF5IGluIHRoZSB0b29sdGlwICovXG4gIG1lc3NhZ2UhOiBzdHJpbmcgfCBUZW1wbGF0ZVJlZjxhbnk+O1xuXG4gIC8qKiBDbGFzc2VzIHRvIGJlIGFkZGVkIHRvIHRoZSB0b29sdGlwLiBTdXBwb3J0cyB0aGUgc2FtZSBzeW50YXggYXMgYG5nQ2xhc3NgLiAqL1xuICB0b29sdGlwQ2xhc3MhOiBzdHJpbmcgfCBzdHJpbmdbXSB8IFNldDxzdHJpbmc+IHwgeyBba2V5OiBzdHJpbmddOiBhbnkgfTtcblxuICAvKiogVGhlIHRpbWVvdXQgSUQgb2YgYW55IGN1cnJlbnQgdGltZXIgc2V0IHRvIHNob3cgdGhlIHRvb2x0aXAgKi9cbiAgX3Nob3dUaW1lb3V0SWQhOiBudW1iZXIgfCBudWxsO1xuXG4gIC8qKiBUaGUgdGltZW91dCBJRCBvZiBhbnkgY3VycmVudCB0aW1lciBzZXQgdG8gaGlkZSB0aGUgdG9vbHRpcCAqL1xuICBfaGlkZVRpbWVvdXRJZCE6IG51bWJlciB8IG51bGw7XG5cbiAgLyoqIFByb3BlcnR5IHdhdGNoZWQgYnkgdGhlIGFuaW1hdGlvbiBmcmFtZXdvcmsgdG8gc2hvdyBvciBoaWRlIHRoZSB0b29sdGlwICovXG4gIF92aXNpYmlsaXR5OiBUb29sdGlwVmlzaWJpbGl0eSA9ICdpbml0aWFsJztcblxuICAvKiogV2hldGhlciBpbnRlcmFjdGlvbnMgb24gdGhlIHBhZ2Ugc2hvdWxkIGNsb3NlIHRoZSB0b29sdGlwICovXG4gIHByaXZhdGUgX2Nsb3NlT25JbnRlcmFjdGlvbjogYm9vbGVhbiA9IGZhbHNlO1xuXG4gIC8qKiBTdWJqZWN0IGZvciBub3RpZnlpbmcgdGhhdCB0aGUgdG9vbHRpcCBoYXMgYmVlbiBoaWRkZW4gZnJvbSB0aGUgdmlldyAqL1xuICBwcml2YXRlIHJlYWRvbmx5IF9vbkhpZGU6IFN1YmplY3Q8dm9pZD4gPSBuZXcgU3ViamVjdCgpO1xuXG4gIC8qKiBTdHJlYW0gdGhhdCBlbWl0cyB3aGV0aGVyIHRoZSB1c2VyIGhhcyBhIGhhbmRzZXQtc2l6ZWQgZGlzcGxheS4gICovXG4gIF9pc0hhbmRzZXQ6IE9ic2VydmFibGU8QnJlYWtwb2ludFN0YXRlPiA9IHRoaXMuX2JyZWFrcG9pbnRPYnNlcnZlci5vYnNlcnZlKEJyZWFrcG9pbnRzLkhhbmRzZXQpO1xuXG4gIF9pc1RlbXBsYXRlUmVmKG9iajogYW55KSB7XG4gICAgcmV0dXJuIG9iaiBpbnN0YW5jZW9mIFRlbXBsYXRlUmVmO1xuICB9XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBfY2hhbmdlRGV0ZWN0b3JSZWY6IENoYW5nZURldGVjdG9yUmVmLFxuICAgIHByaXZhdGUgX2JyZWFrcG9pbnRPYnNlcnZlcjogQnJlYWtwb2ludE9ic2VydmVyXG4gICkge31cblxuICAvKipcbiAgICogU2hvd3MgdGhlIHRvb2x0aXAgd2l0aCBhbiBhbmltYXRpb24gb3JpZ2luYXRpbmcgZnJvbSB0aGUgcHJvdmlkZWQgb3JpZ2luXG4gICAqIEBwYXJhbSBkZWxheSBBbW91bnQgb2YgbWlsbGlzZWNvbmRzIHRvIHRoZSBkZWxheSBzaG93aW5nIHRoZSB0b29sdGlwLlxuICAgKi9cbiAgc2hvdyhkZWxheTogbnVtYmVyKTogdm9pZCB7XG4gICAgLy8gQ2FuY2VsIHRoZSBkZWxheWVkIGhpZGUgaWYgaXQgaXMgc2NoZWR1bGVkXG4gICAgaWYgKHRoaXMuX2hpZGVUaW1lb3V0SWQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLl9oaWRlVGltZW91dElkKTtcbiAgICAgIHRoaXMuX2hpZGVUaW1lb3V0SWQgPSBudWxsO1xuICAgIH1cblxuICAgIC8vIEJvZHkgaW50ZXJhY3Rpb25zIHNob3VsZCBjYW5jZWwgdGhlIHRvb2x0aXAgaWYgdGhlcmUgaXMgYSBkZWxheSBpbiBzaG93aW5nLlxuICAgIHRoaXMuX2Nsb3NlT25JbnRlcmFjdGlvbiA9IHRydWU7XG4gICAgdGhpcy5fc2hvd1RpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5fdmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcbiAgICAgIHRoaXMuX3Nob3dUaW1lb3V0SWQgPSBudWxsO1xuXG4gICAgICAvLyBNYXJrIGZvciBjaGVjayBzbyBpZiBhbnkgcGFyZW50IGNvbXBvbmVudCBoYXMgc2V0IHRoZVxuICAgICAgLy8gQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kgdG8gT25QdXNoIGl0IHdpbGwgYmUgY2hlY2tlZCBhbnl3YXlzXG4gICAgICB0aGlzLl9tYXJrRm9yQ2hlY2soKTtcbiAgICB9LCBkZWxheSkgYXMgYW55O1xuICB9XG5cbiAgLyoqXG4gICAqIEJlZ2lucyB0aGUgYW5pbWF0aW9uIHRvIGhpZGUgdGhlIHRvb2x0aXAgYWZ0ZXIgdGhlIHByb3ZpZGVkIGRlbGF5IGluIG1zLlxuICAgKiBAcGFyYW0gZGVsYXkgQW1vdW50IG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheSBzaG93aW5nIHRoZSB0b29sdGlwLlxuICAgKi9cbiAgaGlkZShkZWxheTogbnVtYmVyKTogdm9pZCB7XG4gICAgLy8gQ2FuY2VsIHRoZSBkZWxheWVkIHNob3cgaWYgaXQgaXMgc2NoZWR1bGVkXG4gICAgaWYgKHRoaXMuX3Nob3dUaW1lb3V0SWQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLl9zaG93VGltZW91dElkKTtcbiAgICAgIHRoaXMuX3Nob3dUaW1lb3V0SWQgPSBudWxsO1xuICAgIH1cblxuICAgIHRoaXMuX2hpZGVUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMuX3Zpc2liaWxpdHkgPSAnaGlkZGVuJztcbiAgICAgIHRoaXMuX2hpZGVUaW1lb3V0SWQgPSBudWxsO1xuXG4gICAgICAvLyBNYXJrIGZvciBjaGVjayBzbyBpZiBhbnkgcGFyZW50IGNvbXBvbmVudCBoYXMgc2V0IHRoZVxuICAgICAgLy8gQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kgdG8gT25QdXNoIGl0IHdpbGwgYmUgY2hlY2tlZCBhbnl3YXlzXG4gICAgICB0aGlzLl9tYXJrRm9yQ2hlY2soKTtcbiAgICB9LCBkZWxheSkgYXMgYW55O1xuICB9XG5cbiAgLyoqIFJldHVybnMgYW4gb2JzZXJ2YWJsZSB0aGF0IG5vdGlmaWVzIHdoZW4gdGhlIHRvb2x0aXAgaGFzIGJlZW4gaGlkZGVuIGZyb20gdmlldy4gKi9cbiAgYWZ0ZXJIaWRkZW4oKTogT2JzZXJ2YWJsZTx2b2lkPiB7XG4gICAgcmV0dXJuIHRoaXMuX29uSGlkZS5hc09ic2VydmFibGUoKTtcbiAgfVxuXG4gIC8qKiBXaGV0aGVyIHRoZSB0b29sdGlwIGlzIGJlaW5nIGRpc3BsYXllZC4gKi9cbiAgaXNWaXNpYmxlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl92aXNpYmlsaXR5ID09PSAndmlzaWJsZSc7XG4gIH1cblxuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLl9vbkhpZGUuY29tcGxldGUoKTtcbiAgfVxuXG4gIF9hbmltYXRpb25TdGFydCgpIHtcbiAgICB0aGlzLl9jbG9zZU9uSW50ZXJhY3Rpb24gPSBmYWxzZTtcbiAgfVxuXG4gIF9hbmltYXRpb25Eb25lKGV2ZW50OiBBbmltYXRpb25FdmVudCk6IHZvaWQge1xuICAgIGNvbnN0IHRvU3RhdGUgPSBldmVudC50b1N0YXRlIGFzIFRvb2x0aXBWaXNpYmlsaXR5O1xuXG4gICAgaWYgKHRvU3RhdGUgPT09ICdoaWRkZW4nICYmICF0aGlzLmlzVmlzaWJsZSgpKSB7XG4gICAgICB0aGlzLl9vbkhpZGUubmV4dCgpO1xuICAgIH1cblxuICAgIGlmICh0b1N0YXRlID09PSAndmlzaWJsZScgfHwgdG9TdGF0ZSA9PT0gJ2hpZGRlbicpIHtcbiAgICAgIHRoaXMuX2Nsb3NlT25JbnRlcmFjdGlvbiA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEludGVyYWN0aW9ucyBvbiB0aGUgSFRNTCBib2R5IHNob3VsZCBjbG9zZSB0aGUgdG9vbHRpcCBpbW1lZGlhdGVseSBhcyBkZWZpbmVkIGluIHRoZVxuICAgKiBtYXRlcmlhbCBkZXNpZ24gc3BlYy5cbiAgICogaHR0cHM6Ly9tYXRlcmlhbC5pby9kZXNpZ24vY29tcG9uZW50cy90b29sdGlwcy5odG1sI2JlaGF2aW9yXG4gICAqL1xuICBfaGFuZGxlQm9keUludGVyYWN0aW9uKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLl9jbG9zZU9uSW50ZXJhY3Rpb24pIHtcbiAgICAgIHRoaXMuaGlkZSgwKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTWFya3MgdGhhdCB0aGUgdG9vbHRpcCBuZWVkcyB0byBiZSBjaGVja2VkIGluIHRoZSBuZXh0IGNoYW5nZSBkZXRlY3Rpb24gcnVuLlxuICAgKiBNYWlubHkgdXNlZCBmb3IgcmVuZGVyaW5nIHRoZSBpbml0aWFsIHRleHQgYmVmb3JlIHBvc2l0aW9uaW5nIGEgdG9vbHRpcCwgd2hpY2hcbiAgICogY2FuIGJlIHByb2JsZW1hdGljIGluIGNvbXBvbmVudHMgd2l0aCBPblB1c2ggY2hhbmdlIGRldGVjdGlvbi5cbiAgICovXG4gIF9tYXJrRm9yQ2hlY2soKTogdm9pZCB7XG4gICAgdGhpcy5fY2hhbmdlRGV0ZWN0b3JSZWYubWFya0ZvckNoZWNrKCk7XG4gIH1cbn1cbiJdfQ==