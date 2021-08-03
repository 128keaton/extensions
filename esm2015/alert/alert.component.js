import { Component, ChangeDetectionStrategy, ViewEncapsulation, Input, Output, EventEmitter, ChangeDetectorRef, HostBinding, } from '@angular/core';
export class MtxAlertComponent {
    constructor(_changeDetectorRef) {
        this._changeDetectorRef = _changeDetectorRef;
        /** The alert type */
        this.type = 'default';
        /** Whether alert visible */
        this.isOpen = true;
        /** Material elevation */
        this.elevation = 0;
        /** This event fires when alert closed, $event is an instance of Alert component */
        this.closed = new EventEmitter();
    }
    get hostClassList() {
        return `mtx-alert-${this.type}`;
    }
    _onClosed() {
        this.isOpen = false;
        this._changeDetectorRef.markForCheck();
        this.closed.emit(this);
    }
}
MtxAlertComponent.decorators = [
    { type: Component, args: [{
                selector: 'mtx-alert',
                exportAs: 'mtxAlert',
                host: {
                    class: 'mtx-alert',
                },
                template: "<ng-template [ngIf]=\"isOpen\">\n  <div [ngClass]=\"['mtx-alert-ref',\n                   'mtx-alert-ref-' + type,\n                   'mat-elevation-z' + elevation,\n                    dismissible ? 'mtx-alert-dismissible' : '']\"\n       role=\"alert\">\n    <ng-content></ng-content>\n    <ng-template [ngIf]=\"dismissible\">\n      <button type=\"button\" class=\"mtx-alert-close\" aria-label=\"Close\" (click)=\"_onClosed()\">\n        <span aria-hidden=\"true\">&times;</span>\n      </button>\n    </ng-template>\n  </div>\n</ng-template>\n",
                encapsulation: ViewEncapsulation.None,
                changeDetection: ChangeDetectionStrategy.OnPush,
                styles: [".mtx-alert-ref{position:relative;padding:.75rem 1.25rem;margin-bottom:1rem;border:1px solid transparent;border-radius:.25rem}.mtx-alert-close{position:absolute;top:0;bottom:0;right:0;padding:0 1.25rem;font-size:1.5rem;line-height:1;color:inherit;opacity:.5;background-color:transparent;border:0;cursor:pointer}[dir=rtl] .mtx-alert-close{right:auto;left:0}.mtx-alert-close:hover{opacity:.75}.mtx-alert-dismissible{padding-right:4rem}"]
            },] }
];
/** @nocollapse */
MtxAlertComponent.ctorParameters = () => [
    { type: ChangeDetectorRef }
];
MtxAlertComponent.propDecorators = {
    hostClassList: [{ type: HostBinding, args: ['class',] }],
    type: [{ type: Input }],
    isOpen: [{ type: Input }],
    dismissible: [{ type: Input }],
    color: [{ type: Input }],
    elevation: [{ type: Input }],
    closed: [{ type: Output }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxlcnQuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvZXh0ZW5zaW9ucy9hbGVydC9hbGVydC5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNMLFNBQVMsRUFDVCx1QkFBdUIsRUFDdkIsaUJBQWlCLEVBQ2pCLEtBQUssRUFDTCxNQUFNLEVBQ04sWUFBWSxFQUNaLGlCQUFpQixFQUNqQixXQUFXLEdBQ1osTUFBTSxlQUFlLENBQUM7QUFldkIsTUFBTSxPQUFPLGlCQUFpQjtJQXVCNUIsWUFBb0Isa0JBQXFDO1FBQXJDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBbUI7UUFsQnpELHFCQUFxQjtRQUNaLFNBQUksR0FBaUIsU0FBUyxDQUFDO1FBRXhDLDRCQUE0QjtRQUNuQixXQUFNLEdBQUcsSUFBSSxDQUFDO1FBUXZCLHlCQUF5QjtRQUNoQixjQUFTLEdBQUcsQ0FBQyxDQUFDO1FBRXZCLG1GQUFtRjtRQUN6RSxXQUFNLEdBQUcsSUFBSSxZQUFZLEVBQXFCLENBQUM7SUFFRyxDQUFDO0lBdEI3RCxJQUEwQixhQUFhO1FBQ3JDLE9BQU8sYUFBYSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDbEMsQ0FBQztJQXNCRCxTQUFTO1FBQ1AsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pCLENBQUM7OztZQXhDRixTQUFTLFNBQUM7Z0JBQ1QsUUFBUSxFQUFFLFdBQVc7Z0JBQ3JCLFFBQVEsRUFBRSxVQUFVO2dCQUNwQixJQUFJLEVBQUU7b0JBQ0osS0FBSyxFQUFFLFdBQVc7aUJBQ25CO2dCQUNELGdqQkFBcUM7Z0JBRXJDLGFBQWEsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJO2dCQUNyQyxlQUFlLEVBQUUsdUJBQXVCLENBQUMsTUFBTTs7YUFDaEQ7Ozs7WUFoQkMsaUJBQWlCOzs7NEJBa0JoQixXQUFXLFNBQUMsT0FBTzttQkFLbkIsS0FBSztxQkFHTCxLQUFLOzBCQUdMLEtBQUs7b0JBR0wsS0FBSzt3QkFHTCxLQUFLO3FCQUdMLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBDb21wb25lbnQsXG4gIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICBWaWV3RW5jYXBzdWxhdGlvbixcbiAgSW5wdXQsXG4gIE91dHB1dCxcbiAgRXZlbnRFbWl0dGVyLFxuICBDaGFuZ2VEZXRlY3RvclJlZixcbiAgSG9zdEJpbmRpbmcsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5leHBvcnQgdHlwZSBNdHhBbGVydFR5cGUgPSAnZGVmYXVsdCcgfCAnaW5mbycgfCAnc3VjY2VzcycgfCAnd2FybmluZycgfCAnZGFuZ2VyJztcblxuQENvbXBvbmVudCh7XG4gIHNlbGVjdG9yOiAnbXR4LWFsZXJ0JyxcbiAgZXhwb3J0QXM6ICdtdHhBbGVydCcsXG4gIGhvc3Q6IHtcbiAgICBjbGFzczogJ210eC1hbGVydCcsXG4gIH0sXG4gIHRlbXBsYXRlVXJsOiAnLi9hbGVydC5jb21wb25lbnQuaHRtbCcsXG4gIHN0eWxlVXJsczogWycuL2FsZXJ0LmNvbXBvbmVudC5zY3NzJ10sXG4gIGVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmUsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxufSlcbmV4cG9ydCBjbGFzcyBNdHhBbGVydENvbXBvbmVudCB7XG4gIEBIb3N0QmluZGluZygnY2xhc3MnKSBnZXQgaG9zdENsYXNzTGlzdCgpIHtcbiAgICByZXR1cm4gYG10eC1hbGVydC0ke3RoaXMudHlwZX1gO1xuICB9XG5cbiAgLyoqIFRoZSBhbGVydCB0eXBlICovXG4gIEBJbnB1dCgpIHR5cGU6IE10eEFsZXJ0VHlwZSA9ICdkZWZhdWx0JztcblxuICAvKiogV2hldGhlciBhbGVydCB2aXNpYmxlICovXG4gIEBJbnB1dCgpIGlzT3BlbiA9IHRydWU7XG5cbiAgLyoqIFdoZXRoZXIgZGlzcGxheXMgYW4gaW5saW5lIFwiQ2xvc2VcIiBidXR0b24gKi9cbiAgQElucHV0KCkgZGlzbWlzc2libGUhOiBib29sZWFuO1xuXG4gIC8qKiBUaGUgYWxlcnQgdGV4dCBjb2xvciAqL1xuICBASW5wdXQoKSBjb2xvciE6IHN0cmluZztcblxuICAvKiogTWF0ZXJpYWwgZWxldmF0aW9uICovXG4gIEBJbnB1dCgpIGVsZXZhdGlvbiA9IDA7XG5cbiAgLyoqIFRoaXMgZXZlbnQgZmlyZXMgd2hlbiBhbGVydCBjbG9zZWQsICRldmVudCBpcyBhbiBpbnN0YW5jZSBvZiBBbGVydCBjb21wb25lbnQgKi9cbiAgQE91dHB1dCgpIGNsb3NlZCA9IG5ldyBFdmVudEVtaXR0ZXI8TXR4QWxlcnRDb21wb25lbnQ+KCk7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBfY2hhbmdlRGV0ZWN0b3JSZWY6IENoYW5nZURldGVjdG9yUmVmKSB7fVxuXG4gIF9vbkNsb3NlZCgpOiB2b2lkIHtcbiAgICB0aGlzLmlzT3BlbiA9IGZhbHNlO1xuICAgIHRoaXMuX2NoYW5nZURldGVjdG9yUmVmLm1hcmtGb3JDaGVjaygpO1xuICAgIHRoaXMuY2xvc2VkLmVtaXQodGhpcyk7XG4gIH1cbn1cbiJdfQ==