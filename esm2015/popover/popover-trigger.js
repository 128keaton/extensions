import { Directive, ElementRef, EventEmitter, Input, Optional, Output, ViewContainerRef, HostListener, HostBinding, ChangeDetectorRef, } from '@angular/core';
import { isFakeMousedownFromScreenReader } from '@angular/cdk/a11y';
import { Directionality } from '@angular/cdk/bidi';
import { Overlay, OverlayConfig, } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { throwMtxPopoverMissingError } from './popover-errors';
/**
 * This directive is intended to be used in conjunction with an mtx-popover tag. It is
 * responsible for toggling the display of the provided popover instance.
 */
export class MtxPopoverTrigger {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wb3Zlci10cmlnZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvZXh0ZW5zaW9ucy9wb3BvdmVyL3BvcG92ZXItdHJpZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBRUwsU0FBUyxFQUNULFVBQVUsRUFDVixZQUFZLEVBQ1osS0FBSyxFQUVMLFFBQVEsRUFDUixNQUFNLEVBQ04sZ0JBQWdCLEVBQ2hCLFlBQVksRUFDWixXQUFXLEVBQ1gsaUJBQWlCLEdBQ2xCLE1BQU0sZUFBZSxDQUFDO0FBRXZCLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3BFLE9BQU8sRUFBYSxjQUFjLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM5RCxPQUFPLEVBQ0wsT0FBTyxFQUVQLGFBQWEsR0FLZCxNQUFNLHNCQUFzQixDQUFDO0FBQzlCLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUVyRCxPQUFPLEVBQWdCLE9BQU8sRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUM3QyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFTM0MsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFL0Q7OztHQUdHO0FBTUgsTUFBTSxPQUFPLGlCQUFpQjtJQXFDNUIsWUFDVSxRQUFpQixFQUNsQixXQUF1QixFQUN0QixpQkFBbUMsRUFDdkIsSUFBb0IsRUFDaEMsa0JBQXFDO1FBSnJDLGFBQVEsR0FBUixRQUFRLENBQVM7UUFDbEIsZ0JBQVcsR0FBWCxXQUFXLENBQVk7UUFDdEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFrQjtRQUN2QixTQUFJLEdBQUosSUFBSSxDQUFnQjtRQUNoQyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW1CO1FBekNaLGlCQUFZLEdBQUcsSUFBSSxDQUFDO1FBRXZELG1CQUFjLEdBQUcsSUFBSSxP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LENBQUMsUUFBUSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuICBBZnRlclZpZXdJbml0LFxyXG4gIERpcmVjdGl2ZSxcclxuICBFbGVtZW50UmVmLFxyXG4gIEV2ZW50RW1pdHRlcixcclxuICBJbnB1dCxcclxuICBPbkRlc3Ryb3ksXHJcbiAgT3B0aW9uYWwsXHJcbiAgT3V0cHV0LFxyXG4gIFZpZXdDb250YWluZXJSZWYsXHJcbiAgSG9zdExpc3RlbmVyLFxyXG4gIEhvc3RCaW5kaW5nLFxyXG4gIENoYW5nZURldGVjdG9yUmVmLFxyXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xyXG5cclxuaW1wb3J0IHsgaXNGYWtlTW91c2Vkb3duRnJvbVNjcmVlblJlYWRlciB9IGZyb20gJ0Bhbmd1bGFyL2Nkay9hMTF5JztcclxuaW1wb3J0IHsgRGlyZWN0aW9uLCBEaXJlY3Rpb25hbGl0eSB9IGZyb20gJ0Bhbmd1bGFyL2Nkay9iaWRpJztcclxuaW1wb3J0IHtcclxuICBPdmVybGF5LFxyXG4gIE92ZXJsYXlSZWYsXHJcbiAgT3ZlcmxheUNvbmZpZyxcclxuICBIb3Jpem9udGFsQ29ubmVjdGlvblBvcyxcclxuICBWZXJ0aWNhbENvbm5lY3Rpb25Qb3MsXHJcbiAgRmxleGlibGVDb25uZWN0ZWRQb3NpdGlvblN0cmF0ZWd5LFxyXG4gIFNjcm9sbFN0cmF0ZWd5LFxyXG59IGZyb20gJ0Bhbmd1bGFyL2Nkay9vdmVybGF5JztcclxuaW1wb3J0IHsgVGVtcGxhdGVQb3J0YWwgfSBmcm9tICdAYW5ndWxhci9jZGsvcG9ydGFsJztcclxuXHJcbmltcG9ydCB7IFN1YnNjcmlwdGlvbiwgU3ViamVjdCB9IGZyb20gJ3J4anMnO1xyXG5pbXBvcnQgeyB0YWtlVW50aWwgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XHJcblxyXG5pbXBvcnQgeyBNdHhQb3BvdmVyUGFuZWwsIE10eFRhcmdldCB9IGZyb20gJy4vcG9wb3Zlci1pbnRlcmZhY2VzJztcclxuaW1wb3J0IHtcclxuICBNdHhQb3BvdmVyUG9zaXRpb25YLFxyXG4gIE10eFBvcG92ZXJQb3NpdGlvblksXHJcbiAgTXR4UG9wb3ZlclRyaWdnZXJFdmVudCxcclxuICBNdHhQb3BvdmVyU2Nyb2xsU3RyYXRlZ3ksXHJcbn0gZnJvbSAnLi9wb3BvdmVyLXR5cGVzJztcclxuaW1wb3J0IHsgdGhyb3dNdHhQb3BvdmVyTWlzc2luZ0Vycm9yIH0gZnJvbSAnLi9wb3BvdmVyLWVycm9ycyc7XHJcblxyXG4vKipcclxuICogVGhpcyBkaXJlY3RpdmUgaXMgaW50ZW5kZWQgdG8gYmUgdXNlZCBpbiBjb25qdW5jdGlvbiB3aXRoIGFuIG10eC1wb3BvdmVyIHRhZy4gSXQgaXNcclxuICogcmVzcG9uc2libGUgZm9yIHRvZ2dsaW5nIHRoZSBkaXNwbGF5IG9mIHRoZSBwcm92aWRlZCBwb3BvdmVyIGluc3RhbmNlLlxyXG4gKi9cclxuXHJcbkBEaXJlY3RpdmUoe1xyXG4gIHNlbGVjdG9yOiAnW210eFBvcG92ZXJUcmlnZ2VyRm9yXScsXHJcbiAgZXhwb3J0QXM6ICdtdHhQb3BvdmVyVHJpZ2dlcicsXHJcbn0pXHJcbmV4cG9ydCBjbGFzcyBNdHhQb3BvdmVyVHJpZ2dlciBpbXBsZW1lbnRzIEFmdGVyVmlld0luaXQsIE9uRGVzdHJveSB7XHJcbiAgQEhvc3RCaW5kaW5nKCdhdHRyLmFyaWEtaGFzcG9wdXAnKSBhcmlhSGFzcG9wdXAgPSB0cnVlO1xyXG5cclxuICBwb3BvdmVyT3BlbmVkJCA9IG5ldyBTdWJqZWN0PHZvaWQ+KCk7XHJcbiAgcG9wb3ZlckNsb3NlZCQgPSBuZXcgU3ViamVjdDx2b2lkPigpO1xyXG5cclxuICBwcml2YXRlIF9wb3J0YWwhOiBUZW1wbGF0ZVBvcnRhbDxhbnk+O1xyXG4gIHByaXZhdGUgX292ZXJsYXlSZWY6IE92ZXJsYXlSZWYgfCBudWxsID0gbnVsbDtcclxuICBwcml2YXRlIF9wb3BvdmVyT3BlbiA9IGZhbHNlO1xyXG4gIHByaXZhdGUgX2hhbHQgPSBmYWxzZTtcclxuICBwcml2YXRlIF9iYWNrZHJvcFN1YnNjcmlwdGlvbiE6IFN1YnNjcmlwdGlvbjtcclxuICBwcml2YXRlIF9wb3NpdGlvblN1YnNjcmlwdGlvbiE6IFN1YnNjcmlwdGlvbjtcclxuICBwcml2YXRlIF9kZXRhY2htZW50c1N1YnNjcmlwdGlvbiE6IFN1YnNjcmlwdGlvbjtcclxuXHJcbiAgcHJpdmF0ZSBfbW91c2VvdmVyVGltZXI6IGFueTtcclxuXHJcbiAgLy8gdHJhY2tpbmcgaW5wdXQgdHlwZSBpcyBuZWNlc3Nhcnkgc28gaXQncyBwb3NzaWJsZSB0byBvbmx5IGF1dG8tZm9jdXNcclxuICAvLyB0aGUgZmlyc3QgaXRlbSBvZiB0aGUgbGlzdCB3aGVuIHRoZSBwb3BvdmVyIGlzIG9wZW5lZCB2aWEgdGhlIGtleWJvYXJkXHJcbiAgcHJpdmF0ZSBfb3BlbmVkQnlNb3VzZSA9IGZhbHNlO1xyXG5cclxuICBwcml2YXRlIF9vbkRlc3Ryb3kgPSBuZXcgU3ViamVjdDx2b2lkPigpO1xyXG5cclxuICAvKiogUmVmZXJlbmNlcyB0aGUgcG9wb3ZlciBpbnN0YW5jZSB0aGF0IHRoZSB0cmlnZ2VyIGlzIGFzc29jaWF0ZWQgd2l0aC4gKi9cclxuICBASW5wdXQoJ210eFBvcG92ZXJUcmlnZ2VyRm9yJykgcG9wb3ZlciE6IE10eFBvcG92ZXJQYW5lbDtcclxuXHJcbiAgLyoqIFJlZmVyZW5jZXMgdGhlIHBvcG92ZXIgdGFyZ2V0IGluc3RhbmNlIHRoYXQgdGhlIHRyaWdnZXIgaXMgYXNzb2NpYXRlZCB3aXRoLiAqL1xyXG4gIEBJbnB1dCgnbXR4UG9wb3ZlclRhcmdldEF0JykgdGFyZ2V0RWxlbWVudCE6IE10eFRhcmdldDtcclxuXHJcbiAgLyoqIFBvcG92ZXIgdHJpZ2dlciBldmVudCAqL1xyXG4gIEBJbnB1dCgnbXR4UG9wb3ZlclRyaWdnZXJPbicpIHRyaWdnZXJFdmVudCE6IE10eFBvcG92ZXJUcmlnZ2VyRXZlbnQ7XHJcblxyXG4gIC8qKiBFdmVudCBlbWl0dGVkIHdoZW4gdGhlIGFzc29jaWF0ZWQgcG9wb3ZlciBpcyBvcGVuZWQuICovXHJcbiAgQE91dHB1dCgpIHBvcG92ZXJPcGVuZWQgPSBuZXcgRXZlbnRFbWl0dGVyPHZvaWQ+KCk7XHJcblxyXG4gIC8qKiBFdmVudCBlbWl0dGVkIHdoZW4gdGhlIGFzc29jaWF0ZWQgcG9wb3ZlciBpcyBjbG9zZWQuICovXHJcbiAgQE91dHB1dCgpIHBvcG92ZXJDbG9zZWQgPSBuZXcgRXZlbnRFbWl0dGVyPHZvaWQ+KCk7XHJcblxyXG4gIGNvbnN0cnVjdG9yKFxyXG4gICAgcHJpdmF0ZSBfb3ZlcmxheTogT3ZlcmxheSxcclxuICAgIHB1YmxpYyBfZWxlbWVudFJlZjogRWxlbWVudFJlZixcclxuICAgIHByaXZhdGUgX3ZpZXdDb250YWluZXJSZWY6IFZpZXdDb250YWluZXJSZWYsXHJcbiAgICBAT3B0aW9uYWwoKSBwcml2YXRlIF9kaXI6IERpcmVjdGlvbmFsaXR5LFxyXG4gICAgcHJpdmF0ZSBfY2hhbmdlRGV0ZWN0b3JSZWY6IENoYW5nZURldGVjdG9yUmVmXHJcbiAgKSB7fVxyXG5cclxuICBuZ0FmdGVyVmlld0luaXQoKSB7XHJcbiAgICB0aGlzLl9jaGVja1BvcG92ZXIoKTtcclxuICAgIHRoaXMuX3NldEN1cnJlbnRDb25maWcoKTtcclxuICAgIHRoaXMucG9wb3Zlci5jbG9zZWQuc3Vic2NyaWJlKCgpID0+IHRoaXMuY2xvc2VQb3BvdmVyKCkpO1xyXG4gIH1cclxuXHJcbiAgbmdPbkRlc3Ryb3koKSB7XHJcbiAgICB0aGlzLmRlc3Ryb3lQb3BvdmVyKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIF9zZXRDdXJyZW50Q29uZmlnKCkge1xyXG4gICAgaWYgKHRoaXMudHJpZ2dlckV2ZW50KSB7XHJcbiAgICAgIHRoaXMucG9wb3Zlci50cmlnZ2VyRXZlbnQgPSB0aGlzLnRyaWdnZXJFdmVudDtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnBvcG92ZXIuc2V0Q3VycmVudFN0eWxlcygpO1xyXG4gIH1cclxuXHJcbiAgLyoqIFdoZXRoZXIgdGhlIHBvcG92ZXIgaXMgb3Blbi4gKi9cclxuICBnZXQgcG9wb3Zlck9wZW4oKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gdGhpcy5fcG9wb3Zlck9wZW47XHJcbiAgfVxyXG5cclxuICBASG9zdExpc3RlbmVyKCdjbGljaycsIFsnJGV2ZW50J10pXHJcbiAgb25DbGljayhldmVudDogTW91c2VFdmVudCk6IHZvaWQge1xyXG4gICAgaWYgKHRoaXMucG9wb3Zlci50cmlnZ2VyRXZlbnQgPT09ICdjbGljaycpIHtcclxuICAgICAgdGhpcy50b2dnbGVQb3BvdmVyKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBASG9zdExpc3RlbmVyKCdtb3VzZWVudGVyJywgWyckZXZlbnQnXSlcclxuICBvbk1vdXNlRW50ZXIoZXZlbnQ6IE1vdXNlRXZlbnQpOiB2b2lkIHtcclxuICAgIHRoaXMuX2hhbHQgPSBmYWxzZTtcclxuICAgIGlmICh0aGlzLnBvcG92ZXIudHJpZ2dlckV2ZW50ID09PSAnaG92ZXInKSB7XHJcbiAgICAgIHRoaXMuX21vdXNlb3ZlclRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5vcGVuUG9wb3ZlcigpO1xyXG4gICAgICB9LCB0aGlzLnBvcG92ZXIuZW50ZXJEZWxheSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBASG9zdExpc3RlbmVyKCdtb3VzZWxlYXZlJywgWyckZXZlbnQnXSlcclxuICBvbk1vdXNlTGVhdmUoZXZlbnQ6IE1vdXNlRXZlbnQpOiB2b2lkIHtcclxuICAgIGlmICh0aGlzLnBvcG92ZXIudHJpZ2dlckV2ZW50ID09PSAnaG92ZXInKSB7XHJcbiAgICAgIGlmICh0aGlzLl9tb3VzZW92ZXJUaW1lcikge1xyXG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLl9tb3VzZW92ZXJUaW1lcik7XHJcbiAgICAgICAgdGhpcy5fbW91c2VvdmVyVGltZXIgPSBudWxsO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh0aGlzLl9wb3BvdmVyT3Blbikge1xyXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgaWYgKCF0aGlzLnBvcG92ZXIuY2xvc2VEaXNhYmxlZCkge1xyXG4gICAgICAgICAgICB0aGlzLmNsb3NlUG9wb3ZlcigpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sIHRoaXMucG9wb3Zlci5sZWF2ZURlbGF5KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLl9oYWx0ID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqIFRvZ2dsZXMgdGhlIHBvcG92ZXIgYmV0d2VlbiB0aGUgb3BlbiBhbmQgY2xvc2VkIHN0YXRlcy4gKi9cclxuICB0b2dnbGVQb3BvdmVyKCk6IHZvaWQge1xyXG4gICAgcmV0dXJuIHRoaXMuX3BvcG92ZXJPcGVuID8gdGhpcy5jbG9zZVBvcG92ZXIoKSA6IHRoaXMub3BlblBvcG92ZXIoKTtcclxuICB9XHJcblxyXG4gIC8qKiBPcGVucyB0aGUgcG9wb3Zlci4gKi9cclxuICBvcGVuUG9wb3ZlcigpOiB2b2lkIHtcclxuICAgIGlmICghdGhpcy5fcG9wb3Zlck9wZW4gJiYgIXRoaXMuX2hhbHQpIHtcclxuICAgICAgdGhpcy5fY3JlYXRlT3ZlcmxheSgpLmF0dGFjaCh0aGlzLl9wb3J0YWwpO1xyXG5cclxuICAgICAgdGhpcy5fc3Vic2NyaWJlVG9CYWNrZHJvcCgpO1xyXG4gICAgICB0aGlzLl9zdWJzY3JpYmVUb0RldGFjaG1lbnRzKCk7XHJcblxyXG4gICAgICB0aGlzLl9pbml0UG9wb3ZlcigpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqIENsb3NlcyB0aGUgcG9wb3Zlci4gKi9cclxuICBjbG9zZVBvcG92ZXIoKTogdm9pZCB7XHJcbiAgICBpZiAodGhpcy5fb3ZlcmxheVJlZikge1xyXG4gICAgICB0aGlzLl9vdmVybGF5UmVmLmRldGFjaCgpO1xyXG4gICAgICB0aGlzLl9yZXNldFBvcG92ZXIoKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmRlc3Ryb3lQb3BvdmVyKCk7XHJcbiAgfVxyXG5cclxuICAvKiogUmVtb3ZlcyB0aGUgcG9wb3ZlciBmcm9tIHRoZSBET00uICovXHJcbiAgZGVzdHJveVBvcG92ZXIoKTogdm9pZCB7XHJcbiAgICBpZiAodGhpcy5fbW91c2VvdmVyVGltZXIpIHtcclxuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX21vdXNlb3ZlclRpbWVyKTtcclxuICAgICAgdGhpcy5fbW91c2VvdmVyVGltZXIgPSBudWxsO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuX292ZXJsYXlSZWYpIHtcclxuICAgICAgdGhpcy5fb3ZlcmxheVJlZi5kaXNwb3NlKCk7XHJcbiAgICAgIHRoaXMuX292ZXJsYXlSZWYgPSBudWxsO1xyXG4gICAgICB0aGlzLl9jbGVhblVwU3Vic2NyaXB0aW9ucygpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuX29uRGVzdHJveS5uZXh0KCk7XHJcbiAgICB0aGlzLl9vbkRlc3Ryb3kuY29tcGxldGUoKTtcclxuICB9XHJcblxyXG4gIC8qKiBGb2N1c2VzIHRoZSBwb3BvdmVyIHRyaWdnZXIuICovXHJcbiAgZm9jdXMoKSB7XHJcbiAgICB0aGlzLl9lbGVtZW50UmVmLm5hdGl2ZUVsZW1lbnQuZm9jdXMoKTtcclxuICB9XHJcblxyXG4gIC8qKiBUaGUgdGV4dCBkaXJlY3Rpb24gb2YgdGhlIGNvbnRhaW5pbmcgYXBwLiAqL1xyXG4gIGdldCBkaXIoKTogRGlyZWN0aW9uIHtcclxuICAgIHJldHVybiB0aGlzLl9kaXIgJiYgdGhpcy5fZGlyLnZhbHVlID09PSAncnRsJyA/ICdydGwnIDogJ2x0cic7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBUaGlzIG1ldGhvZCBlbnN1cmVzIHRoYXQgdGhlIHBvcG92ZXIgY2xvc2VzIHdoZW4gdGhlIG92ZXJsYXkgYmFja2Ryb3AgaXMgY2xpY2tlZC5cclxuICAgKiBXZSBkbyBub3QgdXNlIGZpcnN0KCkgaGVyZSBiZWNhdXNlIGRvaW5nIHNvIHdvdWxkIG5vdCBjYXRjaCBjbGlja3MgZnJvbSB3aXRoaW5cclxuICAgKiB0aGUgcG9wb3ZlciwgYW5kIGl0IHdvdWxkIGZhaWwgdG8gdW5zdWJzY3JpYmUgcHJvcGVybHkuIEluc3RlYWQsIHdlIHVuc3Vic2NyaWJlXHJcbiAgICogZXhwbGljaXRseSB3aGVuIHRoZSBwb3BvdmVyIGlzIGNsb3NlZCBvciBkZXN0cm95ZWQuXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBfc3Vic2NyaWJlVG9CYWNrZHJvcCgpOiB2b2lkIHtcclxuICAgIGlmICh0aGlzLl9vdmVybGF5UmVmKSB7XHJcbiAgICAgIC8qKiBPbmx5IHN1YnNjcmliZSB0byBiYWNrZHJvcCBpZiB0cmlnZ2VyIGV2ZW50IGlzIGNsaWNrICovXHJcbiAgICAgIGlmICh0aGlzLnRyaWdnZXJFdmVudCA9PT0gJ2NsaWNrJyAmJiB0aGlzLnBvcG92ZXIuY2xvc2VPbkJhY2tkcm9wQ2xpY2sgPT09IHRydWUpIHtcclxuICAgICAgICB0aGlzLl9vdmVybGF5UmVmXHJcbiAgICAgICAgICAuYmFja2Ryb3BDbGljaygpXHJcbiAgICAgICAgICAucGlwZSh0YWtlVW50aWwodGhpcy5wb3BvdmVyQ2xvc2VkJCksIHRha2VVbnRpbCh0aGlzLl9vbkRlc3Ryb3kpKVxyXG4gICAgICAgICAgLnN1YnNjcmliZSgoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucG9wb3Zlci5fZW1pdENsb3NlRXZlbnQoKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIF9zdWJzY3JpYmVUb0RldGFjaG1lbnRzKCk6IHZvaWQge1xyXG4gICAgaWYgKHRoaXMuX292ZXJsYXlSZWYpIHtcclxuICAgICAgdGhpcy5fb3ZlcmxheVJlZlxyXG4gICAgICAgIC5kZXRhY2htZW50cygpXHJcbiAgICAgICAgLnBpcGUodGFrZVVudGlsKHRoaXMucG9wb3ZlckNsb3NlZCQpLCB0YWtlVW50aWwodGhpcy5fb25EZXN0cm95KSlcclxuICAgICAgICAuc3Vic2NyaWJlKCgpID0+IHtcclxuICAgICAgICAgIHRoaXMuX3NldFBvcG92ZXJDbG9zZWQoKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFRoaXMgbWV0aG9kIHNldHMgdGhlIHBvcG92ZXIgc3RhdGUgdG8gb3BlbiBhbmQgZm9jdXNlcyB0aGUgZmlyc3QgaXRlbSBpZlxyXG4gICAqIHRoZSBwb3BvdmVyIHdhcyBvcGVuZWQgdmlhIHRoZSBrZXlib2FyZC5cclxuICAgKi9cclxuICBwcml2YXRlIF9pbml0UG9wb3ZlcigpOiB2b2lkIHtcclxuICAgIHRoaXMuX3NldFBvcG92ZXJPcGVuZWQoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFRoaXMgbWV0aG9kIHJlc2V0cyB0aGUgcG9wb3ZlciB3aGVuIGl0J3MgY2xvc2VkLCBtb3N0IGltcG9ydGFudGx5IHJlc3RvcmluZ1xyXG4gICAqIGZvY3VzIHRvIHRoZSBwb3BvdmVyIHRyaWdnZXIgaWYgdGhlIHBvcG92ZXIgd2FzIG9wZW5lZCB2aWEgdGhlIGtleWJvYXJkLlxyXG4gICAqL1xyXG4gIHByaXZhdGUgX3Jlc2V0UG9wb3ZlcigpOiB2b2lkIHtcclxuICAgIHRoaXMuX3NldFBvcG92ZXJDbG9zZWQoKTtcclxuXHJcbiAgICAvLyBGb2N1cyBvbmx5IG5lZWRzIHRvIGJlIHJlc2V0IHRvIHRoZSBob3N0IGVsZW1lbnQgaWYgdGhlIHBvcG92ZXIgd2FzIG9wZW5lZFxyXG4gICAgLy8gYnkgdGhlIGtleWJvYXJkIGFuZCBtYW51YWxseSBzaGlmdGVkIHRvIHRoZSBmaXJzdCBwb3BvdmVyIGl0ZW0uXHJcbiAgICBpZiAoIXRoaXMuX29wZW5lZEJ5TW91c2UpIHtcclxuICAgICAgdGhpcy5mb2N1cygpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5fb3BlbmVkQnlNb3VzZSA9IGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgLyoqIHNldCBzdGF0ZSByYXRoZXIgdGhhbiB0b2dnbGUgdG8gc3VwcG9ydCB0cmlnZ2VycyBzaGFyaW5nIGEgcG9wb3ZlciAqL1xyXG4gIHByaXZhdGUgX3NldFBvcG92ZXJPcGVuZWQoKTogdm9pZCB7XHJcbiAgICBpZiAoIXRoaXMuX3BvcG92ZXJPcGVuKSB7XHJcbiAgICAgIHRoaXMuX3BvcG92ZXJPcGVuID0gdHJ1ZTtcclxuXHJcbiAgICAgIHRoaXMucG9wb3Zlck9wZW5lZCQubmV4dCgpO1xyXG4gICAgICB0aGlzLnBvcG92ZXJPcGVuZWQuZW1pdCgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqIHNldCBzdGF0ZSByYXRoZXIgdGhhbiB0b2dnbGUgdG8gc3VwcG9ydCB0cmlnZ2VycyBzaGFyaW5nIGEgcG9wb3ZlciAqL1xyXG4gIHByaXZhdGUgX3NldFBvcG92ZXJDbG9zZWQoKTogdm9pZCB7XHJcbiAgICBpZiAodGhpcy5fcG9wb3Zlck9wZW4pIHtcclxuICAgICAgdGhpcy5fcG9wb3Zlck9wZW4gPSBmYWxzZTtcclxuXHJcbiAgICAgIHRoaXMucG9wb3ZlckNsb3NlZCQubmV4dCgpO1xyXG4gICAgICB0aGlzLnBvcG92ZXJDbG9zZWQuZW1pdCgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogIFRoaXMgbWV0aG9kIGNoZWNrcyB0aGF0IGEgdmFsaWQgaW5zdGFuY2Ugb2YgTWRQb3BvdmVyIGhhcyBiZWVuIHBhc3NlZCBpbnRvXHJcbiAgICogIG1kUG9wb3ZlclRyaWdnZXJGb3IuIElmIG5vdCwgYW4gZXhjZXB0aW9uIGlzIHRocm93bi5cclxuICAgKi9cclxuICBwcml2YXRlIF9jaGVja1BvcG92ZXIoKSB7XHJcbiAgICBpZiAoIXRoaXMucG9wb3Zlcikge1xyXG4gICAgICB0aHJvd010eFBvcG92ZXJNaXNzaW5nRXJyb3IoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqICBUaGlzIG1ldGhvZCBjcmVhdGVzIHRoZSBvdmVybGF5IGZyb20gdGhlIHByb3ZpZGVkIHBvcG92ZXIncyB0ZW1wbGF0ZSBhbmQgc2F2ZXMgaXRzXHJcbiAgICogIE92ZXJsYXlSZWYgc28gdGhhdCBpdCBjYW4gYmUgYXR0YWNoZWQgdG8gdGhlIERPTSB3aGVuIG9wZW5Qb3BvdmVyIGlzIGNhbGxlZC5cclxuICAgKi9cclxuICBwcml2YXRlIF9jcmVhdGVPdmVybGF5KCk6IE92ZXJsYXlSZWYge1xyXG4gICAgaWYgKCF0aGlzLl9vdmVybGF5UmVmKSB7XHJcbiAgICAgIHRoaXMuX3BvcnRhbCA9IG5ldyBUZW1wbGF0ZVBvcnRhbCh0aGlzLnBvcG92ZXIudGVtcGxhdGVSZWYsIHRoaXMuX3ZpZXdDb250YWluZXJSZWYpO1xyXG4gICAgICBjb25zdCBjb25maWcgPSB0aGlzLl9nZXRPdmVybGF5Q29uZmlnKCk7XHJcbiAgICAgIHRoaXMuX3N1YnNjcmliZVRvUG9zaXRpb25zKGNvbmZpZy5wb3NpdGlvblN0cmF0ZWd5IGFzIEZsZXhpYmxlQ29ubmVjdGVkUG9zaXRpb25TdHJhdGVneSk7XHJcbiAgICAgIHRoaXMuX292ZXJsYXlSZWYgPSB0aGlzLl9vdmVybGF5LmNyZWF0ZShjb25maWcpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzLl9vdmVybGF5UmVmO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVGhpcyBtZXRob2QgYnVpbGRzIHRoZSBjb25maWd1cmF0aW9uIG9iamVjdCBuZWVkZWQgdG8gY3JlYXRlIHRoZSBvdmVybGF5LCB0aGUgT3ZlcmxheUNvbmZpZy5cclxuICAgKiBAcmV0dXJucyBPdmVybGF5Q29uZmlnXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBfZ2V0T3ZlcmxheUNvbmZpZygpOiBPdmVybGF5Q29uZmlnIHtcclxuICAgIGNvbnN0IG92ZXJsYXlTdGF0ZSA9IG5ldyBPdmVybGF5Q29uZmlnKCk7XHJcbiAgICBvdmVybGF5U3RhdGUucG9zaXRpb25TdHJhdGVneSA9IHRoaXMuX2dldFBvc2l0aW9uKCk7XHJcblxyXG4gICAgLyoqIERpc3BsYXkgb3ZlcmxheSBiYWNrZHJvcCBpZiB0cmlnZ2VyIGV2ZW50IGlzIGNsaWNrICovXHJcbiAgICBpZiAodGhpcy50cmlnZ2VyRXZlbnQgPT09ICdjbGljaycpIHtcclxuICAgICAgb3ZlcmxheVN0YXRlLmhhc0JhY2tkcm9wID0gdHJ1ZTtcclxuICAgICAgb3ZlcmxheVN0YXRlLmJhY2tkcm9wQ2xhc3MgPSAnY2RrLW92ZXJsYXktdHJhbnNwYXJlbnQtYmFja2Ryb3AnO1xyXG4gICAgfVxyXG5cclxuICAgIG92ZXJsYXlTdGF0ZS5kaXJlY3Rpb24gPSB0aGlzLmRpcjtcclxuICAgIG92ZXJsYXlTdGF0ZS5zY3JvbGxTdHJhdGVneSA9IHRoaXMuX2dldE92ZXJsYXlTY3JvbGxTdHJhdGVneSh0aGlzLnBvcG92ZXIuc2Nyb2xsU3RyYXRlZ3kpO1xyXG5cclxuICAgIHJldHVybiBvdmVybGF5U3RhdGU7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBUaGlzIG1ldGhvZCByZXR1cm5zIHRoZSBzY3JvbGwgc3RyYXRlZ3kgdXNlZCBieSB0aGUgY2RrL292ZXJsYXkuXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBfZ2V0T3ZlcmxheVNjcm9sbFN0cmF0ZWd5KHN0cmF0ZWd5OiBNdHhQb3BvdmVyU2Nyb2xsU3RyYXRlZ3kpOiBTY3JvbGxTdHJhdGVneSB7XHJcbiAgICBzd2l0Y2ggKHN0cmF0ZWd5KSB7XHJcbiAgICAgIGNhc2UgJ25vb3AnOlxyXG4gICAgICAgIHJldHVybiB0aGlzLl9vdmVybGF5LnNjcm9sbFN0cmF0ZWdpZXMubm9vcCgpO1xyXG4gICAgICBjYXNlICdjbG9zZSc6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX292ZXJsYXkuc2Nyb2xsU3RyYXRlZ2llcy5jbG9zZSgpO1xyXG4gICAgICBjYXNlICdibG9jayc6XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX292ZXJsYXkuc2Nyb2xsU3RyYXRlZ2llcy5ibG9jaygpO1xyXG4gICAgICBjYXNlICdyZXBvc2l0aW9uJzpcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4gdGhpcy5fb3ZlcmxheS5zY3JvbGxTdHJhdGVnaWVzLnJlcG9zaXRpb24oKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExpc3RlbnMgdG8gY2hhbmdlcyBpbiB0aGUgcG9zaXRpb24gb2YgdGhlIG92ZXJsYXkgYW5kIHNldHMgdGhlIGNvcnJlY3QgY2xhc3Nlc1xyXG4gICAqIG9uIHRoZSBwb3BvdmVyIGJhc2VkIG9uIHRoZSBuZXcgcG9zaXRpb24uIFRoaXMgZW5zdXJlcyB0aGUgYW5pbWF0aW9uIG9yaWdpbiBpcyBhbHdheXNcclxuICAgKiBjb3JyZWN0LCBldmVuIGlmIGEgZmFsbGJhY2sgcG9zaXRpb24gaXMgdXNlZCBmb3IgdGhlIG92ZXJsYXkuXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBfc3Vic2NyaWJlVG9Qb3NpdGlvbnMocG9zaXRpb246IEZsZXhpYmxlQ29ubmVjdGVkUG9zaXRpb25TdHJhdGVneSk6IHZvaWQge1xyXG4gICAgdGhpcy5fcG9zaXRpb25TdWJzY3JpcHRpb24gPSBwb3NpdGlvbi5wb3NpdGlvbkNoYW5nZXMuc3Vic2NyaWJlKGNoYW5nZSA9PiB7XHJcbiAgICAgIGNvbnN0IHBvc2lzaW9uWDogTXR4UG9wb3ZlclBvc2l0aW9uWCA9XHJcbiAgICAgICAgY2hhbmdlLmNvbm5lY3Rpb25QYWlyLm92ZXJsYXlYID09PSAnc3RhcnQnXHJcbiAgICAgICAgICA/ICdhZnRlcidcclxuICAgICAgICAgIDogY2hhbmdlLmNvbm5lY3Rpb25QYWlyLm92ZXJsYXlYID09PSAnZW5kJ1xyXG4gICAgICAgICAgPyAnYmVmb3JlJ1xyXG4gICAgICAgICAgOiAnY2VudGVyJztcclxuICAgICAgY29uc3QgcG9zaXNpb25ZOiBNdHhQb3BvdmVyUG9zaXRpb25ZID1cclxuICAgICAgICBjaGFuZ2UuY29ubmVjdGlvblBhaXIub3ZlcmxheVkgPT09ICd0b3AnID8gJ2JlbG93JyA6ICdhYm92ZSc7XHJcblxyXG4gICAgICAvLyByZXF1aXJlZCBmb3IgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoXHJcbiAgICAgIHRoaXMuX2NoYW5nZURldGVjdG9yUmVmLm1hcmtGb3JDaGVjaygpO1xyXG5cclxuICAgICAgdGhpcy5wb3BvdmVyLnpvbmUucnVuKCgpID0+IHtcclxuICAgICAgICB0aGlzLnBvcG92ZXIueFBvc2l0aW9uID0gcG9zaXNpb25YO1xyXG4gICAgICAgIHRoaXMucG9wb3Zlci55UG9zaXRpb24gPSBwb3Npc2lvblk7XHJcbiAgICAgICAgdGhpcy5wb3BvdmVyLnNldEN1cnJlbnRTdHlsZXMoKTtcclxuXHJcbiAgICAgICAgdGhpcy5wb3BvdmVyLnNldFBvc2l0aW9uQ2xhc3Nlcyhwb3Npc2lvblgsIHBvc2lzaW9uWSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBUaGlzIG1ldGhvZCBidWlsZHMgdGhlIHBvc2l0aW9uIHN0cmF0ZWd5IGZvciB0aGUgb3ZlcmxheSwgc28gdGhlIHBvcG92ZXIgaXMgcHJvcGVybHkgY29ubmVjdGVkXHJcbiAgICogdG8gdGhlIHRyaWdnZXIuXHJcbiAgICogQHJldHVybnMgQ29ubmVjdGVkUG9zaXRpb25TdHJhdGVneVxyXG4gICAqL1xyXG4gIHByaXZhdGUgX2dldFBvc2l0aW9uKCk6IEZsZXhpYmxlQ29ubmVjdGVkUG9zaXRpb25TdHJhdGVneSB7XHJcbiAgICBjb25zdCBbb3JpZ2luWCwgb3JpZ2luMm5kWCwgb3JpZ2luM3JkWF06IEhvcml6b250YWxDb25uZWN0aW9uUG9zW10gPVxyXG4gICAgICB0aGlzLnBvcG92ZXIueFBvc2l0aW9uID09PSAnYmVmb3JlJ1xyXG4gICAgICAgID8gWydlbmQnLCAnc3RhcnQnLCAnY2VudGVyJ11cclxuICAgICAgICA6IHRoaXMucG9wb3Zlci54UG9zaXRpb24gPT09ICdhZnRlcidcclxuICAgICAgICA/IFsnc3RhcnQnLCAnZW5kJywgJ2NlbnRlciddXHJcbiAgICAgICAgOiBbJ2NlbnRlcicsICdzdGFydCcsICdlbmQnXTtcclxuXHJcbiAgICBjb25zdCBbb3ZlcmxheVksIG92ZXJsYXlGYWxsYmFja1ldOiBWZXJ0aWNhbENvbm5lY3Rpb25Qb3NbXSA9XHJcbiAgICAgIHRoaXMucG9wb3Zlci55UG9zaXRpb24gPT09ICdhYm92ZScgPyBbJ2JvdHRvbScsICd0b3AnXSA6IFsndG9wJywgJ2JvdHRvbSddO1xyXG5cclxuICAgIC8qKiBSZXZlcnNlIG92ZXJsYXlZIGFuZCBmYWxsYmFja092ZXJsYXlZIHdoZW4gb3ZlcmxhcFRyaWdnZXIgaXMgZmFsc2UgKi9cclxuICAgIGNvbnN0IG9yaWdpblkgPSB0aGlzLnBvcG92ZXIub3ZlcmxhcFRyaWdnZXIgPyBvdmVybGF5WSA6IG92ZXJsYXlGYWxsYmFja1k7XHJcbiAgICBjb25zdCBvcmlnaW5GYWxsYmFja1kgPSB0aGlzLnBvcG92ZXIub3ZlcmxhcFRyaWdnZXIgPyBvdmVybGF5RmFsbGJhY2tZIDogb3ZlcmxheVk7XHJcblxyXG4gICAgY29uc3Qgb3ZlcmxheVggPSBvcmlnaW5YO1xyXG5cclxuICAgIGNvbnN0IG9mZnNldFggPVxyXG4gICAgICB0aGlzLnBvcG92ZXIueE9mZnNldCAmJiAhaXNOYU4oTnVtYmVyKHRoaXMucG9wb3Zlci54T2Zmc2V0KSlcclxuICAgICAgICA/IE51bWJlcih0aGlzLnBvcG92ZXIueE9mZnNldClcclxuICAgICAgICA6IDA7XHJcbiAgICBjb25zdCBvZmZzZXRZID1cclxuICAgICAgdGhpcy5wb3BvdmVyLnlPZmZzZXQgJiYgIWlzTmFOKE51bWJlcih0aGlzLnBvcG92ZXIueU9mZnNldCkpXHJcbiAgICAgICAgPyBOdW1iZXIodGhpcy5wb3BvdmVyLnlPZmZzZXQpXHJcbiAgICAgICAgOiAwO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogRm9yIG92ZXJyaWRpbmcgcG9zaXRpb24gZWxlbWVudCwgd2hlbiBtdHhQb3BvdmVyVGFyZ2V0QXQgaGFzIGEgdmFsaWQgZWxlbWVudCByZWZlcmVuY2UuXHJcbiAgICAgKiBVc2VmdWwgZm9yIHN0aWNraW5nIHBvcG92ZXIgdG8gcGFyZW50IGVsZW1lbnQgYW5kIG9mZnNldHRpbmcgYXJyb3cgdG8gdHJpZ2dlciBlbGVtZW50LlxyXG4gICAgICogSWYgdW5kZWZpbmVkIGRlZmF1bHRzIHRvIHRoZSB0cmlnZ2VyIGVsZW1lbnQgcmVmZXJlbmNlLlxyXG4gICAgICovXHJcbiAgICBsZXQgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnRSZWY7XHJcbiAgICBpZiAodHlwZW9mIHRoaXMudGFyZ2V0RWxlbWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgdGhpcy5wb3BvdmVyLmNvbnRhaW5lclBvc2l0aW9uaW5nID0gdHJ1ZTtcclxuICAgICAgZWxlbWVudCA9IHRoaXMudGFyZ2V0RWxlbWVudC5fZWxlbWVudFJlZjtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcy5fb3ZlcmxheVxyXG4gICAgICAucG9zaXRpb24oKVxyXG4gICAgICAuZmxleGlibGVDb25uZWN0ZWRUbyhlbGVtZW50KVxyXG4gICAgICAud2l0aExvY2tlZFBvc2l0aW9uKHRydWUpXHJcbiAgICAgIC53aXRoUG9zaXRpb25zKFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBvcmlnaW5YLFxyXG4gICAgICAgICAgb3JpZ2luWSxcclxuICAgICAgICAgIG92ZXJsYXlYLFxyXG4gICAgICAgICAgb3ZlcmxheVksXHJcbiAgICAgICAgICBvZmZzZXRZLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgb3JpZ2luWDogb3JpZ2luMm5kWCxcclxuICAgICAgICAgIG9yaWdpblksXHJcbiAgICAgICAgICBvdmVybGF5WDogb3JpZ2luMm5kWCxcclxuICAgICAgICAgIG92ZXJsYXlZLFxyXG4gICAgICAgICAgb2Zmc2V0WSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIG9yaWdpblgsXHJcbiAgICAgICAgICBvcmlnaW5ZOiBvcmlnaW5GYWxsYmFja1ksXHJcbiAgICAgICAgICBvdmVybGF5WCxcclxuICAgICAgICAgIG92ZXJsYXlZOiBvdmVybGF5RmFsbGJhY2tZLFxyXG4gICAgICAgICAgb2Zmc2V0WTogLW9mZnNldFksXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBvcmlnaW5YOiBvcmlnaW4ybmRYLFxyXG4gICAgICAgICAgb3JpZ2luWTogb3JpZ2luRmFsbGJhY2tZLFxyXG4gICAgICAgICAgb3ZlcmxheVg6IG9yaWdpbjJuZFgsXHJcbiAgICAgICAgICBvdmVybGF5WTogb3ZlcmxheUZhbGxiYWNrWSxcclxuICAgICAgICAgIG9mZnNldFk6IC1vZmZzZXRZLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgb3JpZ2luWDogb3JpZ2luM3JkWCxcclxuICAgICAgICAgIG9yaWdpblksXHJcbiAgICAgICAgICBvdmVybGF5WDogb3JpZ2luM3JkWCxcclxuICAgICAgICAgIG92ZXJsYXlZLFxyXG4gICAgICAgICAgb2Zmc2V0WSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIG9yaWdpblg6IG9yaWdpbjNyZFgsXHJcbiAgICAgICAgICBvcmlnaW5ZOiBvcmlnaW5GYWxsYmFja1ksXHJcbiAgICAgICAgICBvdmVybGF5WDogb3JpZ2luM3JkWCxcclxuICAgICAgICAgIG92ZXJsYXlZOiBvdmVybGF5RmFsbGJhY2tZLFxyXG4gICAgICAgICAgb2Zmc2V0WTogLW9mZnNldFksXHJcbiAgICAgICAgfSxcclxuICAgICAgXSlcclxuICAgICAgLndpdGhEZWZhdWx0T2Zmc2V0WChvZmZzZXRYKVxyXG4gICAgICAud2l0aERlZmF1bHRPZmZzZXRZKG9mZnNldFkpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBfY2xlYW5VcFN1YnNjcmlwdGlvbnMoKTogdm9pZCB7XHJcbiAgICBpZiAodGhpcy5fYmFja2Ryb3BTdWJzY3JpcHRpb24pIHtcclxuICAgICAgdGhpcy5fYmFja2Ryb3BTdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLl9wb3NpdGlvblN1YnNjcmlwdGlvbikge1xyXG4gICAgICB0aGlzLl9wb3NpdGlvblN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMuX2RldGFjaG1lbnRzU3Vic2NyaXB0aW9uKSB7XHJcbiAgICAgIHRoaXMuX2RldGFjaG1lbnRzU3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBASG9zdExpc3RlbmVyKCdtb3VzZWRvd24nLCBbJyRldmVudCddKSBfaGFuZGxlTW91c2Vkb3duKGV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCB7XHJcbiAgICBpZiAoZXZlbnQgJiYgIWlzRmFrZU1vdXNlZG93bkZyb21TY3JlZW5SZWFkZXIoZXZlbnQpKSB7XHJcbiAgICAgIHRoaXMuX29wZW5lZEJ5TW91c2UgPSB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iXX0=